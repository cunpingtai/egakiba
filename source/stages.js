import {CONFIG,bowlHeight} from './config.js';
// World coordinates: x points right, +z points toward the camera. Thus
// (z, -x) is counterclockwise when the stadium is viewed from above.
export const DEFAULT_STAGE_ID='standard';
export const STAGES=Object.freeze([
 Object.freeze({id:DEFAULT_STAGE_ID,name:'標準',description:'いつものボードで対戦',pads:Object.freeze([])}),
 Object.freeze({id:'boost-bowl',ringOutOnFall:true,name:'加速ボード',description:'中心へ向かう加速板',bowlDepth:.85,rimHeight:1.2,wallProfile:'vertical',rimStart:.82,pads:Object.freeze([
  Object.freeze({angle:Math.PI/4,headingOffset:Math.PI/9,halfAngle:Math.PI/36,innerRadius:3.1,outerRadius:4.8,width:.85,forwardExtension:.3}),
  Object.freeze({angle:Math.PI*.75,headingOffset:Math.PI/9,halfAngle:Math.PI/36,innerRadius:3.1,outerRadius:4.8,width:.85,forwardExtension:.3}),
  Object.freeze({angle:Math.PI*1.25,headingOffset:Math.PI/9,halfAngle:Math.PI/36,innerRadius:3.1,outerRadius:4.8,width:.85,forwardExtension:.3}),
  Object.freeze({angle:Math.PI*1.75,headingOffset:Math.PI/9,halfAngle:Math.PI/36,innerRadius:3.1,outerRadius:4.8,width:.85,forwardExtension:.3}),
 ]),boost:Object.freeze({multiplier:1.8,minLaunchRatio:1,maxLaunchRatio:1.8,hoverHeight:.3,spinLaunchRatio:.1,maxSpinLaunchRatio:1,rearmSeconds:.15,flowCyclesPerSecond:.25})}),
 Object.freeze({id:'square',ringOutOnFall:true,shape:'square',radius:5.6,bowlDepth:.4,floorMargin:.65,name:'リング',description:'ロープで跳ね返るリング',ropes:Object.freeze({inset:.3,radius:.055,levels:Object.freeze([.35,.7,1.05]),restitution:.98,speedRetention:1.5,turnSeconds:.14,maxPenetration:.5}),pads:Object.freeze([])}),
 Object.freeze({id:'rotating-floor',name:'回転床',description:'向きが変わる回転床',pads:Object.freeze([]),rotatingFloor:Object.freeze({radius:CONFIG.arenaRadius*.42,angularSpeed:Math.PI*1.44,cycleSeconds:16,color:0x70b526,depression:.16,bowlDepth:1,responseSeconds:.27,maxAcceleration:24,spinLaunchRatio:.04,maxSpinLaunchRatio:1.1})}),
]);
export function getStage(id){return STAGES.find(stage=>stage.id===(id==='boost-wall'?'boost-bowl':id))||STAGES[0];}
export function stageForMode(id,mode){return ['standard','local','challenge'].includes(mode)?getStage(id):STAGES[0];}
export function stageRadius(stage){return stage.radius??CONFIG.arenaRadius;}
export function stageFloorRadius(stage){return stageRadius(stage)+(stage.floorMargin||0);}
export function stageRopeRadius(stage){return stageRadius(stage)-(stage.ropes?.inset||0);}
export function stageRimStart(stage){return stage.wallProfile==='vertical'?1:stage.rimStart??(stage.shape==='square'?1-CONFIG.rimHeight/Math.tan(CONFIG.rimAngle)/stageRadius(stage):CONFIG.rimStart);}
export function stageDistance(stage,point){return stage.shape==='square'?Math.max(Math.abs(point.x),Math.abs(point.z)):Math.hypot(point.x,point.z);}
export function stageFullyOutside(stage,bounds){
 const radius=stageFloorRadius(stage);
 if(stage.shape==='square')return bounds.minX>radius||bounds.maxX< -radius||bounds.minZ>radius||bounds.maxZ< -radius;
 const x=Math.max(bounds.minX,Math.min(0,bounds.maxX)),z=Math.max(bounds.minZ,Math.min(0,bounds.maxZ));
 return Math.hypot(x,z)>radius;
}
export function stageRopeSegments(stage){
 if(!stage.ropes)return [];
 const edge=stageRopeRadius(stage),base=stageSurfaceHeight(stage,edge,edge),segments=[];
 for(let side=0;side<4;side++)for(const [level,height] of stage.ropes.levels.entries()){
  const a=side*Math.PI/2,c=Math.cos(a),s=Math.sin(a),y=base+height;
  segments.push({side,level,radius:stage.ropes.radius,start:{x:edge*c+edge*s,y,z:edge*s-edge*c},end:{x:edge*c-edge*s,y,z:edge*s+edge*c}});
 }
 return segments;
}

export function stageRopePoint(stage,segment,u){
 const x=segment.start.x+(segment.end.x-segment.start.x)*u,z=segment.start.z+(segment.end.z-segment.start.z)*u;
 return {x,y:stageSurfaceHeight(stage,x,z)+stage.ropes.levels[segment.level],z};
}
export function stageRopePoints(stage,segment,count=24){return Array.from({length:count+1},(_,i)=>stageRopePoint(stage,segment,i/count));}
export function stageSurfaceHeight(stage,x,z){
 if(stage.shape!=='square')return stageHeight(stage,Math.hypot(x,z));
 const radius=stageRadius(stage),start=stageRimStart(stage),r=stageDistance(stage,{x,z})/radius,wall=Math.max(0,(Math.min(r,1)-start)/(1-start));
 return stage.bowlDepth*(x*x+z*z)/radius**2+(stage.ropes?0:CONFIG.rimHeight*wall);
}
export function stageHeight(stage,radius){
 if(stage.surfaceScale)return stageHeight(stage.baseStage,radius/stage.surfaceScale);
 if(stage.shape==='square')return stageSurfaceHeight(stage,radius,0);
 if(!stage.bowlDepth){
  const floor=stage.rotatingFloor,u=floor?Math.min(Math.abs(radius)/floor.radius,1):1;
  // Local depression joins the surrounding bowl with zero extra slope/curvature.
  return bowlHeight(radius)+(floor?floor.bowlDepth-CONFIG.bowlDepth:0)*Math.min(Math.abs(radius)/CONFIG.arenaRadius,1)**2-(floor?.depression||0)*(1-u*u)**3;
 }
 const r=Math.min(Math.abs(radius)/CONFIG.arenaRadius,1);
 if(stage.wallProfile==='vertical')return stage.bowlDepth*r*r;
 const wall=Math.max(0,(r-stageRimStart(stage))/(1-stageRimStart(stage)));
 // A cubic rise joins the floor with continuous slope and curvature,
 // while retaining a steep outer sidewall rather than a flat lip.
 return stage.bowlDepth*r*r+(stage.rimHeight||0)*wall**3;
}
export function stageWallTop(stage){return stageHeight(stage,stageRadius(stage))+(stage.wallProfile==='vertical'?stage.rimHeight:0);}
// Straight, constant-width boards run inward with a small counterclockwise
// component. Visual geometry, contact bounds and acceleration use this frame.
function boardFrame(pad){
 const a=pad.angle+pad.halfAngle,b=pad.angle-pad.halfAngle;
 const outer={x:pad.outerRadius*Math.cos(a),z:pad.outerRadius*Math.sin(a)},inner={x:pad.innerRadius*Math.cos(b),z:pad.innerRadius*Math.sin(b)};
 const x=inner.x-outer.x,z=inner.z-outer.z,c=Math.cos(pad.headingOffset||0),s=Math.sin(pad.headingOffset||0);
 const dx=x*c-z*s,dz=x*s+z*c,length=Math.hypot(dx,dz),start={x:(outer.x+inner.x-dx)/2,z:(outer.z+inner.z-dz)/2};
 // Extend only the leading end; keep the rear edge, heading and width fixed.
 const extendedLength=length+(pad.forwardExtension||0),scale=extendedLength/length;
 return {start,dx:dx*scale,dz:dz*scale,length:extendedLength,nx:-dz/length,nz:dx/length};
}
export function boostBoardPoint(pad,u,v=.5){
 const f=boardFrame(pad),offset=(v-.5)*pad.width;
 return {x:f.start.x+f.dx*u+f.nx*offset,z:f.start.z+f.dz*u+f.nz*offset};
}
export function boostBoardAt(stage,point){
 return stage.pads.find(pad=>{
  const f=boardFrame(pad),x=point.x-f.start.x,z=point.z-f.start.z,u=(x*f.dx+z*f.dz)/(f.length*f.length);
  return u>=-1e-6&&u<=1+1e-6&&Math.abs(x*f.nx+z*f.nz)<=pad.width/2+1e-6;
 });
}
export function boostBoardDirection(stage,point){
 const pad=boostBoardAt(stage,point);if(!pad)return null;
 const f=boardFrame(pad);return {x:f.dx/f.length,z:f.dz/f.length};
}
export function counterclockwiseTangent(point){
 const radius=Math.hypot(point.x,point.z);
 return radius>1e-9?{x:point.z/radius,z:-point.x/radius}:{x:0,z:0};
}
export function rotatingFloorContains(stage,point){return !!stage.rotatingFloor&&Math.hypot(point.x,point.z)<=stage.rotatingFloor.radius;}
export function rotatingFloorAngularSpeed(stage,time=0){const floor=stage.rotatingFloor;return floor?floor.angularSpeed*Math.cos(time*Math.PI*2/floor.cycleSeconds):0;}
export function rotatingFloorAngle(stage,time=0){const floor=stage.rotatingFloor;return floor?floor.angularSpeed*floor.cycleSeconds/(Math.PI*2)*Math.sin(time*Math.PI*2/floor.cycleSeconds):0;}
export function rotatingFloorVelocity(stage,point,velocity,dt,time=0){
 if(!rotatingFloorContains(stage,point)||dt<=0)return null;
 // Angular speed is in real seconds; Rapier movement runs simulationRate faster.
 // Gradual surface traction changes only translation, with a bounded acceleration.
 const floor=stage.rotatingFloor,omega=rotatingFloorAngularSpeed(stage,time)/CONFIG.simulationRate;
 const blend=1-Math.exp(-dt/floor.responseSeconds),dx=(omega*point.z-velocity.x)*blend,dz=(-omega*point.x-velocity.z)*blend;
 const change=Math.hypot(dx,dz),scale=change>0?Math.min(1,floor.maxAcceleration*dt/change):1;
 return {x:velocity.x+dx*scale,y:velocity.y,z:velocity.z+dz*scale};
}
export function rotatingFloorSpin(stage,axis,velocity,maxLaunchSpin,dt){
 const floor=stage.rotatingFloor,spin=velocity.x*axis.x+velocity.y*axis.y+velocity.z*axis.z;
 if(!floor?.spinLaunchRatio||Math.abs(spin)<=CONFIG.stopRate||dt<=0)return null;
 const amount=Math.min(maxLaunchSpin*floor.spinLaunchRatio*dt,Math.max(0,maxLaunchSpin*floor.maxSpinLaunchRatio-Math.abs(spin)));
 if(amount<=0)return null;
 const delta=Math.sign(spin)*amount;
 return {x:velocity.x+axis.x*delta,y:velocity.y+axis.y*delta,z:velocity.z+axis.z*delta};
}
export function boostBoardVelocity(stage,point,velocity,entrySpeed,maxLaunchSpeed){
 const boost=stage.boost,radius=Math.hypot(point.x,point.z);
 if(!boost||radius<1e-9)return null;
 const speed=Math.min(maxLaunchSpeed*boost.maxLaunchRatio,Math.max(maxLaunchSpeed*boost.minLaunchRatio,entrySpeed*boost.multiplier));
 const direction=boostBoardDirection(stage,point);if(!direction)return null;
 return {x:direction.x*speed,y:velocity.y,z:direction.z*speed};
}
export function boostBoardSpin(stage,axis,velocity,maxLaunchSpin){
 const boost=stage.boost,spin=velocity.x*axis.x+velocity.y*axis.y+velocity.z*axis.z;
 if(!boost?.spinLaunchRatio||Math.abs(spin)<=CONFIG.stopRate)return null;
 // A per-top fixed increment: it does not shrink with the remaining spin.
 // Add only along the shaft, retaining direction and all wobble components.
 const amount=Math.min(maxLaunchSpin*boost.spinLaunchRatio,Math.max(0,maxLaunchSpin*boost.maxSpinLaunchRatio-Math.abs(spin)));
 if(amount<=0)return null;
 const delta=Math.sign(spin)*amount;
 return {x:velocity.x+axis.x*delta,y:velocity.y+axis.y*delta,z:velocity.z+axis.z*delta};
}
export function updateBoostContact(top,touching,time,rearmSeconds){
 if(touching)top.boostSeparatedAt=null;
 else if(top.boostSeparatedAt==null)top.boostSeparatedAt=time;
 else if(time-top.boostSeparatedAt>=rearmSeconds)top.boostArmed=true;
}
