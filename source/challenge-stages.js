import {STAGES,DEFAULT_STAGE_ID,getStage} from './stages.js';

const RECORD_KEY='tsukuruum.moji-blade.challenge-records.v1';
function availableStorage(){try{return globalThis.localStorage;}catch{return null;}}
function validRecord(record){
 if(!record||!Number.isSafeInteger(record.wins)||record.wins<0)return null;
 return {wins:record.wins,glyph:typeof record.glyph==='string'?record.glyph:'',font:typeof record.font==='string'?record.font:'gothic'};
}
export function readChallengeRecords(storage=availableStorage()){
 try{
  const value=JSON.parse(storage?.getItem(RECORD_KEY)||'null'),records={};
  // A record without a stage belongs to the original standard arena.
  const legacy=validRecord(value);if(legacy)records[DEFAULT_STAGE_ID]=legacy;
  for(const stage of STAGES){const record=validRecord(value?.[stage.id]);if(record)records[stage.id]=record;}
  return records;
 }catch{return {};}
}
export function rememberChallengeBest(records,stageId,record,storage=availableStorage()){
 const id=getStage(stageId).id,next=validRecord(record);
 if(!next||next.wins<=0||next.wins<=(records[id]?.wins||0))return true;
 records[id]=next;
 try{storage.setItem(RECORD_KEY,JSON.stringify(records));return true;}catch{return false;}
}
export function canChooseChallengeStage(streak,started){return streak===0&&!started;}
