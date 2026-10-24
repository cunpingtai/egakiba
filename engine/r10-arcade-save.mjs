/** Separate local storage for the R10 optional active-dash rules. No R9 rankings or saves are overwritten. */
import {emptyNativeSave,validateNativeSave} from './r9-native-save.mjs';
import {LEVEL_CATALOG,isPlayable,isUnlocked,evaluateLevelResult} from './level-catalog.mjs';
import {ARCADE_RULESET,ARCADE_TRACE_KIND} from './r10-arcade-battle.mjs';
import {NATIVE_HP_PHYSICS} from './native-hp-rules.mjs';
export const R10_SAVE_KEY='moji-blade.v3.r10.rapier-arcade.local.v1';
export function loadArcadeSave(storage){try{storage??=globalThis.localStorage;const raw=storage.getItem(R10_SAVE_KEY);return raw?{save:validateNativeSave(JSON.parse(raw)),status:'loaded'}:{save:emptyNativeSave(),status:'new'};}catch(error){return {save:emptyNativeSave(),status:'unavailable',error:String(error)};}}
export function commitArcadeResult(previous,{levelId,trace,action,glyph='文',font='gothic'}={},storage){
 const next=validateNativeSave(previous);if(!isPlayable(levelId)||!isUnlocked(levelId,next.progress))throw Error('Locked or unknown stage');
 if(trace?.kind!==ARCADE_TRACE_KIND||trace?.rulesetVersion!==ARCADE_RULESET||trace?.physicsVersion!==NATIVE_HP_PHYSICS||trace.levelId!==levelId||trace.ranked!==false)throw Error('Incompatible arcade trace');
 if(!trace?.result||![0,1,null].includes(trace.result.winner)||!Number.isInteger(trace.frames)||trace.frames<1||trace.frames>5000||!Array.isArray(trace.hp)||trace.hp.length!==2||!Array.isArray(trace.arcadeActions))throw Error('Invalid arcade outcome');
 const used=new Set();for(const dash of trace.arcadeActions){if(!Number.isInteger(dash.frame)||dash.frame<1||dash.frame>=trace.frames||!Number.isFinite(dash.heading)||used.has(dash.frame))throw Error('Invalid arcade dash log');used.add(dash.frame);}
 if(!action||!Number.isFinite(action.angle)||!Number.isFinite(action.power)||![1,-1].includes(action.spinDirection))throw Error('Missing launch action');
 const evaluation=evaluateLevelResult(LEVEL_CATALOG[levelId],{winner:trace.result.winner,hp:trace.hp,playerMaxHp:trace.stats?.[0]?.maxHp,durationSeconds:trace.frames/60},action);
 next.revision++;next.battles++;next.lastGlyph=glyph;next.lastFont=font;next.updatedAt=new Date().toISOString();
 if(evaluation.cleared){const old=next.progress[levelId];next.progress[levelId]={stars:Math.max(evaluation.stars,old?.stars||0),bestSeconds:Math.min(trace.frames/60,old?.bestSeconds||Infinity)};}
 try{storage??=globalThis.localStorage;storage.setItem(R10_SAVE_KEY,JSON.stringify(next));return {save:next,evaluation,status:'saved'};}catch(error){return {save:next,evaluation,status:'memory-only',error:String(error)};}
}
