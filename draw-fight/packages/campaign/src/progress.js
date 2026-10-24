import { CAMPAIGN_VERSION, getLevel, LEVELS } from './levels.js';
export const PROGRESS_KEY='rakugaki-v2-campaign-r3';
export const PROGRESS_SCHEMA=1;
/** Scores here are unverified local PVE achievements, not leaderboard entries. */
export function emptyProgress(){return {schema:PROGRESS_SCHEMA,campaignVersion:CAMPAIGN_VERSION,records:{},updatedAt:0};}
function isValidScore(s){return s && Number.isInteger(s.score) && s.score>=0 && s.score<=100000 &&
  Number.isInteger(s.stars) && s.stars>=0 && s.stars<=3 &&
  Number.isInteger(s.finishedTicks) && s.finishedTicks>=0 && s.finishedTicks<=18000 &&
  Number.isFinite(s.remainingHp) && s.remainingHp>=0 && s.remainingHp<=1000;}
export function sanitizeProgress(raw){
  const out=emptyProgress();
  if(!raw||raw.schema!==PROGRESS_SCHEMA||raw.campaignVersion!==CAMPAIGN_VERSION||!raw.records||typeof raw.records!=='object')return out;
  for(const level of LEVELS){const rec=raw.records[level.id];if(!rec||!isValidScore(rec))continue;
    if(rec.stars<1)continue; // Only a win can unlock a new level.
    out.records[level.id]={levelId:level.id,score:rec.score,stars:rec.stars,finishedTicks:rec.finishedTicks,remainingHp:rec.remainingHp};
  }
  out.updatedAt=Number.isSafeInteger(raw.updatedAt)&&raw.updatedAt>=0?raw.updatedAt:0;
  return out;
}
export function isUnlocked(progress,id){const level=getLevel(id);return !!level && (!level.predecessor|| (progress.records[level.predecessor]?.stars??0)>0);}
export function unlockedCount(progress){return LEVELS.filter(x=>isUnlocked(progress,x.id)).length;}
/** Persist only winning attempts. Equal stars retain the better score. */
export function applyResult(progress,score,now=Date.now()){
  const level=getLevel(score?.levelId);
  if(!level||!isUnlocked(progress,level.id)||!isValidScore(score))throw Error('Invalid level result');
  const next=sanitizeProgress(progress),old=next.records[level.id];
  if(score.stars>0 && (!old||score.stars>old.stars||score.stars===old.stars&&score.score>old.score)){
    next.records[level.id]={levelId:level.id,score:score.score,stars:score.stars,finishedTicks:score.finishedTicks,remainingHp:score.remainingHp};
  }
  next.updatedAt=now;
  return next;
}
export function loadProgress(storage){try {return sanitizeProgress(JSON.parse(storage?.getItem(PROGRESS_KEY)||'null'));}catch{return emptyProgress();}}
export function storeProgress(storage,progress){try{storage?.setItem(PROGRESS_KEY,JSON.stringify(sanitizeProgress(progress)));return true;}catch{return false;}}
