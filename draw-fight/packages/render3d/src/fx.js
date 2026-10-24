/** R3.2 cosmetic hit accents. These objects never affect scoring or collisions. */
export const FX_LIMIT=8;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function createHitAccent(event,fighters){
  if(!['hit','guard_break','perfect_guard','blocked'].includes(event?.type))return null;
  const target=event.type==='perfect_guard'?event.actor:event.target;
  const f=target==='p1'?fighters?.[0]:target==='p2'?fighters?.[1]:null;
  if(!f||!Number.isFinite(f.x)||!Number.isFinite(f.z))return null;
  const kind=event.type;
  return {kind,x:f.x,z:f.z,t:0,life:kind==='guard_break'?.62:kind==='perfect_guard'?.48:.34,
    strength:kind==='guard_break'?1.5:kind==='hit'?clamp((event.damage||8)/15,.7,1.5):1};
}
export function appendAccent(current,event,fighters,limit=FX_LIMIT){
  const accent=createHitAccent(event,fighters);if(!accent)return current;
  return [...current,accent].slice(-Math.max(1,limit));
}
export function advanceAccents(current,dt){
  if(!Number.isFinite(dt)||dt<=0)return current;
  return current.map(a=>({...a,t:a.t+Math.min(dt,.05)})).filter(a=>a.t<a.life);
}
export function accentStyle(accent){
  const progress=clamp(accent.t/accent.life,0,1),ease=1-(1-progress)**2;
  return {scale:(.16+.7*ease)*accent.strength,opacity:(1-progress)**1.4,
    color:accent.kind==='hit'?[1,.70,.31,1]:accent.kind==='guard_break'?[.94,.30,.23,1]:accent.kind==='perfect_guard'?[.25,.75,.81,1]:[.75,.86,.90,1]};
}
/** Pure ring vertices in the XY plane for shader line-strip rendering. */
export function circleAccentVertices(segments=32){
  const v=new Float32Array((segments+1)*3);
  for(let i=0;i<=segments;i++){const a=i*2*Math.PI/segments;v[i*3]=Math.cos(a);v[i*3+1]=Math.sin(a);v[i*3+2]=0;}
  return v;
}
