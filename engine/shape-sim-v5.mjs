/** R5 local silhouette + angular impulse prototype.  NOT original V2 physics.
 * Deterministic in one JS runtime for fixed geometry and action inputs only.
 * Not suitable for online ranked, tamper-resistance, or cross-device PvP.
 */
import {assertGeometry,GEOMETRY_VERSION} from './glyph-geometry.mjs';
import {contactManifold} from './shape-contact-v5.mjs';
import {SIM_HZ,MAX_TICKS,FIELD_RADIUS,normalizeAction,enemyAction} from './arena-sim.mjs';
export const SHAPE_SIM_VERSION='r5-local-manifold-angular-0.1';
export const SHAPE_RULE_VERSION='arena-hp-r5-experimental-0.1';
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=v=>Math.round(v*1e6)/1e6;
const cross=(x,y,u,v)=>x*v-y*u;
const safeStats=s=>({speed:lim(Number(s?.speed)||50,1,100),power:lim(Number(s?.power)||50,1,100),balance:lim(Number(s?.balance)||50,1,100),maxHp:lim(Number(s?.maxHp)||100,1,200),pointiness:lim(Number(s?.pointiness)||0,0,1)});
export class ShapeSimulationV5 {
 constructor({player,enemy,playerAction,enemyLaunch=enemyAction(),stage='01-01',stageConfig={}}={}){
  this.geometry=[assertGeometry(player?.geometry),assertGeometry(enemy?.geometry)];this.action=[normalizeAction(playerAction),normalizeAction(enemyLaunch)];
  this.stage=stage;this.stageConfig={...stageConfig};this.tick=0;this.done=false;this.result=null;this.events=[];this.lastContact=-100;this.contactCount=0;
  this.tops=[player,enemy].map((c,i)=>{
   const s=safeStats(c.stats),a=this.action[i],dir=i===0?1:-1;
   const speed=(2.7+s.speed*.020)*(.35+a.power*.86);
   const radius=.34+s.power*.0013,mass=.8+s.power*.009;
   const inertia=Math.max(.03,mass*radius*radius*(.35+this.geometry[i].features.moment*6));
   return {glyph:c.glyph,geometryId:this.geometry[i].id,stats:s,hp:s.maxHp,spin:100,x:i===0?.12:-.12,y:dir*1.48,
    vx:Math.sin(a.angle)*speed,vy:-dir*Math.cos(a.angle)*speed,angle:0,rotation:a.spinDirection,
    omega:a.spinDirection*7.5,radius,mass,inertia,out:false};
  });
  this.events.push({type:'launch',tick:0,actions:this.action,geometryIds:this.geometry.map(g=>g.id)});
 }
 advanceSubstep(dt,out){
  const t=this.tops;
  for(const s of t){
   if(s.out)continue;
   s.x+=s.vx*dt;s.y+=s.vy*dt;s.angle+=s.omega*dt;
   const distance=Math.hypot(s.x,s.y)||1,nx=s.x/distance,ny=s.y/distance,radial=s.vx*nx+s.vy*ny;
   if(distance+s.radius>FIELD_RADIUS){
    if(radial>2.8+s.stats.balance*.008){s.out=true;out.push({type:'ring-out',tick:this.tick,slot:t.indexOf(s)});}
    else if(radial>0){const overlap=distance+s.radius-FIELD_RADIUS;s.x-=nx*overlap;s.y-=ny*overlap;s.vx-=1.65*radial*nx;s.vy-=1.65*radial*ny;s.spin=Math.max(0,s.spin-.13);}
   }
  }
  if(t[0].out||t[1].out)return;
  const m=contactManifold(t[0],t[1],this.geometry[0],this.geometry[1]);
  if(!m)return;
  const [a,b]=t,ax=m.x-a.x,ay=m.y-a.y,bx=m.x-b.x,by=m.y-b.y;
  const crossA=cross(ax,ay,m.nx,m.ny),crossB=cross(bx,by,m.nx,m.ny);
  const wa=b.mass/(a.mass+b.mass);
  a.x-=m.nx*m.depth*wa;a.y-=m.ny*m.depth*wa;b.x+=m.nx*m.depth*(1-wa);b.y+=m.ny*m.depth*(1-wa);
  const vaX=a.vx-a.omega*ay,vaY=a.vy+a.omega*ax;
  const vbX=b.vx-b.omega*by,vbY=b.vy+b.omega*bx;
  const approach=(vbX-vaX)*m.nx+(vbY-vaY)*m.ny;
  if(approach>=-.07)return;
  const denominator=1/a.mass+1/b.mass+crossA*crossA/a.inertia+crossB*crossB/b.inertia;
  const impulse=lim(-(1.58)*approach/denominator,0,25);
  a.vx-=impulse*m.nx/a.mass;a.vy-=impulse*m.ny/a.mass;
  b.vx+=impulse*m.nx/b.mass;b.vy+=impulse*m.ny/b.mass;
  a.omega=lim(a.omega-impulse*crossA/a.inertia,-20,20);
  b.omega=lim(b.omega+impulse*crossB/b.inertia,-20,20);
  if(this.tick-this.lastContact>9){
   this.lastContact=this.tick;this.contactCount++;
   const critical=Math.abs(approach)>4.1&&(a.stats.pointiness>.32||b.stats.pointiness>.32);
   out.push({type:'collision',tick:this.tick,impulse:rnd(impulse),critical,contact:[rnd(m.x),rnd(m.y)],normal:[rnd(m.nx),rnd(m.ny)],angular:[rnd(a.omega),rnd(b.omega)],shapeOverlap:m.samples});
   for(let i=0;i<2;i++){
    const self=t[i],attacker=t[1-i],base=Math.abs(impulse)*2.5*(.52+attacker.stats.power/145),shield=.62+self.stats.balance/255;
    const damage=Math.max(1,Math.round(base/shield*(critical?1.35:1)));
    self.hp=Math.max(0,self.hp-damage);self.spin=Math.max(0,self.spin-Math.max(.5,damage*.09));
    out.push({type:'damage',tick:this.tick,slot:i,amount:damage,hpAfter:self.hp});
   }
  }
 }
 step(){
  if(this.done)return [];
  this.tick++;const out=[];
  // Substep count depends only on fixed game state, never browser elapsed time.
  const speed=Math.max(...this.tops.map(s=>Math.hypot(s.vx,s.vy)));
  const substeps=lim(Math.ceil(speed/(SIM_HZ*.045)),1,4);
  for(let n=0;n<substeps;n++)this.advanceSubstep(1/(SIM_HZ*substeps),out);
  for(const s of this.tops){
   s.vx*=.997;s.vy*=.997;
   s.spin=Math.max(0,s.spin-(.075+(100-s.stats.balance)*.00043));
   const sign=Math.sign(s.omega)||s.rotation;
   s.omega=lim(s.omega*.996+s.rotation*.015*(s.spin/100),-20,20);
  }
  const lost=this.tops.map(s=>s.out||s.hp<=0||s.spin<=0);
  if(this.contactCount===0&&this.tick>=8*SIM_HZ)this.finish(null,'no-contact',out);
  else if(lost.some(Boolean))this.finish(lost[0]===lost[1]?null:lost[0]?1:0,lost.every(Boolean)?'double-ko':this.tops.some(s=>s.out)?'ring-out':this.tops.some(s=>s.hp<=0)?'hp-depleted':'spin-exhausted',out);
  else if(this.tick>=MAX_TICKS)this.finish(null,'timeout',out);
  this.events.push(...out);return out;
 }
 finish(winner,reason,out){this.done=true;this.result={winner,reason,tick:this.tick,durationSeconds:rnd(this.tick/SIM_HZ),hp:this.tops.map(s=>s.hp),spin:this.tops.map(s=>rnd(s.spin)),contactCount:this.contactCount,simulationVersion:SHAPE_SIM_VERSION,rulesVersion:SHAPE_RULE_VERSION,geometryVersion:GEOMETRY_VERSION,geometryHashes:this.geometry.map(g=>g.id),ranked:false};out.push({type:'finished',tick:this.tick,result:this.result});}
 snapshot(){return {tick:this.tick,done:this.done,result:this.result,tops:this.tops.map(s=>({glyph:s.glyph,x:s.x,y:s.y,angle:s.angle,hp:s.hp,spin:s.spin,vx:s.vx,vy:s.vy,omega:s.omega,radius:s.radius,maxHp:s.stats.maxHp}))};}
 runToEnd(){while(!this.done)this.step();return this.result;}
}
