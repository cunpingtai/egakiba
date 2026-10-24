import {createOutsideFloor} from './app-outside-floor.js';
import {useSpinningCollider} from './app-collision.js';
import {scoutStats,scoutSpeedRatio,SCOUT_RARE} from './scout-variant.js';
import RAPIER from './vendor/rapier.js';
import { CONFIG, statGauges } from './config.js';
import { DRIVER_TIERS, driverMesh } from './driver.js';
import {updateRingBoundary} from './ring-boundary.js';
import {topWorldBounds} from './top-bounds.js';
import { getStage, stageHeight, stageSurfaceHeight, stageDistance, stageRadius, stageFloorRadius, stageRopeRadius, stageFullyOutside, stageRimStart, stageWallTop, boostBoardAt, boostBoardVelocity, boostBoardSpin, updateBoostContact, rotatingFloorContains, rotatingFloorVelocity, rotatingFloorSpin } from './stages.js';
let initializing;const appSurfaces=new Map();
export function initPhysics(){return initializing ||= RAPIER.init();}
export function makeArenaSurface(segments=96,rings=32,stage=getStage()) {
 if(stage.surfaceScale){const mesh=makeArenaSurface(segments,rings,stage.baseStage);for(let i=0;i<mesh.vertices.length;i+=3){mesh.vertices[i]*=stage.surfaceScale;mesh.vertices[i+2]*=stage.surfaceScale;}return mesh;}
 if(stage.shape==='square'){
  const edge=stageFloorRadius(stage),start=stageRimStart(stage)*edge,coordinates=[-edge,...Array.from({length:rings+1},(_,i)=>-start+2*start*i/rings),edge],vertices=[],indices=[],n=coordinates.length;
  for(const z of coordinates)for(const x of coordinates)vertices.push(x,stageSurfaceHeight(stage,x,z),z);
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+n;indices.push(a,b,a+1,a+1,b,b+1);}
  return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
 }
 const vertices=[0,stageHeight(stage,0),0],indices=[];
 // Duplicate the floor edge for the wall so its normals stay separate at the corner.
 const vertical=stage.wallProfile==='vertical',totalRings=rings+(vertical?2:0);
 // Sample the rounded wall densely; preserve the original standard mesh.
 const floorRings=Math.max(1,rings-Math.max(2,Math.round(rings/4)));
 for(let j=1;j<=totalRings;j++)for(let i=0;i<segments;i++){
  const a=i/segments*Math.PI*2,start=stageRimStart(stage);
  const fraction=vertical?Math.min(j/rings,1):stage.bowlDepth
   ? stage.rimHeight ? j<=floorRings ? j/floorRings*start : start+(j-floorRings)/(rings-floorRings)*(1-start) : j/rings
   : j===rings ? 1 : j/(rings-1)*start;
  const r=fraction*CONFIG.arenaRadius;vertices.push(Math.cos(a)*r,vertical&&j===totalRings?stageWallTop(stage):stageHeight(stage,r),Math.sin(a)*r);
 }
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let j=1;j<totalRings;j++){if(vertical&&j===rings)continue;for(let i=0;i<segments;i++){const a=1+(j-1)*segments+i,b=1+(j-1)*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}}
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
export function createStageCornerColliders(world,stage){
 if(!stage.ropes)return [];
 const edge=stageRopeRadius(stage),height=stage.ropes.levels.at(-1)+.14,colliders=[];
 for(const x of [-edge,edge])for(const z of [-edge,edge])colliders.push(world.createCollider(
  RAPIER.ColliderDesc.cylinder(height/2,.1).setTranslation(x,stageSurfaceHeight(stage,x,z)+height/2,z)
   .setCollisionGroups(0x00010003).setFriction(CONFIG.bodyFriction).setRestitution(stage.ropes.restitution).setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)));
 return colliders;
}
export function axialInertia(body) {
 const i=body.principalInertia(),q=body.principalInertiaLocalFrame();
 // Inverse principal-frame rotation maps the body's vertical axis to its eigenbasis.
 const x=2*(q.x*q.y+q.w*q.z),y=1-2*(q.x*q.x+q.z*q.z),z=2*(q.y*q.z-q.w*q.x);
 return i.x*x*x+i.y*y*y+i.z*z*z;
}
export function spinSpeedMultiplier(speedStat=.5){
 const speed=Math.max(0,Math.min(1,speedStat));
 return CONFIG.spinSpeedMin+(CONFIG.spinSpeedMax-CONFIG.spinSpeedMin)*speed;
}
export function launchValues(mass,inertia,power,speedStat=.5){
 const p=Math.max(0,Math.min(1,power));
 return {
  speed:Math.sqrt(2*CONFIG.linearEnergy*p/mass),
  omega:Math.sqrt(2*CONFIG.spinEnergy*p/inertia)*spinSpeedMultiplier(speedStat),
 };
}
export function topLaunchValues(top,power=1){
 const bonus=(top.glyph.rare?SCOUT_RARE.bonus:0)+(top.glyph.partyBonus||0);
 if(!bonus)return launchValues(top.body.mass(),top.inertia,power,top.speedStat);
 const base=statGauges(top.glyph.baseGlyph||top.glyph),values=launchValues(top.body.mass(),top.inertia,power,base.speed),ratio=scoutSpeedRatio(base.speed,bonus);
 return {speed:values.speed*ratio,omega:values.omega*ratio};
}
export function updateLoss(track,{radius,spin,tilt,grounded,boundaryRadius=CONFIG.arenaRadius,fallen},time,dt) {
 if(fallen===undefined?radius>boundaryRadius-CONFIG.ringOutInset:fallen)return '場外';
 // A flipped top loses as soon as its body touches the stadium, even during launch grace.
 if(grounded&&tilt>=Math.PI/2)return '転倒';
 track.stopped=time>CONFIG.gracePeriod&&spin<CONFIG.stopRate?track.stopped+dt:0;
 track.tipped=time>CONFIG.gracePeriod&&tilt>CONFIG.tipAngle&&grounded?track.tipped+dt:0;
 if(track.tipped>=CONFIG.tipDuration)return '転倒';
 if(track.stopped>=CONFIG.stopDuration)return '回転停止';
 return null;
}
// Arcade collision tuning: keep spin after top-to-top impacts, while Rapier still
// resolves linear momentum, contact position and tilt. Floor drag is unaffected.
export function retainImpactSpin(top,beforeSpin) {
 const axis=axisFromQuaternion(top.body.rotation()),w=top.body.angvel();
 const after=w.x*axis.x+w.y*axis.y+w.z*axis.z,minimum=Math.abs(beforeSpin)*CONFIG.impactSpinRetention;
 if(Math.abs(after)>=minimum)return;
 const restore=Math.sign(beforeSpin)*minimum-after;
 top.body.setAngvel({x:w.x+axis.x*restore,y:w.y+axis.y*restore,z:w.z+axis.z*restore},true);
}
// Keep the pair's bulk movement, but soften collision-driven separation and
// sideways kicks. Apply only after real contact; launch movement is unchanged.
export function applyPowerRebound(a,b,fresh=true){
 const va=a.body.linvel(),vb=b.body.linvel(),ma=a.body.mass(),mb=b.body.mass();
 const cx=(va.x*ma+vb.x*mb)/(ma+mb),cz=(va.z*ma+vb.z*mb)/(ma+mb);
 for(const [top,other,v] of [[a,b,va],[b,a,vb]]){
  const relativeSpeed=Math.hypot(v.x-cx,v.z-cz);
  const scale=CONFIG.impactReboundBase+CONFIG.impactPowerInfluence*(other.power-top.power);
  // Share one speed ceiling across a sustained, multi-part contact. Later
  // rotating strokes cannot repeatedly kick the opponent above that ceiling.
  if(fresh||top.reboundLimit===undefined)top.reboundLimit=Math.min(CONFIG.impactMaxReboundSpeed,Math.max(CONFIG.impactMinReboundSpeed,relativeSpeed))*scale;
  const factor=relativeSpeed>top.reboundLimit?top.reboundLimit/relativeSpeed:1;
  top.body.setLinvel({x:cx+(v.x-cx)*factor,y:Math.min(v.y,CONFIG.impactMaxLiftSpeed),z:cz+(v.z-cz)*factor},true);
 }
}
// The outer wall should contain the tops without launching them back across the
// whole stadium. Reduce only the inward radial component after a wall impact;
// tangential movement, vertical movement and spin stay untouched.
export function dampenWallRebound(top,retention=CONFIG.wallReboundRetention,stage=getStage()){
 const p=top.body.translation(),v=top.body.linvel(),radius=Math.hypot(p.x,p.z);
 if(radius<1e-6)return false;
 const square=stage.shape==='square',nx=square?(Math.abs(p.x)>=Math.abs(p.z)?Math.sign(p.x):0):p.x/radius,nz=square?(Math.abs(p.z)>Math.abs(p.x)?Math.sign(p.z):0):p.z/radius,radial=v.x*nx+v.z*nz;
 if(radial>=0)return false;
 const kept=radial*Math.max(0,Math.min(1,retention)),change=kept-radial;
 top.body.setLinvel({x:v.x+nx*change,y:v.y,z:v.z+nz*change},true);
 return true;
}
// Resolved floor contact remains valid even when a leaning glyph touches first.
// The fixed stadium is at the origin, so its local points are world points.
export function findBoostBoardContact(world,collider,floor,stage){
 let point=null;
 world.contactPair(collider,floor,(manifold,flipped)=>{
  if(point||Math.abs(manifold.normal().y)<.5)return;
  for(let i=0;i<manifold.numContacts();i++){
   if(manifold.contactDist(i)>.01)continue;
   const candidate=flipped?manifold.localContactPoint1(i):manifold.localContactPoint2(i);
   if(candidate&&boostBoardAt(stage,candidate)){point=candidate;break;}
  }
 });
 return point;
}
export function findRotatingFloorContact(world,top,floor,stage){
 if(!stage.rotatingFloor)return null;
 let point=null;
 for(const collider of top.colliders){
  world.contactPair(collider,floor,(manifold,flipped)=>{
   if(point||Math.abs(manifold.normal().y)<.5)return;
   for(let i=0;i<manifold.numContacts();i++){
    if(manifold.contactDist(i)>.005)continue;
    const candidate=flipped?manifold.localContactPoint1(i):manifold.localContactPoint2(i);
    if(candidate&&rotatingFloorContains(stage,candidate)){point=candidate;break;}
   }
  });
  if(point)break;
 }
 return point;
}
// Extend only upward from the board beneath the shaft's lowest point. This
// cheap check also runs without floor force events, before an airborne landing.
export function findBoostBoardHover(top,stage){
 if(!stage.boost?.hoverHeight)return null;
 const p=top.body.translation(),axis=axisFromQuaternion(top.body.rotation());
 const x=p.x-axis.x*CONFIG.tipLength,z=p.z-axis.z*CONFIG.tipLength,y=stageSurfaceHeight(stage,x,z);
 const clearance=p.y-axis.y*CONFIG.tipLength-CONFIG.tipRadius-y;
 return clearance>=-.01&&clearance<=stage.boost.hoverHeight+1e-6&&boostBoardAt(stage,{x,z})?{x,y,z}:null;
}
export function resolveResult(losses,time) {
 if(losses[0]&&losses[1])return {winner:null,reason:'同時決着',losses};
 if(losses[0]||losses[1])return {winner:losses[0]?1:0,reason:losses[0]||losses[1],losses};
 if(time>=CONFIG.timeLimit)return {winner:null,reason:'時間切れ',losses};
 return null;
}
export function outcomeForWinner(winner,localIndex=0){return winner===null?'draw':winner===localIndex?'win':'loss';}
export function launchAngleFromPull(x,z){return Math.atan2(x,-z);}
// Ranked inputs are recorded in each player's own camera coordinates. Keep one
// canonical A/B physics world by turning B's local input into A's world here.
export function canonicalRankedActions(actions){return actions.map((action,index)=>index?{...action,angle:-action.angle}:{...action});}
export function axisFromQuaternion(q){return {x:2*(q.x*q.y-q.w*q.z),y:1-2*(q.x*q.x+q.z*q.z),z:2*(q.y*q.z+q.w*q.x)};}
// Match a resolved glyph contact to a skeleton endpoint in the attacking
// glyph's own coordinates. This is evaluated only on impact, never per frame.
function tipSharpness(tip){return Math.max(0,Math.min(1,(CONFIG.criticalSharpCornerAngle-(tip.cornerAngle??CONFIG.criticalSharpCornerAngle))/(Math.PI/4)));}
function matchingTipPoints(top,point,radius){
 if(!top.glyph.criticalTipPoints?.length)return [];
 const p=top.body.translation(),q=top.body.rotation(),x=point.x-p.x,y=point.y-p.y,z=point.z-p.z;
 // Rotate by the inverse body quaternion; glyph y is -local z.
 const tx=2*(-q.y*z+q.z*y),ty=2*(-q.z*x+q.x*z),tz=2*(-q.x*y+q.y*x);
 const localX=x+q.w*tx-q.y*tz+q.z*ty;
 const localY=y+q.w*ty-q.z*tx+q.x*tz;
 const localZ=z+q.w*tz-q.x*ty+q.y*tx;
 if(Math.abs(localY)>CONFIG.thickness/2+.12)return [];
 return top.glyph.criticalTipPoints.filter(tip=>Math.hypot(tip.x-localX,tip.y+localZ)<=radius+CONFIG.criticalSharpTipRadiusBonus*tipSharpness(tip));
}
function axialImpactSpeed(top){
 const q=top.body.rotation();
 const axis=axisFromQuaternion(q),w=top.body.angvel();
 return Math.abs(top.beforeImpactSpin??(w.x*axis.x+w.y*axis.y+w.z*axis.z));
}
function contactSpinSpeed(top,point){
 const p=top.body.translation(),axis=axisFromQuaternion(top.body.rotation());
 const x=point.x-p.x,y=point.y-p.y,z=point.z-p.z,along=x*axis.x+y*axis.y+z*axis.z;
 return axialImpactSpeed(top)*Math.sqrt(Math.max(0,x*x+y*y+z*z-along*along));
}
export function tipContactSpeed(top,point,radius=CONFIG.criticalTipRadius){
 const tips=matchingTipPoints(top,point,radius);if(!tips.length)return 0;
 return contactSpinSpeed(top,point);
}
export function isTipContact(top,point,radius=CONFIG.criticalTipRadius){return matchingTipPoints(top,point,radius).length>0;}
export function isCriticalTipImpact(top,point){
 const speed=contactSpinSpeed(top,point);
 return matchingTipPoints(top,point,CONFIG.criticalTipRadius).some(tip=>speed>=CONFIG.criticalMinTipSpeed-CONFIG.criticalSharpTipSpeedBonus*tipSharpness(tip));
}
export function applyCriticalImpact(attacker,defender){
 const axis=axisFromQuaternion(defender.body.rotation()),w=defender.body.angvel();
 const spin=w.x*axis.x+w.y*axis.y+w.z*axis.z,drain=spin*CONFIG.criticalSpinDrain;
 const a=attacker.body.translation(),b=defender.body.translation(),distance=Math.hypot(b.x-a.x,b.z-a.z)||1;
 const nx=(b.x-a.x)/distance,nz=(b.z-a.z)/distance,v=defender.body.linvel();
 defender.body.setAngvel({x:w.x-axis.x*drain+nz*CONFIG.criticalTiltKick,y:w.y-axis.y*drain,z:w.z-axis.z*drain-nx*CONFIG.criticalTiltKick},true);
 defender.body.setLinvel({x:v.x+nx*CONFIG.criticalKnockback,y:v.y+CONFIG.criticalLift,z:v.z+nz*CONFIG.criticalKnockback},true);
 // The regular spin-retention floor must not undo the critical on the next step.
 if(defender.impactEntrySpin!==undefined)defender.impactEntrySpin*=1-CONFIG.criticalSpinDrain;
}
// Arcade assistance damps wobble toward a gentle return velocity. Preserve the
// spin along the shaft and all translation; neither pose nor position is snapped.
export function assistUpright(top,dt=CONFIG.step,stage=getStage()){
 const axis=axisFromQuaternion(top.body.rotation()),w=top.body.angvel(),p=top.body.translation();
 const spin=w.x*axis.x+w.y*axis.y+w.z*axis.z,tilt=Math.acos(Math.max(-1,Math.min(1,axis.y)));
 const tip={x:p.x-axis.x*CONFIG.tipLength,z:p.z-axis.z*CONFIG.tipLength},radius=stageDistance(stage,tip);
 if(Math.abs(spin)<=CONFIG.stopRate||tilt>=CONFIG.uprightMaxAngle||radius>stageFloorRadius(stage))return false;
 const tipHeight=p.y-axis.y*CONFIG.tipLength-CONFIG.tipRadius;
 if(tipHeight>stageSurfaceHeight(stage,tip.x,tip.z)+.14)return false;
 const spinFactor=Math.min(1,(Math.abs(spin)-CONFIG.stopRate)/(CONFIG.stopRate*2));
 const gyroProgress=Math.max(0,Math.min(1,(Math.abs(spin)-CONFIG.uprightGyroStart)/(CONFIG.uprightGyroFull-CONFIG.uprightGyroStart)));
 const gyroStrength=1+CONFIG.uprightGyroBoost*gyroProgress;
 const tiltFactor=Math.min(1,(CONFIG.uprightMaxAngle-tilt)/(CONFIG.uprightMaxAngle-CONFIG.uprightFadeAngle));
 const stability=1+((top.glyph?.rare?SCOUT_RARE.bonus:0)+(top.glyph?.partyBonus||0))*1.25;
 const blend=1-Math.exp(-CONFIG.uprightDamping*stability*gyroStrength*spinFactor*tiltFactor*dt);
 const target={x:-axis.z*CONFIG.uprightReturnRate*stability,y:0,z:axis.x*CONFIG.uprightReturnRate*stability};
 top.body.setAngvel({
  x:w.x+(target.x-(w.x-axis.x*spin))*blend,
  y:w.y+(target.y-(w.y-axis.y*spin))*blend,
  z:w.z+(target.z-(w.z-axis.z*spin))*blend,
 },true);
 return true;
}
// Rapier may reject a numerically collapsed convex hull with null. Passing
// that null through Compound.intoRaw throws an opaque wasm-bindgen array error.
// Validate each hull before composing it; keep every accepted hull unchanged.
export function glyphCompoundShape(parts) {
 const shapes=[];
 for(const polygon of parts){
  const points=[];for(const y of [-CONFIG.thickness/2,CONFIG.thickness/2])for(const p of polygon)points.push(p.x,y,-p.y);
  const vertices=new Float32Array(points);
  if(!vertices.every(Number.isFinite))throw Error('この文字の形状を作れませんでした。');
  const shape=new RAPIER.ConvexPolyhedron(vertices,null),raw=shape.intoRaw();
  if(raw){raw.free();shapes.push(shape);}
 }
 if(!shapes.length)throw Error('この文字の形状を作れませんでした。');
 return new RAPIER.Compound(shapes,shapes.map(()=>({x:0,y:0,z:0})),shapes.map(()=>({x:0,y:0,z:0,w:1})));
}
export class Battle {
 constructor(glyphs,comLaunch={angle:.3,power:.82},{stageId='standard',stage=null,spawns=null,teamBattle=false}={}) {
  this.stage=stage||getStage(stageId);this.spawns=spawns;this.teamBattle=teamBattle;this.boostImpacts=new Map();
  this.world=new RAPIER.World({x:0,y:-9.81,z:0});try{this.world.timestep=CONFIG.step;this.world.integrationParameters.numSolverIterations=8;this.world.integrationParameters.maxCcdSubsteps=4;
  this.impactScratch=[new Set(),new Set(),new Set()];this.queue=new RAPIER.EventQueue(true);this.time=0;this.accumulator=0;this.running=false;this.result=null;this.events=[];this.boostEvents=[];this.ropeEvents=[];this.ropeUpdates=new Map();this.comLaunch=comLaunch;this.owners=new Map();this.lastHit=-1;this.debris=new Set();
  let surface=appSurfaces.get(this.stage.id);if(!surface){surface=makeArenaSurface(96,32,this.stage);appSurfaces.set(this.stage.id,surface);}this.floor=this.world.createCollider(RAPIER.ColliderDesc.trimesh(surface.vertices,surface.indices).setCollisionGroups(0x00010003).setFriction(CONFIG.floorFriction).setRestitution(CONFIG.floorRestitution));
  this.cornerColliders=createStageCornerColliders(this.world,this.stage);this.cornerHandles=new Set(this.cornerColliders.map(c=>c.handle));
  this.tops=glyphs.map((g,i)=>this.createTop(g,i));
  }catch(error){this.queue?.free();this.world.free();throw error;}
 }
 createTop(glyph,index) {
  const baseGlyph=glyph.baseGlyph||glyph;
  const spawn=this.spawns?.[index],x=spawn?.x||0,z=spawn?.z??(index===0?1:-1)*CONFIG.spawnRadius;
  const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,stageSurfaceHeight(this.stage,x,z)+CONFIG.tipLength+CONFIG.tipRadius+.012,z).setCanSleep(false).setCcdEnabled(true));
 const colliders=[];
  const add=desc=>{const c=this.world.createCollider(desc.setCollisionGroups(0x00010001).setFriction(CONFIG.bodyFriction).setRestitution(CONFIG.restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(.1),body);colliders.push(c);this.owners.set(c.handle,index);};
  // Keep the exact convex decomposition inside one compound collider. Complex
  // glyphs such as 鬱 otherwise register close to 100 independent colliders
  // during every physics step even though the top is one rigid object.
  add(new RAPIER.ColliderDesc(glyphCompoundShape(baseGlyph.parts)).setDensity(CONFIG.density));
  const glyphColliders=[...colliders];
  for(const tier of DRIVER_TIERS)add(RAPIER.ColliderDesc.convexHull(driverMesh(tier).vertices).setDensity(tier.density??CONFIG.tipDensity));
  add(RAPIER.ColliderDesc.ball(CONFIG.tipRadius).setTranslation(0,-CONFIG.tipLength,0).setDensity(CONFIG.tipDensity));
  body.recomputeMassPropertiesFromColliders();useSpinningCollider(body,colliders,glyph.baseGlyph||glyph);
  if(glyph.rare){
   const mass=body.mass(),center=body.localCom(),inertia=body.principalInertia(),frame=body.principalInertiaLocalFrame();
   const descriptor=new RAPIER.ColliderDesc(glyphCompoundShape(glyph.parts));
   glyphColliders[0].setShape(descriptor.shape);for(const collider of colliders)collider.setDensity(0);
   body.setAdditionalMassProperties(mass,center,inertia,frame,false);body.recomputeMassPropertiesFromColliders();
  }
  const stats=glyph.rare||glyph.partyBonus?scoutStats(glyph):statGauges(glyph);
  const top={glyph,body,power:stats.power,speedStat:stats.speed,inertia:axialInertia(body),colliders,glyphColliders,index,stopped:0,tipped:0,initialOmega:0,previous:null,current:null};
  top.boostArmed=true;top.boostSeparatedAt=null;
  top.current=this.readPose(top);top.previous=this.readPose(top);return top;
 }
 faceOpponent() {
  const top=this.tops[1];if(!top)return;
  top.body.setRotation({x:0,y:1,z:0,w:0},true);
  this.world.propagateModifiedBodyPositionsToColliders();
  top.current=this.readPose(top);top.previous=this.readPose(top);
 }
 launch(angle,power,spinDirection=1) {
  return this.launchPair([{angle,power,spinDirection},this.comLaunch]);
 }
 launchPair(actions) {
  if(this.running||this.result)return false;
  if(!Array.isArray(actions)||actions.length!==(this.teamBattle?this.tops.length:2))return false;
  if(this.stage.rotatingFloor)this.rotationStartedAt=this.previewRotationTime||0;
  for(const top of this.tops){const isPlayer=top.index===0,{angle:a,power:p,spinDirection=1}=actions[top.index];
   const values=topLaunchValues(top,p);top.initialOmega=values.omega;
   top.body.setLinvel({x:Math.sin(a)*values.speed,y:0,z:(isPlayer?-1:1)*Math.cos(a)*values.speed},true);
   // Positive Y is counterclockwise from above, for both A and B.
   top.body.setAngvel({x:0,y:values.omega*(spinDirection===-1?-1:1),z:0},true);
  }
  this.running=true;return true;
 }
 ensureOutsideFloor(){
 if(this.outsideFloor||!this.stage.ringOutOnFall)return;
 if(this.tops.some(top=>stageFullyOutside(this.stage,topWorldBounds(top))))this.outsideFloor=createOutsideFloor(this.world,RAPIER);
}
 stateHash(){
  const values=[this.time,this.result?.winner??-1,...this.tops.flatMap(top=>{const p=top.body.translation(),q=top.body.rotation(),v=top.body.linvel(),w=top.body.angvel();return [p.x,p.y,p.z,q.x,q.y,q.z,q.w,v.x,v.y,v.z,w.x,w.y,w.z];})];
  let hash=2166136261;for(const value of values){const text=Number(value).toFixed(5);for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);}return (hash>>>0).toString(16).padStart(8,'0');
 }
 readPose(top,target){const position=top.body.translation(),rotation=top.body.rotation();if(!target)return {position:{...position},rotation:{...rotation}};Object.assign(target.position,position);Object.assign(target.rotation,rotation);return target;}
 state(top){const p=top.body.translation(),q=top.body.rotation(),axis=axisFromQuaternion(q),w=top.body.angvel();const tilt=Math.acos(Math.max(-1,Math.min(1,axis.y)));
  let grounded=false;if(tilt>CONFIG.tipAngle)for(const collider of top.colliders){const contact=collider.contactCollider(this.floor,.005);if(contact&&contact.distance<.005){grounded=true;break;}}
  // The shaft line crosses the glyph's planar center of mass at the body origin.
  const shaft={x:p.x-axis.x*CONFIG.tipLength,z:p.z-axis.z*CONFIG.tipLength};
  const bounds=this.stage.ringOutOnFall?topWorldBounds(top):null;
  return {radius:stageDistance(this.stage,shaft),boundaryRadius:stageFloorRadius(this.stage),spin:Math.abs(w.x*axis.x+w.y*axis.y+w.z*axis.z),tilt,grounded,fallen:bounds?(bounds.maxY<-.28||(stageFullyOutside(this.stage,bounds)&&bounds.minY<=-.43)):undefined};
 }
 applyResistance(){
  for(const top of this.tops){if(!top.body.isEnabled())continue;const w=top.body.angvel(),speed=Math.hypot(w.x,w.y,w.z);
   const axis=axisFromQuaternion(top.body.rotation());top.beforeImpactSpin=w.x*axis.x+w.y*axis.y+w.z*axis.z;
   top.body.resetTorques(true);
   if(speed>1e-6){const resistance=Math.min(CONFIG.dragTorque+CONFIG.airDrag*speed,top.inertia*speed/CONFIG.step*.5);top.body.addTorque({x:-w.x/speed*resistance,y:-w.y/speed*resistance,z:-w.z/speed*resistance},true);}
  }
 }
 step() {
  if(!this.running)return;
  for(const top of this.tops){top.sparePose=top.previous;top.previous=top.current;}
  if(this.stage.boost){this.boostImpacts.clear();for(const top of this.tops){const v=top.body.linvel();top.boostEntrySpeed=Math.hypot(v.x,v.z);}}
  this.applyResistance();
  this.ensureOutsideFloor?.();
  this.world.step(this.queue);this.time+=CONFIG.step/CONFIG.simulationRate;
  this.queue.drainCollisionEvents(()=>{});
  // Only a resolved contact force counts as an impact, not a speculative CCD pair.
  const [impacted,wallImpacted,criticalAttackers]=this.impactScratch;impacted.clear();wallImpacted.clear();criticalAttackers.clear();const pairs=this.teamBattle?new Map():null,criticalTargets=this.teamBattle?new Map():null;let impactEvent=null,criticalEvent=null;
  this.queue.drainContactForceEvents(event=>{
   const a=event.collider1(),b=event.collider2();
   const ownerA=this.owners.get(a),ownerB=this.owners.get(b);
   const arenaA=a===this.floor.handle||this.cornerHandles.has(a),arenaB=b===this.floor.handle||this.cornerHandles.has(b);
   if(arenaA!==arenaB){
    const owner=arenaA?ownerB:ownerA;
    if(owner!==undefined){
     const contact=this.world.getCollider(a).contactCollider(this.world.getCollider(b),.08);
     if(contact&&(this.cornerHandles.has(a)||this.cornerHandles.has(b)||(!this.stage.ropes&&(!this.stage.bowlDepth||this.stage.rimHeight)&&Math.max(stageDistance(this.stage,contact.point1),stageDistance(this.stage,contact.point2))>=stageRimStart(this.stage)*stageRadius(this.stage)-.03))){
      wallImpacted.add(owner);
     }
     if(this.stage.boost&&this.tops[owner].boostArmed&&!this.boostImpacts.has(owner)){
      const point=findBoostBoardContact(this.world,this.world.getCollider(a===this.floor.handle?b:a),this.floor,this.stage);
      if(point)this.boostImpacts.set(owner,point);
     }
    }
    return;
   }
   if(ownerA===undefined || ownerB===undefined || ownerA===ownerB)return;
   impacted.add(ownerA);impacted.add(ownerB);pairs?.set([ownerA,ownerB].sort().join(':'),[ownerA,ownerB]);
   const force=event.totalForceMagnitude(),fresh=this.tops.some(t=>t.lastImpactTime===undefined||this.time-t.lastImpactTime>.12);
   if(!fresh&&this.time-this.lastHit<.12)return;
   const contact=this.world.getCollider(a).contactCollider(this.world.getCollider(b),.2);
   if(!contact)return;
   const previousCriticalCount=criticalAttackers.size;
   if(fresh&&force>=CONFIG.criticalMinForce){
    if(this.tops[ownerA].glyphColliders[0].handle===a&&isCriticalTipImpact(this.tops[ownerA],contact.point1))criticalAttackers.add(ownerA);
    if(this.tops[ownerB].glyphColliders[0].handle===b&&isCriticalTipImpact(this.tops[ownerB],contact.point2))criticalAttackers.add(ownerB);
   }
   if(criticalAttackers.has(ownerA))criticalTargets?.set(ownerA,ownerB);if(criticalAttackers.has(ownerB))criticalTargets?.set(ownerB,ownerA);
   if(criticalAttackers.size>previousCriticalCount&&!criticalEvent)criticalEvent={position:{...contact.point1},strength:Math.min(1,force/250),force};
   if(this.time-this.lastHit>=.12&&!impactEvent)impactEvent={position:{...contact.point1},strength:Math.min(1,force/250),force};
  });

  for(const index of wallImpacted){const top=this.tops.find(t=>t.index===index);if(!top)continue;
   if(!this.stage.ropes&&!this.boostImpacts.has(index)&&(top.lastWallImpactTime===undefined||this.time-top.lastWallImpactTime>CONFIG.wallImpactCooldown)){dampenWallRebound(top,CONFIG.wallReboundRetention,this.stage);top.lastWallImpactTime=this.time;}
  }

  if(!this.teamBattle&&impacted.size===2){
   // Establish one rebound ceiling per impact, and retain it across part contacts.
   const fresh=this.tops.some(t=>t.lastImpactTime===undefined||this.time-t.lastImpactTime>.12);
   applyPowerRebound(this.tops[0],this.tops[1],fresh);
  }
  if(this.teamBattle)for(const [a,b] of pairs.values())applyPowerRebound(this.tops[a],this.tops[b],true);
  for(const index of impacted){const top=this.tops.find(t=>t.index===index);if(!top)continue;
   // Multiple convex-part contacts during one impact share a single retained speed.
   // Otherwise a per-step retention floor applied repeatedly would still erase spin in a few steps.
   if(top.lastImpactTime===undefined||this.time-top.lastImpactTime>.12)top.impactEntrySpin=top.beforeImpactSpin;
   top.lastImpactTime=this.time;retainImpactSpin(top,top.impactEntrySpin);
  }
  for(const index of criticalAttackers)applyCriticalImpact(this.tops[index],this.tops[this.teamBattle?criticalTargets.get(index):1-index]);
  if(this.stage.rotatingFloor)for(const top of this.tops){
   if(!top.body.isEnabled())continue;
   const point=findRotatingFloorContact(this.world,top,this.floor,this.stage);
   if(point){
    const dt=CONFIG.step/CONFIG.simulationRate;
    top.body.setLinvel(rotatingFloorVelocity(this.stage,point,top.body.linvel(),dt,(this.rotationStartedAt||0)+this.time),true);
    const maximum=topLaunchValues(top,1);
    const spin=rotatingFloorSpin(this.stage,axisFromQuaternion(top.body.rotation()),top.body.angvel(),maximum.omega,dt);if(spin)top.body.setAngvel(spin,true);
   }
  }
  if(this.stage.boost){
   for(const top of this.tops)if(top.boostArmed&&top.body.isEnabled()&&!this.boostImpacts.has(top.index)){
    const point=findBoostBoardHover(top,this.stage);if(point)this.boostImpacts.set(top.index,point);
   }
   // Apply after impacts; boost translation and a small fixed shaft-spin
   // increment once per contact, retaining wobble and the chosen spin direction.
   for(const [index,point] of this.boostImpacts){
    const top=this.tops[index],maximum=topLaunchValues(top,1);
    const velocity=boostBoardVelocity(this.stage,point,top.body.linvel(),top.boostEntrySpeed,maximum.speed);
    if(velocity){
     top.body.setLinvel(velocity,true);
     const spin=boostBoardSpin(this.stage,axisFromQuaternion(top.body.rotation()),top.body.angvel(),maximum.omega);if(spin)top.body.setAngvel(spin,true);
     top.boostArmed=false;top.boostSeparatedAt=null;top.lastWallImpactTime=this.time;top.boostCount=(top.boostCount||0)+1;
     this.boostEvents.push({index,position:{...top.body.translation()}});
    }
   }
   // Contact-force events can disappear even while a body remains touching.
   // Rearm after every collider has left the boards, not merely event gaps.
   for(const top of this.tops)if(!top.boostArmed){
    const touching=!!findBoostBoardHover(top,this.stage)||top.colliders.some(collider=>findBoostBoardContact(this.world,collider,this.floor,this.stage));
    updateBoostContact(top,touching,this.time,this.stage.boost.rearmSeconds);
   }
  }
  this.updateRingBoundaries(impacted);
  if(criticalEvent)impactEvent=criticalEvent;
  if(impactEvent){impactEvent.critical=criticalAttackers.size>0;impactEvent.criticalAttackers=[...criticalAttackers].sort();this.events.push(impactEvent);this.lastHit=this.time;}
  for(const top of this.tops)assistUpright(top,CONFIG.step,this.stage);
  const losses=this.tops.map(top=>{top.current=this.readPose(top,top.sparePose);return top.loss||updateLoss(top,this.state(top),this.time,CONFIG.step/CONFIG.simulationRate);});
  this.result=this.resolveLosses(losses);if(this.result)this.running=false;
 }
 resolveLosses(losses){return resolveResult(losses,this.time);}
 updateRingBoundaries(impacted,time=this.time){
  if(!this.stage.ropes)return;
  for(const top of this.tops){
   if(!top.body.isEnabled())continue;
   if(impacted?.has(top.index)){if(top.ringTurn)this.ropeUpdates.set(top.index,{index:top.index,phase:'release',side:top.ringTurn.sides[0],otherSide:top.ringTurn.sides[1],position:top.ringTurn.position,width:top.ringTurn.width,amount:0,speed:0});top.ringTurn=null;continue;}
   const event=updateRingBoundary(top,this.stage,time);
   if(event){const update={index:top.index,...event};if(event.phase==='impact')this.ropeEvents.push(update);else this.ropeUpdates.set(top.index,update);}
  }
 }
 advance(dt){if(!this.running)return 0;this.accumulator+=Math.max(0,Math.min(dt,CONFIG.maxFrame))*CONFIG.simulationRate;while(this.accumulator+1e-10>=CONFIG.step && this.running){this.step();this.accumulator=Math.max(0,this.accumulator-CONFIG.step);}return this.accumulator/CONFIG.step;}
 advanceAftermath(dt){
  if(!this.result)return;
  if(!this.aftermathStarted){
   this.aftermathStarted=true;this.aftermathAccumulator=0;this.aftermathTime=0;this.outsideFloor ||= createOutsideFloor(this.world,RAPIER);
   for(const top of this.tops)if(['回転停止','転倒'].includes(this.result.losses?.[top.index])){
    for(const collider of top.colliders)collider.setEnabled(false);
    top.body.setAngvel({x:0,y:0,z:0},true);top.body.resetTorques(true);top.body.setEnabled(false);
   }
  }
  const elapsed=Math.max(0,Math.min(dt,CONFIG.maxFrame));
  this.aftermathTime+=elapsed;this.aftermathAccumulator+=elapsed*CONFIG.simulationRate;
  while(this.aftermathAccumulator>=CONFIG.step){
   for(const top of this.tops){top.sparePose=top.previous;top.previous=top.current;}
   this.applyResistance();
   this.world.step(this.queue);this.queue.drainCollisionEvents(()=>{});this.queue.drainContactForceEvents(()=>{});
   this.updateRingBoundaries(null,this.time+this.aftermathTime-(this.aftermathAccumulator-CONFIG.step)/CONFIG.simulationRate);
   for(const top of this.tops){if(top.body.isEnabled())assistUpright(top,CONFIG.step,this.stage);top.current=this.readPose(top,top.sparePose);}
   this.aftermathAccumulator-=CONFIG.step;
  }
  if(this.debris.size){
   this.debrisAccumulator+=elapsed*CONFIG.simulationRate;
   while(this.debrisAccumulator>=CONFIG.debrisStep){this.debrisWorld.step();this.debrisAccumulator-=CONFIG.debrisStep;}
  }
 }
 addDebris({position,rotation,velocity,spin,shapes}){
  if(!this.debrisWorld){
   this.debrisWorld=new RAPIER.World({x:0,y:-9.81,z:0});this.debrisWorld.timestep=CONFIG.debrisStep;this.debrisWorld.integrationParameters.numSolverIterations=4;this.debrisAccumulator=0;
   let surface=appSurfaces.get(this.stage.id);if(!surface){surface=makeArenaSurface(96,32,this.stage);appSurfaces.set(this.stage.id,surface);}this.debrisWorld.createCollider(RAPIER.ColliderDesc.trimesh(surface.vertices,surface.indices).setCollisionGroups(0x00010002).setFriction(CONFIG.floorFriction).setRestitution(CONFIG.floorRestitution));createStageCornerColliders(this.debrisWorld,this.stage);
   this.debrisGround=this.debrisWorld.createCollider(RAPIER.ColliderDesc.cuboid(50,.05,50).setTranslation(0,-.5,0).setCollisionGroups(0x00010002).setFriction(.55).setRestitution(.1));
  }
  const body=createDebrisBody(this.debrisWorld,{position,rotation,velocity,spin,shapes});
  this.debris.add(body);return body;
 }
 removeDebris(body){if(this.debris.delete(body))this.debrisWorld.removeRigidBody(body);}
 dispose(){this.debris.clear();this.debrisWorld?.free();this.queue.free();this.world.free();}
}

// Lazily measure one preview top with the same collider mass/inertia and launch
// curve as gameplay, without creating an arena, simulation loop or debris world.
export async function measureTopLaunch(glyph){
 await initPhysics();const world=new RAPIER.World({x:0,y:0,z:0});
 try{
  const top=Battle.prototype.createTop.call({world,stage:getStage(),owners:new Map(),readPose:Battle.prototype.readPose},glyph,0);
  return topLaunchValues(top,1);
 }finally{world.free();}
}

// Shared fragment mass, damping and collision settings for match and preview.
export function createDebrisBody(world,{position,rotation,velocity,spin,shapes}){
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setRotation(rotation).setLinvel(velocity.x,velocity.y,velocity.z).setAngvel(spin).setCcdEnabled(Math.hypot(velocity.x,velocity.y,velocity.z)>8).setLinearDamping(.12).setAngularDamping(.25));
  for(const points of shapes){const desc=RAPIER.ColliderDesc.convexHull(new Float32Array(points));if(desc)world.createCollider(desc.setCollisionGroups(0x00020001).setDensity(CONFIG.density).setFriction(.55).setRestitution(.12),body);}
 return body;
}
export async function createPreviewDebrisWorld(floorY){
 await initPhysics();const world=new RAPIER.World({x:0,y:-9.81,z:0}),bodies=new Set();let accumulator=0,disposed=false;
 world.timestep=CONFIG.debrisStep;world.integrationParameters.numSolverIterations=4;
 world.createCollider(RAPIER.ColliderDesc.cuboid(50,.05,50).setTranslation(0,floorY-.05,0).setCollisionGroups(0x00010002).setFriction(.55).setRestitution(.1));
 return {
  add(values){const body=createDebrisBody(world,values);bodies.add(body);return body;},
  advance(dt){if(disposed||!bodies.size)return;accumulator+=Math.max(0,Math.min(dt,CONFIG.maxFrame))*CONFIG.simulationRate;while(accumulator>=CONFIG.debrisStep){world.step();accumulator-=CONFIG.debrisStep;}},
  remove(body){if(!disposed&&bodies.delete(body))world.removeRigidBody(body);},
  dispose(){if(disposed)return;disposed=true;bodies.clear();world.free();}
 };
}
