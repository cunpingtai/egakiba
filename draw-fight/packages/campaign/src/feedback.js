import { HEAVY_CHARGE_TICKS } from '../../game-core/src/engine.ts';
/** R3.1: pure presentation mapping. Does not touch authoritative game state. */
export const HEAVY_HINT_TICKS=HEAVY_CHARGE_TICKS; // Same authoritative charge threshold as combat engine.
export function attackUi(combatant){
  const charge=Math.min(1,Math.max(0,(combatant?.chargeTicks||0)/HEAVY_HINT_TICKS));
  const heavy=(combatant?.chargeTicks||0)>=HEAVY_HINT_TICKS;
  const blocked=(combatant?.stunTicks||0)>0||(combatant?.cooldownTicks||0)>0||!!combatant?.attack;
  const insufficient=(combatant?.stamina??100)<19;
  let hint='短押し: すばやく攻撃 / 長押し: 強打';
  if(blocked)hint='いまは攻撃できない！ スキを待とう';
  else if(insufficient)hint='スタミナ不足！ 少し待って回復しよう';
  else if(heavy)hint='強打の準備 OK！ はなして攻撃！';
  else if(charge>0)hint='ちからを ためている…';
  return {charge,heavy,blocked,insufficient,hint};
}
export function impactView(event){
  const target=event.target||null;
  switch(event.type){
    case 'hit':return {text:String(event.damage||0),tone:'damage',target,important:true};
    case 'blocked':return {text:'ガード！',tone:'guard',target,important:false};
    case 'perfect_guard':return {text:'ジャスト！',tone:'perfect',target:event.actor,important:true};
    case 'guard_break':return {text:'ガード崩れ！',tone:'break',target,important:true};
    default:return null;
  }
}
/** Keep feedback bounded even in unusually event-heavy encounters. */
export function limitedImpacts(items,limit=6){return items.length>limit?items.slice(-limit):items;}
/** Screen anchor for fallback paper-arena HUD. No UI position is trusted as combat input. */
export function impactPosition(event,match,mode='2d'){
  const target=event.type==='perfect_guard'?event.actor:event.target;
  if(mode!=='2d'||!match||!['p1','p2'].includes(target))return {left:target==='p1'?35:65,top:45};
  const f=match[target];if(!f||!Number.isFinite(f.x)||!Number.isFinite(f.z))return {left:50,top:45};
  const x=480+(f.x-f.z)*125,y=413+f.z*10+f.x*5-150;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  return {left:clamp(x/960*100,11,89),top:clamp(y/570*100,13,80)};
}
