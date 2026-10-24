/** R4 experimental local silhouette collision solver.
 * Shared raster shape with renderer; NOT the original V2/Bullet/Rapier physics.
 * Not safe for competitive leaderboards or authoritative multiplayer.
 */
import {assertGeometry,silhouetteContact,GEOMETRY_VERSION} from './glyph-geometry.mjs';
import {SIM_HZ,MAX_TICKS,FIELD_RADIUS,normalizeAction,enemyAction} from './arena-sim.mjs';
export const SHAPE_SIM_VERSION='r4-local-silhouette-0.1',SHAPE_RULE_VERSION='arena-hp-r4-experimental-0.1';
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));const rounded=x=>Math.round(x*1e6)/1e6;
function stats(s){return {speed:limit(Number(s?.speed)||50,1,100),power:limit(Number(s?.power)||50,1,100),balance:limit(Number(s?.balance)||50,1,100),maxHp:limit(Number(s?.maxHp)||100,1,200),pointiness:limit(Number(s?.pointiness)||0,0,1)};}
export class ShapeSimulation{
 constructor({player,enemy,playerAction,enemyLaunch=enemyAction(),stage='01-01'}={}){
  const competitors=[player,enemy];this.action=[normalizeAction(playerAction),normalizeAction(enemyLaunch)];
  this.geometry=competitors.map(p=>assertGeometry(p?.geometry));this.stage=stage;this.tick=0;this.done=false;this.result=null;this.events=[];this.contactCount=0;this.lastContact=-100;
  this.tops=competitors.map((p,i)=>{const s=stats(p.stats),dir=i===0?1:-1,act=this.action[i],v=(2.7+s.speed*.020)*(.35+act.power*.86);
   return {glyph:p.glyph,geometryId:p.geometry.id,stats:s,hp:s.maxHp,spin:100,x:i===0?.12:-.12,y:dir*1.48,
    vx:Math.sin(act.angle)*v,vy:-dir*Math.cos(act.angle)*v,angle:0,rotation:act.spinDirection,
    radius:.34+(s.power/100)*.13,mass:.8+s.power/100*.9,out:false};});
  this.events.push({type:'launch',tick:0,actions:this.action,geometryIds:this.geometry.map(g=>g.id)});
 }
 step(){
  if(this.done)return [];this.tick++;const out=[],t=this.tops;
  for(let i=0;i<2;i++){
   const s=t[i];s.x+=s.vx/SIM_HZ;s.y+=s.vy/SIM_HZ;s.vx*=.997;s.vy*=.997;
   s.angle+=s.rotation*(.10+s.spin*.0012);s.spin=Math.max(0,s.spin-(.084+(100-s.stats.balance)*.00036));
   const d=Math.hypot(s.x,s.y)||1,radial=(s.x*s.vx+s.y*s.vy)/d;
   if(d+s.radius>FIELD_RADIUS){
    if(radial>2.8+s.stats.balance/100*.8){s.out=true;out.push({type:'ring-out',slot:i,tick:this.tick});}
    else if(radial>0){const nx=s.x/d,ny=s.y/d;s.x=nx*(FIELD_RADIUS-s.radius);s.y=ny*(FIELD_RADIUS-s.radius);s.vx-=1.7*radial*nx;s.vy-=1.7*radial*ny;s.spin=Math.max(0,s.spin-.55);out.push({type:'wall',slot:i,tick:this.tick});}
   }
  }
  if(!t[0].out&&!t[1].out){
   const contact=silhouetteContact(t[0],t[1],this.geometry[0],this.geometry[1]);
   if(contact){const {nx,ny}=contact,relative=(t[1].vx-t[0].vx)*nx+(t[1].vy-t[0].vy)*ny;
    const wa=t[1].mass/(t[0].mass+t[1].mass),gap=.004;
    t[0].x-=nx*gap*wa;t[0].y-=ny*gap*wa;t[1].x+=nx*gap*(1-wa);t[1].y+=ny*gap*(1-wa);
    if(relative<-.07){const j=-1.65*relative/(1/t[0].mass+1/t[1].mass);
     t[0].vx-=j*nx/t[0].mass;t[0].vy-=j*ny/t[0].mass;t[1].vx+=j*nx/t[1].mass;t[1].vy+=j*ny/t[1].mass;
     if(this.tick-this.lastContact>9){
      this.lastContact=this.tick;this.contactCount++;
      const critical=Math.abs(relative)>4.1&&(t[0].stats.pointiness>.32||t[1].stats.pointiness>.32);
      out.push({type:'collision',tick:this.tick,impulse:rounded(j),critical,contact:[rounded(contact.x),rounded(contact.y)],shapeOverlap:contact.overlaps});
      for(let i=0;i<2;i++){
       const self=t[i],attacker=t[1-i],base=Math.abs(j)*2.3*(.53+attacker.stats.power/145),shield=.62+self.stats.balance/255;
       const damage=Math.max(1,Math.round(base/shield*(critical?1.35:1)));
       self.hp=Math.max(0,self.hp-damage);self.spin=Math.max(0,self.spin-Math.max(.6,damage*.085));out.push({type:'damage',tick:this.tick,slot:i,amount:damage,hpAfter:self.hp});
      }
     }
    }
   }
  }
  const lost=t.map(s=>s.out||s.hp<=0||s.spin<=0);
  if(this.contactCount===0&&this.tick>=8*SIM_HZ)this.finish(null,'no-contact',out);
  else if(lost.some(Boolean))this.finish(lost[0]===lost[1]?null:lost[0]?1:0,lost.every(Boolean)?'double-ko':t.some(s=>s.out)?'ring-out':t.some(s=>s.hp<=0)?'hp-depleted':'spin-exhausted',out);
  else if(this.tick>=MAX_TICKS)this.finish(null,'timeout',out);
  this.events.push(...out);return out;
 }
 finish(winner,reason,ev){this.done=true;this.result={winner,reason,tick:this.tick,durationSeconds:rounded(this.tick/SIM_HZ),hp:this.tops.map(s=>s.hp),spin:this.tops.map(s=>rounded(s.spin)),simulationVersion:SHAPE_SIM_VERSION,rulesVersion:SHAPE_RULE_VERSION,geometryVersion:GEOMETRY_VERSION,geometryHashes:this.geometry.map(g=>g.id),ranked:false};ev.push({type:'finished',tick:this.tick,result:this.result});}
 snapshot(){return {tick:this.tick,done:this.done,result:this.result,tops:this.tops.map(s=>({glyph:s.glyph,x:s.x,y:s.y,angle:s.angle,hp:s.hp,spin:s.spin,vx:s.vx,vy:s.vy,radius:s.radius,maxHp:s.stats.maxHp}))};}
 runToEnd(){while(!this.done)this.step();return this.result;}
}
