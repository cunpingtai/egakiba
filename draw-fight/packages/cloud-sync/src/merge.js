/** R4: pure merge helpers, never treat guest save data as verified leaderboard results. */
export const CLOUD_CAMPAIGN_VERSION = 'campaign-r3a';
export const CAMPAIGN_LEVEL_IDS = Object.freeze(Array.from({length:3},(_,chapter)=>Array.from({length:4},(_,level)=>`${chapter+1}-${level+1}`)).flat());
export function validRecord(rec){
  return rec && Number.isInteger(rec.stars)&&rec.stars>=1&&rec.stars<=3&&
    Number.isInteger(rec.score)&&rec.score>=0&&rec.score<=100000&&
    Number.isInteger(rec.finishedTicks)&&rec.finishedTicks>=0&&rec.finishedTicks<=18000&&
    Number.isFinite(rec.remainingHp)&&rec.remainingHp>=0&&rec.remainingHp<=1000;
}
export function betterRecord(a,b){
  if(!validRecord(a))return validRecord(b)?b:null;
  if(!validRecord(b))return a;
  if(a.stars!==b.stars)return a.stars>b.stars?a:b;
  if(a.score!==b.score)return a.score>b.score?a:b;
  return a.finishedTicks<=b.finishedTicks?a:b;
}
export function mergeCampaign(local,remote){
  const combined={schema:1,campaignVersion:CLOUD_CAMPAIGN_VERSION,records:{},updatedAt:Date.now()};
  const left=local?.campaignVersion===CLOUD_CAMPAIGN_VERSION?local?.records||{}:{};
  const right=remote?.campaignVersion===CLOUD_CAMPAIGN_VERSION?remote?.records||{}:{};
  for(const levelId of CAMPAIGN_LEVEL_IDS){
    const best=betterRecord(left[levelId],right[levelId]);
    if(best)combined.records[levelId]={levelId,stars:best.stars,score:best.score,finishedTicks:best.finishedTicks,remainingHp:best.remainingHp};
  }
  return combined;
}
export function safeFighterId(id){return typeof id==='string' && /^[a-zA-Z0-9_-]{8,100}$/.test(id);}
export function forkId(id,suffix){return `${String(id).slice(0,72)}-fork-${String(suffix).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,16)}`;}
