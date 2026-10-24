import {CONFIG} from './config.js';
import {stageRopeRadius,stageSurfaceHeight} from './stages.js';
import {topWorldBounds,topCrossesBelow} from './top-bounds.js';
export {topWorldBounds as ringFootprint} from './top-bounds.js';
// A short harmonic field returns outward travel energy. Only the normal
// component slows and reverses; there is no torque or extra upward impulse.
export function updateRingBoundary(top,stage,time){
 if(!stage.ropes)return null;
 const p=top.body.translation(),v=top.body.linvel(),edge=stageRopeRadius(stage),bounds=topWorldBounds(top);
 const ceiling=side=>stageSurfaceHeight(stage,side%2?Math.max(-edge,Math.min(edge,p.x)):edge,side%2?edge:Math.max(-edge,Math.min(edge,p.z)))+stage.ropes.levels.at(-1);
 let turn=top.ringTurn,fresh=false;
 if(turn&&turn.sides.some(side=>{
  const key=side%2?'Z':'X',outer=side<2?bounds['max'+key]:-bounds['min'+key];
  return !topCrossesBelow(top,side,Math.min(edge,outer-1e-6),ceiling(side),bounds);
 })){
  top.ringTurn=null;return {phase:'release',side:turn.sides[0],otherSide:turn.sides[1],position:turn.position,width:turn.width,depth:turn.depth,amount:0,speed:turn.speed};
 }
 if(!turn){
  const sides=[];
  if(bounds.maxX>=edge&&v.x>0&&topCrossesBelow(top,0,edge,ceiling(0),bounds))sides.push(0);
  if(bounds.maxZ>=edge&&v.z>0&&topCrossesBelow(top,1,edge,ceiling(1),bounds))sides.push(1);
  if(bounds.minX<=-edge&&v.x<0&&topCrossesBelow(top,2,edge,ceiling(2),bounds))sides.push(2);
  if(bounds.minZ<=-edge&&v.z<0&&topCrossesBelow(top,3,edge,ceiling(3),bounds))sides.push(3);
  const speed=Math.hypot(v.x,v.z);
  if(!sides.length||speed<1e-6)return null;
  const side=sides[0],normalSpeed=Math.max(...sides.map(s=>Math.abs(s%2?v.z:v.x)));
  const duration=Math.min(stage.ropes.turnSeconds,stage.ropes.maxPenetration*Math.PI/(normalSpeed*CONFIG.simulationRate));
  const x=side===0?edge:side===2?-edge:Math.max(-edge,Math.min(edge,(bounds.minX+bounds.maxX)/2)),z=side===1?edge:side===3?-edge:Math.max(-edge,Math.min(edge,(bounds.minZ+bounds.maxZ)/2));
  turn=top.ringTurn={started:time-CONFIG.step/CONFIG.simulationRate,duration,velocity:{x:v.x,z:v.z},speed,sides,position:{x,y:p.y,z},width:side%2?bounds.maxX-bounds.minX:bounds.maxZ-bounds.minZ,depth:Math.min(stage.ropes.maxPenetration,normalSpeed*CONFIG.simulationRate*duration/Math.PI)};fresh=true;
 }
 const progress=Math.max(0,Math.min(1,(time-turn.started)/turn.duration)),normal=Math.cos(Math.PI*progress),eased=progress*progress*(3-2*progress),retention=1-(1-stage.ropes.speedRetention)*eased;
 top.body.setLinvel({x:turn.velocity.x*(turn.sides.some(s=>s===0||s===2)?normal:1)*retention,y:v.y,z:turn.velocity.z*(turn.sides.some(s=>s===1||s===3)?normal:1)*retention},true);
 const event={phase:fresh?'impact':progress>=1?'release':'stretch',side:turn.sides[0],position:turn.position,width:turn.width,depth:turn.depth,amount:Math.sin(Math.PI*progress),speed:turn.speed};
 if(turn.sides.length===2)event.otherSide=turn.sides[1];
 if(progress>=1)top.ringTurn=null;
 return event;
}
