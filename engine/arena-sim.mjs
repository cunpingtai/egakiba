/** Moji Blade V3 R3 reference combat simulator.
 * Deterministic fixed-tick circle/disc collision model. NOT the canonical V2 glyph collider.
 * Offline story prototype only. No networking or authoritative leaderboard trust.
 */
export const SIM_VERSION='r3-reference-disc-0.2';
export const RULE_VERSION='arena-hp-r3-local-0.2';
export const SIM_HZ=60, MAX_TICKS=45*SIM_HZ, FIELD_RADIUS=3.15;
const minmax=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=(x,y)=>Math.hypot(x,y)||1;
const round=n=>Math.round(n*1e6)/1e6;
export function normalizeAction(a={}){
 return {angle:minmax(Number(a.angle)||0,-1.30,1.30),power:minmax(Number(a.power)||.75,.25,1),spinDirection:a.spinDirection===-1?-1:1};
}
export function enemyAction(seed='stage-01-01'){
 let s=2166136261;for(const c of seed)s=Math.imul(s^c.charCodeAt(0),16777619)>>>0;
 const offset=((s%23)-11)/100;
 return {angle:offset,power:.72,spinDirection:-1};
}
const safeStats=s=>({speed:minmax(Number(s?.speed)||50,1,100),power:minmax(Number(s?.power)||50,1,100),balance:minmax(Number(s?.balance)||50,1,100),maxHp:minmax(Number(s?.maxHp)||100,1,200),pointiness:minmax(Number(s?.pointiness)||0,0,1)});
export class ArenaSimulation{
 constructor({player,enemy,playerAction,enemyLaunch=enemyAction(),stage='01-01'}={}){
  this.version=SIM_VERSION;this.rulesVersion=RULE_VERSION;this.stage=stage;
  this.action=[normalizeAction(playerAction),normalizeAction(enemyLaunch)];
  const stats=[safeStats(player?.stats),safeStats(enemy?.stats)];
  this.tops=[0,1].map((i)=>{
    const s=stats[i],sign=i===0?1:-1,a=this.action[i],baseVelocity=(2.7+s.speed*.020)*(.35+a.power*.86);
    return {glyph:(i===0?player:enemy)?.glyph||'?',stats:s,hp:s.maxHp,spin:100,x:i===0?0.12:-0.12,y:sign*1.48,
     vx:Math.sin(a.angle)*baseVelocity,vy:-sign*Math.cos(a.angle)*baseVelocity,angle:0,rotation:a.spinDirection,
     radius:.34+(s.power/100)*.13,mass:.8+s.power/100*.9,out:false};
  });
  this.tick=0;this.done=false;this.result=null;this.events=[];this.history=[];this.lastContact=-100;this.contactCount=0;
  this.events.push({type:'launch',tick:0,actions:this.action});
 }
 /** Call exactly once per 1/60th of simulated time. No browser state or wall-clock dependencies. */
 step(){
  if(this.done)return [];
  this.tick++;const events=[],t=this.tops;
  for(let i=0;i<2;i++){
   const s=t[i];s.x+=s.vx/SIM_HZ;s.y+=s.vy/SIM_HZ;s.vx*=.9970;s.vy*=.9970;
   s.angle+=s.rotation*(.10+s.spin*.0012);s.spin=Math.max(0,s.spin-(.084+(100-s.stats.balance)*.00036));
   const d=norm(s.x,s.y),radial=(s.x*s.vx+s.y*s.vy)/d;
   if(d+s.radius>FIELD_RADIUS){
    // Ring-out only after substantial outward speed; otherwise bounce and absorb spin.
    if(radial>2.8+(s.stats.balance/100)*.8){s.out=true;events.push({type:'ring-out',slot:i,tick:this.tick});}
    else if(radial>0){const nx=s.x/d,ny=s.y/d;s.x=nx*(FIELD_RADIUS-s.radius);s.y=ny*(FIELD_RADIUS-s.radius);s.vx-=1.7*radial*nx;s.vy-=1.7*radial*ny;s.spin=Math.max(0,s.spin-.55);events.push({type:'wall',slot:i,tick:this.tick});}
   }
  }
  const dx=t[1].x-t[0].x,dy=t[1].y-t[0].y,dist=norm(dx,dy),reach=t[0].radius+t[1].radius;
  if(dist<reach&&!t[0].out&&!t[1].out){
   const nx=dx/dist,ny=dy/dist,relX=t[1].vx-t[0].vx,relY=t[1].vy-t[0].vy,rel=relX*nx+relY*ny;
   const overlap=reach-dist;const wa=t[1].mass/(t[0].mass+t[1].mass);
   t[0].x-=nx*overlap*wa;t[0].y-=ny*overlap*wa;t[1].x+=nx*overlap*(1-wa);t[1].y+=ny*overlap*(1-wa);
   if(rel<-.07){
    const j=-(1.65)*rel/(1/t[0].mass+1/t[1].mass);
    t[0].vx-=j*nx/t[0].mass;t[0].vy-=j*ny/t[0].mass;
    t[1].vx+=j*nx/t[1].mass;t[1].vy+=j*ny/t[1].mass;
    if(this.tick-this.lastContact>9){
     this.lastContact=this.tick;this.contactCount++;
     const critical=Math.abs(rel)>4.1&&(t[0].stats.pointiness>.32||t[1].stats.pointiness>.32);
     events.push({type:'collision',tick:this.tick,impulse:round(j),critical});
     for(let i=0;i<2;i++){
      const self=t[i],attacker=t[1-i];
      const base=Math.abs(j)*2.3*(.53+attacker.stats.power/145);
      const shield=.62+self.stats.balance/255;
      const damage=Math.max(1,Math.round(base/shield*(critical?1.35:1)));
      self.hp=Math.max(0,self.hp-damage);
      self.spin=Math.max(0,self.spin-Math.max(.6,damage*.085));
      events.push({type:'damage',tick:this.tick,slot:i,amount:damage,hpAfter:self.hp});
     }
    }
   }
  }
  // Standard result priority: ring-out > HP > spin > timeout.
  const lost=t.map(s=>s.out||s.hp<=0||s.spin<=0);
  if(this.contactCount===0&&this.tick>=8*SIM_HZ)this.finish(null,'no-contact',events);
  else if(lost.some(Boolean)){
   const winner=lost[0]===lost[1]?null:lost[0]?1:0;
   const reason=t.some(s=>s.out)?'ring-out':t.some(s=>s.hp<=0)?'hp-depleted':'spin-exhausted';
   this.finish(winner,lost.every(Boolean)?'double-ko':reason,events);
  }else if(this.tick>=MAX_TICKS)this.finish(null,'timeout',events);
  this.events.push(...events);return events;
 }
 finish(winner,reason,events=[]){this.done=true;this.result={winner,reason,tick:this.tick,durationSeconds:round(this.tick/SIM_HZ),hp:this.tops.map(s=>s.hp),spin:this.tops.map(s=>round(s.spin)),simulationVersion:SIM_VERSION,rulesVersion:RULE_VERSION,ranked:false};events.push({type:'finished',tick:this.tick,result:this.result});}
 snapshot(){return {tick:this.tick,done:this.done,result:this.result,tops:this.tops.map(s=>({glyph:s.glyph,x:s.x,y:s.y,angle:s.angle,hp:s.hp,spin:s.spin,vx:s.vx,vy:s.vy,radius:s.radius,maxHp:s.stats.maxHp}))};}
 runToEnd(){while(!this.done)this.step();return this.result;}
}
