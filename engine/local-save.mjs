/** R3 guest save: separate namespace, defensive parse, no V2 writes. */
export const SAVE_KEY='moji-blade.v3.r3.local-save.v1';
export const SAVE_SCHEMA=1;
export function emptySave(){return {schema:1,revision:0,progress:{},battleCount:0,lastGlyph:'文',lastFont:'gothic',updatedAt:null};}
export function validateSave(obj){
 if(!obj||obj.schema!==SAVE_SCHEMA||!Number.isInteger(obj.revision)||obj.revision<0||typeof obj.progress!=='object'||!obj.progress||Array.isArray(obj.progress))throw new Error('Incompatible save schema');
 const clean=emptySave();clean.revision=obj.revision;clean.battleCount=Math.max(0,Math.floor(Number(obj.battleCount)||0));
 clean.lastGlyph=typeof obj.lastGlyph==='string'?obj.lastGlyph.slice(0,12):'文';clean.lastFont=['gothic','mincho','pop','gyosho'].includes(obj.lastFont)?obj.lastFont:'gothic';
 for(const [k,v] of Object.entries(obj.progress))if(/^\d\d-\d\d$/.test(k)&&v&&Number.isInteger(v.stars)&&v.stars>=1&&v.stars<=3&&Number.isFinite(v.bestSeconds)&&v.bestSeconds>0)clean.progress[k]={stars:v.stars,bestSeconds:v.bestSeconds};
 clean.updatedAt=typeof obj.updatedAt==='string'?obj.updatedAt:null;return clean;
}
export function loadSave(storage){try{storage ??= globalThis.localStorage;const raw=storage.getItem(SAVE_KEY);return raw?{save:validateSave(JSON.parse(raw)),status:'loaded'}:{save:emptySave(),status:'new'};}catch(e){return {save:emptySave(),status:'unavailable',error:String(e)};}}
export function commitBattle(save,{levelId='01-01',result,glyph='文',font='gothic'}={},storage){
 const next=validateSave(save);if(!result||typeof result.durationSeconds!=='number')throw new Error('Missing battle result');
 next.revision++;next.battleCount++;next.lastGlyph=glyph;next.lastFont=font;
 if(levelId==='01-01'&&result.winner===0){
  const hpRatio=result.hp[0]/Math.max(1,Number(result.playerMaxHp)||1);
  const stars=1+(hpRatio>=.6?1:0)+(result.durationSeconds<=12?1:0);
  const previous=next.progress[levelId];next.progress[levelId]={stars:Math.max(previous?.stars||0,stars),bestSeconds:Math.min(previous?.bestSeconds||Infinity,result.durationSeconds)};
 }
 next.updatedAt=new Date().toISOString();try{storage ??= globalThis.localStorage;storage.setItem(SAVE_KEY,JSON.stringify(next));return {save:next,status:'saved'};}catch(e){return {save:next,status:'memory-only',error:String(e)};}
}
