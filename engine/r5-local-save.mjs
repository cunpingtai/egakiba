/** Version-isolated on-device R5 saves.  Never writes V2/R3/R4 namespaces.
 * Immutable progress rules: stars=max, bestSeconds=min, old record preserved on storage error.
 * Cannot be used as a trusted server ranking. */
import {LEVEL_CATALOG,isPlayable,isUnlocked,evaluateLevelResult} from './level-catalog.mjs';
import {SHAPE_SIM_VERSION,SHAPE_RULE_VERSION} from './shape-sim-v5.mjs';
export const SAVE_KEY='moji-blade.v3.r5.local-save.v1',SAVE_SCHEMA=1;
export const emptySave=()=>({schema:SAVE_SCHEMA,revision:0,progress:{},battleCount:0,lastGlyph:'文',lastFont:'gothic',updatedAt:null});
export function validateSave(obj){
 if(!obj||obj.schema!==SAVE_SCHEMA||!Number.isSafeInteger(obj.revision)||obj.revision<0||!obj.progress||typeof obj.progress!=='object'||Array.isArray(obj.progress))throw Error('Incompatible R5 save');
 const clean=emptySave();clean.revision=obj.revision;clean.battleCount=Number.isSafeInteger(obj.battleCount)&&obj.battleCount>=0?obj.battleCount:0;
 clean.lastGlyph=typeof obj.lastGlyph==='string'?obj.lastGlyph.slice(0,12):'文';clean.lastFont=['gothic','mincho','pop','gyosho'].includes(obj.lastFont)?obj.lastFont:'gothic';
 for(const [id,r] of Object.entries(obj.progress))if(isPlayable(id)&&r&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isFinite(r.bestSeconds)&&r.bestSeconds>0)
   clean.progress[id]={stars:r.stars,bestSeconds:r.bestSeconds};
 clean.updatedAt=typeof obj.updatedAt==='string'?obj.updatedAt:null;return clean;
}
export function loadSave(storage){try{storage??=globalThis.localStorage;const raw=storage.getItem(SAVE_KEY);return raw?{save:validateSave(JSON.parse(raw)),status:'loaded'}:{save:emptySave(),status:'new'};}catch(err){return {save:emptySave(),status:'unavailable',error:String(err)};}}
export function commitBattle(save,{levelId,result,action,glyph='文',font='gothic'}={},storage){
 const next=validateSave(save);
 if(!isPlayable(levelId))throw Error('Unknown stage');
 if(!isUnlocked(levelId,next.progress))throw Error('Locked stage');
 if(result?.simulationVersion!==SHAPE_SIM_VERSION||result?.rulesVersion!==SHAPE_RULE_VERSION||result?.ranked!==false||!Array.isArray(result?.hp)||!Number.isFinite(result.durationSeconds)||result.durationSeconds<=0)throw Error('Untrusted or incompatible result version');
 if(!Number.isFinite(action?.angle)||!Number.isFinite(action?.power))throw Error('Missing launch action');
 const evaluation=evaluateLevelResult(LEVEL_CATALOG[levelId],result,action);
 next.revision++;next.battleCount++;next.lastGlyph=glyph;next.lastFont=font;
 if(evaluation.cleared){const prev=next.progress[levelId];next.progress[levelId]={stars:Math.max(evaluation.stars,prev?.stars||0),bestSeconds:Math.min(result.durationSeconds,prev?.bestSeconds||Infinity)};}
 next.updatedAt=new Date().toISOString();
 try{storage??=globalThis.localStorage;storage.setItem(SAVE_KEY,JSON.stringify(next));return {save:next,status:'saved',evaluation};}
 catch(err){return {save:next,status:'memory-only',evaluation,error:String(err)};}
}
