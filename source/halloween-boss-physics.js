import RAPIER from './vendor/rapier.js';
import {Battle,retainImpactSpin} from './physics.js';
import {CONFIG} from './config.js';
import {stageSurfaceHeight} from './stages.js';
import {resolveBossLosses,bossSpawns,bossBoardAim,HALLOWEEN_BATTLES} from './halloween-boss-model.js';
// Match the ordinary collision window, but only protect spin lost to scenery.
// A recent enemy collision takes priority so its normal/critical damage is retained.
export function retainPropSpin(top,time){
 if(top.lastImpactTime!==undefined&&time-top.lastImpactTime<=.12){top.propImpactEntrySpin=undefined;top.lastPropImpactTime=undefined;return;}
 if(top.lastPropImpactTime===undefined||time-top.lastPropImpactTime>.12)top.propImpactEntrySpin=top.beforeImpactSpin;
 top.lastPropImpactTime=time;
 if(Number.isFinite(top.propImpactEntrySpin))retainImpactSpin(top,top.propImpactEntrySpin*.9/CONFIG.impactSpinRetention);
}
export class HalloweenBattle extends Battle{
 constructor(glyphs,index){
  const descriptor=HALLOWEEN_BATTLES[index],spawns=bossSpawns(index);
  super(glyphs,{angle:0,power:.85},{stage:descriptor.stage,spawns,teamBattle:true});
  this.bossEnemies=descriptor.enemies;
  this.tops.forEach((top,i)=>{const enemy=i>0?descriptor.enemies[i-1]:null;top.webImmune=enemy?.webImmune===true;top.power*=enemy?.powerMultiplier||1;top.speedStat*=enemy?.speedMultiplier||1;});
  this.props=[];this.destroyedProps=[];this.propEvents=[];
  try{for(const [id,p] of (this.stage.props||[]).entries()){
   const pumpkin=p.kind==='pumpkin',y=stageSurfaceHeight(this.stage,p.x,p.z),radius=.48*(p.size||1);
   const desc=pumpkin?RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x,y+radius+.02,p.z).setLinearDamping(.1).setAngularDamping(.08).setCcdEnabled(true):RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,y+.53,p.z);
   const body=this.world.createRigidBody(desc),shape=pumpkin?RAPIER.ColliderDesc.ball(radius):RAPIER.ColliderDesc.roundCuboid(.47,.53,.22,.08);
   const collider=this.world.createCollider(shape.setCollisionGroups(0x00010003).setDensity(pumpkin?.8:1).setFriction(.08).setRestitution(.35),body);
   this.props.push({id,...p,body,collider,destroyed:false,touchingTops:new Set(),lastHit:-Infinity});
  }}catch(error){this.dispose();throw error;}
 }
 launch(angle,power,spinDirection=1){
  const player=this.tops[0].body.translation();
  const actions=[{angle,power,spinDirection},...this.tops.slice(1).map((top,i)=>{const p=top.body.translation(),orbit=this.stage.id==='halloween-moon'&&i>0?Math.atan2(player.z-p.z,p.x-player.x):null;return {angle:orbit??bossBoardAim(this.stage,p)??(Math.atan2(player.x-p.x,player.z-p.z)+(i%2?-.08:.08)),power:.84+(i%3)*.04,spinDirection:i%2?-1:1};})];
  const launched=this.launchPair(actions);
  if(launched)for(const [i,enemy] of this.bossEnemies.entries()){const top=this.tops[i+1],spin=enemy.spinMultiplier||1,speed=enemy.speedMultiplier||1;if(spin!==1){const w=top.body.angvel();top.initialOmega*=spin;top.body.setAngvel({x:w.x*spin,y:w.y*spin,z:w.z*spin},true);}if(speed!==1){const v=top.body.linvel();top.body.setLinvel({x:v.x*speed,y:v.y,z:v.z*speed},true);}}
  return launched;
 }
 resolveLosses(losses){
  const recorded=losses.map((loss,i)=>this.tops[i].loss||loss);
  for(const [i,reason] of recorded.entries())if(reason&&!this.tops[i].loss){const top=this.tops[i];top.loss=reason;top.body.setEnabled(false);}
  return resolveBossLosses(recorded,this.time);
 }
 step(){
  if(!this.running)return;
  const dt=CONFIG.step/CONFIG.simulationRate;
  for(const top of this.tops){if(!top.body.isEnabled())continue;const p=top.body.translation();
   const onWeb=!top.webImmune&&(this.stage.webs||[]).some(web=>Math.hypot(p.x-web.x,p.z-web.z)<=web.radius)&&p.y<stageSurfaceHeight(this.stage,p.x,p.z)+CONFIG.tipLength+.3;
   if(onWeb){const v=top.body.linvel(),drag=Math.exp(-4.2*dt);top.body.setLinvel({x:v.x*drag,y:v.y,z:v.z*drag},true);}top.onWeb=onWeb;
  }
  super.step();
  for(const prop of this.props){
   if(prop.destroyed)continue;const touching=new Set();
   for(const top of this.tops){if(!top.body.isEnabled())continue;
    const a=top.body.translation(),b=prop.body.translation(),reach=top.glyph.radius+(prop.kind==='pumpkin'?.48*(prop.size||1):.6)+.1;if((a.x-b.x)**2+(a.z-b.z)**2>reach*reach)continue;
    const hit=top.colliders.some(c=>{const contact=c.contactCollider(prop.collider,.015);return contact&&contact.distance<=.015;});if(!hit)continue;
    retainPropSpin(top,this.time);
    const position={...prop.body.translation()};
    if(prop.kind==='grave'){prop.destroyed=true;this.destroyedProps.push(prop.id);this.propEvents.push({kind:'grave',position});this.world.removeRigidBody(prop.body);break;}
    touching.add(top.index);if(!prop.touchingTops.has(top.index)&&this.time-prop.lastHit>=.12){const a=top.body.linvel(),b=prop.body.linvel();this.propEvents.push({kind:'pumpkin',position,strength:Math.min(1,Math.hypot(a.x-b.x,a.z-b.z)/8)});prop.lastHit=this.time;}
   }
   prop.touchingTops=touching;
  }
 }
 advance(dt){const alpha=super.advance(dt);if(!this.result&&this.debrisWorld){this.debrisAccumulator+=Math.max(0,Math.min(dt,CONFIG.maxFrame))*CONFIG.simulationRate;while(this.debrisAccumulator>=CONFIG.debrisStep){this.debrisWorld.step();this.debrisAccumulator-=CONFIG.debrisStep;}}return alpha;}
}
