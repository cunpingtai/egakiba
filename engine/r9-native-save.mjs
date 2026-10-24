/** Dedicated local V3 Rapier-HP Chapter 1 records.
 * R5 silhouette saves deliberately remain read-only legacy history.
 * This is not an authenticated save or leaderboard certificate.
 */
import {LEVEL_CATALOG,isPlayable,isUnlocked,evaluateLevelResult} from './level-catalog.mjs';
import {NATIVE_HP_RULESET,NATIVE_HP_PHYSICS} from './native-hp-rules.mjs';
export const R9_SAVE_KEY='moji-blade.v3.r9.rapier-hp.local.v1';
export const R9_SCHEMA=1;
export const emptyNativeSave=()=>({schema:R9_SCHEMA,revision:0,progress:{},battles:0,lastGlyph:'文',lastFont:'gothic',updatedAt:null});
export function validateNativeSave(obj){
 if(!obj||obj.schema!==R9_SCHEMA||!Number.isSafeInteger(obj.revision)||obj.revision<0||!obj.progress||Array.isArray(obj.progress)||typeof obj.progress!=='object')throw Error('Incompatible R9 save');
 const next=emptyNativeSave();next.revision=obj.revision;next.battles=Number.isSafeInteger(obj.battles)&&obj.battles>=0?obj.battles:0;
 next.lastGlyph=typeof obj.lastGlyph==='string'&&obj.lastGlyph.length<=16?obj.lastGlyph:'文';next.lastFont=['gothic','mincho','pop','brush','gyosho'].includes(obj.lastFont)?obj.lastFont:'gothic';
 for(const [id,value] of Object.entries(obj.progress))if(isPlayable(id)&&Number.isInteger(value?.stars)&&value.stars>=1&&value.stars<=3&&Number.isFinite(value.bestSeconds)&&value.bestSeconds>0)next.progress[id]={stars:value.stars,bestSeconds:value.bestSeconds};
 next.updatedAt=typeof obj.updatedAt==='string'?obj.updatedAt:null;return next;
}
export function loadNativeSave(storage){try{storage??=globalThis.localStorage;const raw=storage.getItem(R9_SAVE_KEY);return raw?{save:validateNativeSave(JSON.parse(raw)),status:'loaded'}:{save:emptyNativeSave(),status:'new'};}catch(error){return {save:emptyNativeSave(),status:'unavailable',error:String(error)};}}
export function commitNativeResult(save,{levelId,trace,action,glyph='文',font='gothic'}={},storage){
 const next=validateNativeSave(save);
 if(!isPlayable(levelId)||!isUnlocked(levelId,next.progress))throw Error('Locked or unknown stage');
 if(trace?.kind!=='unverified-local-native-hp'||trace?.ranked!==false||trace?.rulesetVersion!==NATIVE_HP_RULESET||trace?.physicsVersion!==NATIVE_HP_PHYSICS||trace?.levelId!==levelId)throw Error('Invalid trace ruleset');
 if(trace?.result?.winner!==null&&!Number.isInteger(trace?.result?.winner))throw Error('Invalid result');
 if(!Number.isFinite(trace?.finalStateHash?.length)||!Number.isInteger(trace.frames)||trace.frames<=0||trace.frames>5000||!Array.isArray(trace.hp)||trace.hp.length!==2)throw Error('Invalid native trace');
 if(!action||!Number.isFinite(action.angle)||!Number.isFinite(action.power)||action.spinDirection!==1&&action.spinDirection!==-1)throw Error('Missing action');
 const result={winner:trace.result.winner,hp:trace.hp,playerMaxHp:trace.stats?.[0]?.maxHp,durationSeconds:trace.frames/60};
 const evaluation=evaluateLevelResult(LEVEL_CATALOG[levelId],result,action);
 next.revision++;next.battles++;next.lastGlyph=glyph;next.lastFont=font;
 if(evaluation.cleared){const old=next.progress[levelId];next.progress[levelId]={stars:Math.max(evaluation.stars,old?.stars||0),bestSeconds:Math.min(result.durationSeconds,old?.bestSeconds||Infinity)};}
 next.updatedAt=new Date().toISOString();
 try{storage??=globalThis.localStorage;storage.setItem(R9_SAVE_KEY,JSON.stringify(next));return {save:next,status:'saved',evaluation};}catch(error){return {save:next,status:'memory-only',evaluation,error:String(error)};}
}
