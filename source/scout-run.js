import {FONTS} from './fonts.js';
import {STAGES} from './stages.js';
import {challengeCandidates,drawChallengeEnemy} from './challenge-random.js';
import {SCOUT_RARE,scoutMemberKey} from './scout-variant.js';

export const SCOUT_LEGACY_RUN_KEY='tsukuruum.moji-blade.scout-run.v1';
export const SCOUT_PREVIOUS_RUN_KEY='tsukuruum.moji-blade.scout-run.v2';
export const SCOUT_RUN_KEY='tsukuruum.moji-blade.scout-run.v3';
export const SCOUT_BEST_KEY='tsukuruum.moji-blade.scout-best.v1';
const phases=['starter','select','aim','battle','recruit','replace','loss','ended'];
export const memberKey=scoutMemberKey;
export const scoutDifficulty=wins=>wins>=5?'strong':'normal';
const copy=value=>structuredClone(value);
function memberValid(m){return m&&typeof m.id==='string'&&typeof m.glyph==='string'&&m.glyph.length>0&&m.glyph.length<=40&&typeof m.rare==='boolean'&&(m.battleWins===undefined||Number.isSafeInteger(m.battleWins)&&m.battleWins>=0)&&(m.benchBattles===undefined||Number.isSafeInteger(m.benchBattles)&&m.benchBattles>=0)&&Object.hasOwn(FONTS,m.font);}
export function validateScoutRun(value){
 if(!value||value.version!==3||!STAGES.some(s=>s.id===value.stage)||!phases.includes(value.phase)||!Number.isSafeInteger(value.wins)||value.wins<0||!Number.isSafeInteger(value.serial)||value.serial<1)return false;
 if(!Array.isArray(value.party)||value.party.length!==3||value.party.some(m=>m!==null&&!memberValid(m)))return false;
 const members=value.party.filter(Boolean);if(members.reduce((sum,m)=>sum+(m.battleWins||0),0)>value.wins)return false;
 if(new Set(members.map(m=>m.id)).size!==members.length||new Set(members.map(memberKey)).size!==members.length)return false;
 if(value.victories!==undefined&&(!Array.isArray(value.victories)||value.victories.some(v=>!v||typeof v.glyph!=='string'||!v.glyph.length||v.glyph.length>40||!Number.isSafeInteger(v.wins)||v.wins<1||v.rareWins!==undefined&&(!Number.isSafeInteger(v.rareWins)||v.rareWins<0||v.rareWins>v.wins)||v.firstRare!==undefined&&typeof v.firstRare!=='boolean')||new Set(value.victories.map(v=>v.glyph)).size!==value.victories.length||value.victories.reduce((sum,v)=>sum+v.wins,0)>value.wins))return false;
 if(!Array.isArray(value.seen)||value.seen.length>1000000||value.seen.some(k=>typeof k!=='string')||new Set(value.seen).size!==value.seen.length)return false;
 if(value.phase==='starter'||value.phase==='ended'&&value.last===null){
  const choices=Array.isArray(value.starters)&&value.starters.length===3&&value.starters.every(m=>memberValid(m)&&!m.rare)&&new Set(value.starters.map(m=>m.glyph)).size===3&&new Set(value.starters.map(m=>m.id)).size===3;
  const enemy=value.enemy,validEnemy=enemy===null?value.seen.length===0:memberValid(enemy)&&enemy.difficulty==='normal'&&value.seen.length===1&&value.seen[0]===memberKey(enemy)&&choices&&value.starters.every(m=>memberKey(m)!==memberKey(enemy))&&(!enemy.launch||Number.isFinite(enemy.launch.angle)&&Math.abs(enemy.launch.angle)<=Math.PI&&Number.isFinite(enemy.launch.power)&&enemy.launch.power>=0&&enemy.launch.power<=1);
  return choices&&validEnemy&&!members.length&&value.last===null&&value.selected===null&&value.wins===0&&value.started===false&&(value.phase==='starter'||value.endReason==='retired');
 }
 if(members.some(m=>!value.seen.includes(memberKey(m)))||!memberValid(value.last))return false;
 if(value.phase!=='ended'&&!members.length)return false;
 if(value.phase==='ended'&&!['all_lost','retired','exhausted'].includes(value.endReason))return false;
 if(value.enemy?.launch){const launch=value.enemy.launch;if(!Number.isFinite(launch.angle)||Math.abs(launch.angle)>Math.PI||!Number.isFinite(launch.power)||launch.power<0||launch.power>1)return false;}
 if(value.enemy!==null&&(!memberValid(value.enemy)||!value.seen.includes(memberKey(value.enemy))||!['normal','strong'].includes(value.enemy.difficulty)))return false;
 if(['aim','battle','recruit','replace','loss'].includes(value.phase)&&!value.enemy)return false;
 if(['aim','battle'].includes(value.phase)&&!members.some(m=>m.id===value.selected))return false;
 return true;
}
export function createScoutRun(stage='standard',member={glyph:'文',font:'gothic',rare:false}){
 const first={id:'u0',glyph:member.glyph,font:member.font,rare:false};
 return {version:3,stage:STAGES.some(s=>s.id===stage)?stage:'standard',phase:'select',started:false,wins:0,victories:[],serial:1,party:[first,null,null],seen:[memberKey(first)],enemy:null,selected:null,last:copy(first),endReason:null};
}
// Sample only the three candidates and first foe; never instantiate the full catalog.
export async function prepareScoutStart(stage,libraries,random=Math.random,options={}){
 const starters=[],seen=new Set();
 for(let i=0;i<3;i++){
  const candidate=await drawChallengeEnemy(libraries,{seen,random,rare:false,key:member=>member.glyph});
  if(!candidate)throw Error('最初の仲間を準備できませんでした。もう一度お試しください。');
  starters.push({id:'c'+i,...candidate});seen.add(candidate.glyph);
 }
 return prepareScoutStarterEnemy({...createScoutRun(stage),phase:'starter',party:[null,null,null],seen:[],last:null,starters},libraries,random,options);
}
export async function prepareScoutStarterEnemy(run,libraries,random=Math.random,options={}){
 if(run.phase!=='starter'||run.enemy)return run;
 const seed={...createScoutRun(run.stage,run.starters[0]),seen:run.starters.map(memberKey)},encounter=await prepareScoutEnemy(seed,libraries,random,options);
 if(!encounter.enemy)throw Error('最初の仲間を準備できませんでした。もう一度お試しください。');
 return {...run,enemy:encounter.enemy,serial:encounter.serial,seen:[memberKey(encounter.enemy)]};
}
export function chooseScoutStarter(run,index){
 if(run.phase!=='starter'||!run.enemy||!Number.isInteger(index)||index<0||index>2||!run.starters?.[index])return run;
 const next=createScoutRun(run.stage,run.starters[index]);return selectScoutMember({...next,enemy:copy(run.enemy),serial:run.serial,seen:[...next.seen,memberKey(run.enemy)]},0);
}
function upgradeLegacyRun(value){
 if(value?.version===1){
  const next=copy(value),normal=member=>member?{...member,rare:false}:null;
  next.version=2;next.party=next.party.map(normal);next.last=normal(next.last);next.enemy=normal(next.enemy);
  next.seen=next.seen.map(key=>{const pair=JSON.parse(key);if(!Array.isArray(pair)||pair.length!==2)throw Error('Invalid legacy member');return memberKey({glyph:pair[0],font:pair[1],rare:false});});value=next;
 }
 return value?.version===2?{...value,version:3}:value;
}
export function loadScoutRun(storage){
 try{const current=storage?.getItem(SCOUT_RUN_KEY),previous=current==null?storage?.getItem(SCOUT_PREVIOUS_RUN_KEY):null,legacy=current==null,run=upgradeLegacyRun(JSON.parse(current??previous??storage?.getItem(SCOUT_LEGACY_RUN_KEY)??'null'));if(!validateScoutRun(run))return null;
  run.victories??=[];
  if(typeof run.started!=='boolean')run.started=run.wins>0||['battle','recruit','replace','loss','ended'].includes(run.phase);
  if(['aim','battle'].includes(run.phase)){run.phase='select';run.selected=null;}
  if(run.phase==='replace')run.phase='recruit';
  if(legacy&&saveScoutRun(run,storage)&&previous==null)try{storage.removeItem?.(SCOUT_LEGACY_RUN_KEY);}catch{/* Keep a recoverable old copy if removal is denied. */}
  return run;
 }catch{return null;}
}
export function saveScoutRun(run,storage){try{storage.setItem(SCOUT_RUN_KEY,JSON.stringify(run));return true;}catch{return false;}}
export function readScoutBests(storage){
 try{const value=JSON.parse(storage?.getItem(SCOUT_BEST_KEY)||'{}'),out={};for(const s of STAGES)if(Number.isSafeInteger(value[s.id])&&value[s.id]>=0)out[s.id]=value[s.id];return out;}catch{return {};}
}
export function rememberScoutBest(run,storage){
 const best=readScoutBests(storage);best[run.stage]=Math.max(best[run.stage]||0,run.wins);
 try{storage.setItem(SCOUT_BEST_KEY,JSON.stringify(best));return true;}catch{return false;}
}
export function assignScoutEnemy(run,candidate,{allowInitialRare=false}={}){
 if(run.phase!=='select'||run.enemy)return run;
 if(candidate&&(!Object.hasOwn(FONTS,candidate.font)||run.seen.includes(memberKey(candidate))||run.wins===0&&candidate.rare&&!allowInitialRare))return run;
 const next=copy(run);if(!candidate){next.phase='ended';next.endReason='exhausted';return next;}
 next.enemy={id:'e'+next.serial++,glyph:candidate.glyph,font:candidate.font,rare:candidate.rare===true,difficulty:scoutDifficulty(next.wins)};next.seen.push(memberKey(next.enemy));return next;
}
export function scoutRareRoll(run,random=Math.random){return run.wins>0&&random()<SCOUT_RARE.chance;}
export function spawnScoutEnemy(run,pools,random=Math.random){
 if(run.phase!=='select'||run.enemy)return run;
 const rare=scoutRareRoll(run,random),seen=new Set(run.seen);let candidate;
 for(const variant of run.wins>0?[rare,!rare]:[false]){candidate=challengeCandidates(pools,{seen,random,rare:variant,key:memberKey}).next().value;if(candidate)break;}
 return assignScoutEnemy(run,candidate);
}
export async function prepareScoutEnemy(run,libraries,random=Math.random,{forceRare=false}={}){
 if(run.phase!=='select'||run.enemy)return run;
 const rare=forceRare||scoutRareRoll(run,random),seen=new Set(run.seen);let candidate;
 for(const variant of forceRare?[true]:run.wins>0?[rare,!rare]:[false]){candidate=await drawChallengeEnemy(libraries,{seen,random,rare:variant,key:memberKey});if(candidate)break;}
 return assignScoutEnemy(run,candidate,{allowInitialRare:forceRare});
}
export function selectScoutMember(run,index){
 if(run.phase!=='select'||!run.party[index]||!run.enemy)return run;
 const next=copy(run);next.phase='aim';next.selected=next.party[index].id;next.last=copy(next.party[index]);return next;
}
export function chooseInitialScoutMember(run){return run.phase==='select'&&!run.started&&run.wins===0?selectScoutMember(run,0):run;}
export function beginScoutBattle(run){if(run.phase!=='aim')return run;const next=copy(run);next.phase='battle';next.started=true;return next;}
export function reselectScoutMember(run){if(!['aim','loss'].includes(run.phase))return run;const next=copy(run);next.phase='select';next.selected=null;return next;}
export function settleScoutBattle(run,winner){
 if(run.phase!=='battle')return run;
 // Only completed matches advance bench time; keep the buff during the fighter's match.
 const next=copy(run);for(const member of next.party)if(member)member.benchBattles=member.id===next.selected?0:(member.benchBattles||0)+1;
 if(winner===0){next.wins++;const fighter=next.party.find(m=>m?.id===next.selected);if(fighter){fighter.battleWins=(fighter.battleWins||0)+1;next.last=copy(fighter);}next.victories??=[];const record=next.victories.find(v=>v.glyph===next.last.glyph);if(record){record.wins++;if(next.last.rare)record.rareWins=(record.rareWins||0)+1;}else next.victories.push({glyph:next.last.glyph,wins:1,...(next.last.rare?{rareWins:1,firstRare:true}:{})});next.phase='recruit';}
 else{next.party=next.party.map(m=>m?.id===next.selected?null:m);next.phase=next.party.some(Boolean)?'loss':'ended';if(next.phase==='ended')next.endReason='all_lost';}
 next.selected=null;return next;
}
export function scoutRecruitChoice(run,join,index=null){
 if(!['recruit','replace'].includes(run.phase))return run;
 const next=copy(run);
 if(join){const empty=next.party.findIndex(m=>m===null),slot=empty>=0?empty:index;
  if(slot===null){next.phase='replace';return next;}
  if(!Number.isInteger(slot)||slot<0||slot>2)return run;
  next.party[slot]={id:'u'+next.serial++,glyph:next.enemy.glyph,font:next.enemy.font,rare:next.enemy.rare};
 }
 next.phase='select';next.enemy=null;next.selected=null;return next;
}
export function retireScoutRun(run){if(run.phase==='ended')return run;const next=copy(run);next.phase='ended';next.endReason='retired';next.selected=null;return next;}
export function suspendScoutRun(run){const next=copy(run);if(['battle','aim'].includes(next.phase)){next.phase='select';next.selected=null;}if(next.phase==='replace')next.phase='recruit';return next;}
export function scoutStarGlyph(run){
 const victories=run.victories||[];let best=null,tracked=0,runnerUp=0;
 for(const record of victories){tracked+=record.wins;if(!best||record.wins>best.wins){runnerUp=best?.wins||0;best=record;}else runnerUp=Math.max(runnerUp,record.wins);}
 if(!best)return null;
 // Older saves have no per-glyph history. Never invent those wins or claim a
 // leader unless its recorded lead exceeds all untracked wins.
 const untracked=Math.max(0,run.wins-tracked);if(untracked&&best.wins<=runnerUp+untracked)return null;
 return best.glyph;
}
export function scoutStarLabel(run){
 const glyph=scoutStarGlyph(run);if(!glyph)return null;
 const record=run.victories.find(v=>v.glyph===glyph),rareWins=record.rareWins||0,otherWins=record.wins-rareWins;
 const rare=rareWins>otherWins||rareWins===otherWins&&record.firstRare===true;
 return glyph+(rare?'★':'');
}
export function scoutShareText(run,stageName){const star=scoutStarLabel(run);return `文字ブレード スカウトチャレンジ ${stageName}ステージ ${run.wins}連勝！${star?` 「${star}」が大活躍！`:''} #文字ブレード`;}
