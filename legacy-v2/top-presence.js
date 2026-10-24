// Presentation only: does not touch a Battle, a rigid body, or game randomness.
export const TOP_PRESENCE_SECONDS=Object.freeze({enter:.28,exit:.18});
export function topPresencePose(kind,progress){
 const t=Math.max(0,Math.min(1,progress));
 if(kind==='exit'){const scale=1-.96*t*t;return {x:scale,y:scale,lift:.42*Math.sin(Math.PI*t)};}
 const scale=.08+.92*(1-(1-t)**3),landing=t>.78?.075*Math.sin(Math.PI*(t-.78)/.22):0;
 return {x:scale*(1+landing),y:scale*(1-landing),lift:.72*Math.sin(Math.PI*t)**1.3};
}
export class TopPresence{
 constructor({tipLength=0,reduced=()=>false}={}){this.tipLength=tipLength;this.reduced=reduced;this.motions=new Map();}
 animate(groups,indices,kind='enter'){
  return Promise.all(indices.map(index=>{
   const group=groups[index];if(!group)return Promise.resolve();
   this.motions.get(index)?.resolve();this.motions.delete(index);
   if(this.reduced()){group.visible=kind==='enter';group.scale.set(1,1,1);return Promise.resolve();}
   group.visible=true;
   return new Promise(resolve=>this.motions.set(index,{kind,elapsed:0,duration:TOP_PRESENCE_SECONDS[kind],resolve}));
  }));
 }
 update(index,group,dt){
  const motion=this.motions.get(index);if(!motion)return;
  motion.elapsed+=Math.max(0,Math.min(.1,dt));const t=Math.min(1,motion.elapsed/motion.duration),pose=topPresencePose(motion.kind,t);
  group.scale.set(pose.x,pose.y,pose.x);group.position.y+=pose.lift-this.tipLength*(1-pose.y);
  if(t>=1){if(motion.kind==='exit')group.visible=false;else group.scale.set(1,1,1);this.motions.delete(index);motion.resolve();}
 }
 clear(){for(const motion of this.motions.values())motion.resolve();this.motions.clear();}
}
