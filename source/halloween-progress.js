import {trackFeature} from './feature-telemetry.js';
export const HALLOWEEN_EVENT=Object.freeze({id:'halloween-2026',start:Date.parse('2026-10-21T00:00:00+09:00'),end:Date.parse('2026-11-09T00:00:00+09:00'),targets:Object.freeze(Array.from('トリックオアー🎃👻魔飴幽')),bossAvailable:true});
export const HALLOWEEN_PROGRESS_KEY='tsukuruum.moji-blade.missions.v1';
export const HALLOWEEN_MISSIONS=Object.freeze([
 {id:'wins',skin:'halloween-2026-dots',target:10,title:'累計10回勝利する'},
 {id:'streak',skin:'halloween-2026-web',target:5,title:'対象の文字のどれかで5連勝'},
 {id:'boss',skin:'halloween-2026-night',target:1,title:'ハロウィンボスバトルに勝利する'},
]);
const fresh=()=>({wins:0,best:0,boss:false,streak:{run:'',glyph:'',wins:0},pending:{},done:[]});
const identifier=x=>typeof x==='string'&&x.length>0&&x.length<=180&&!['__proto__','constructor','prototype'].includes(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
function valid(s){return s&&count(s.wins)&&count(s.best)&&typeof s.boss==='boolean'&&s.streak&&typeof s.streak.run==='string'&&typeof s.streak.glyph==='string'&&count(s.streak.wins)&&s.pending&&Object.keys(s.pending).length<=8&&Object.entries(s.pending).every(([id,m])=>identifier(id)&&m&&['standard','challenge','scout','boss'].includes(m.mode)&&typeof m.glyph==='string'&&typeof m.run==='string')&&Array.isArray(s.done)&&s.done.length<=64&&s.done.every(identifier);}
// A small independent ledger: launches and settled IDs make replays idempotent.
export function createHalloweenProgress({storage,now=Date.now,guard=()=>true,onError=()=>{}}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let root={version:1,events:{}},data=fresh(),writable=true;const listeners=new Set();
 try{const raw=storage?.getItem(HALLOWEEN_PROGRESS_KEY);if(raw){root=JSON.parse(raw);if(root?.version!==1||!root.events||typeof root.events!=='object'||Array.isArray(root.events))throw Error();if(root.events[HALLOWEEN_EVENT.id]){data=root.events[HALLOWEEN_EVENT.id];if(!valid(data))throw Error();}}}catch{writable=false;data=fresh();onError('read');}
 const active=()=>now()>=HALLOWEEN_EVENT.start&&now()<HALLOWEEN_EVENT.end;
 function save(next){if(!writable||!guard()){onError('save');return false;}try{if(!storage)throw Error();const nextRoot={...root,events:{...root.events,[HALLOWEEN_EVENT.id]:next}};storage.setItem(HALLOWEEN_PROGRESS_KEY,JSON.stringify(nextRoot));root=nextRoot;data=next;for(const listener of listeners)listener();return true;}catch{onError('save');return false;}}
 function saveProgress(next,source){const before=HALLOWEEN_MISSIONS.map(m=>api.progress(m.id));if(!save(next))return false;for(const [i,m] of HALLOWEEN_MISSIONS.entries()){const value=api.progress(m.id);if(value===before[i])continue;const values={event_id:HALLOWEEN_EVENT.id,mission_id:m.id,progress_value:value,target_value:m.target,completed:Number(value>=m.target),source_mode:source==='standard'?'vs_com':source};trackFeature('mission_progress',values);if(before[i]<m.target&&value>=m.target)trackFeature('mission_action',{...values,action:'achieved',skin_id:m.skin});}return true;}
 const api={
  active,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  progress(id){return id==='wins'?Math.min(10,data.wins):id==='streak'?Math.min(HALLOWEEN_MISSIONS.find(m=>m.id===id).target,data.best):id==='boss'?Number(data.boss):0;},
  achieved(id){const mission=HALLOWEEN_MISSIONS.find(m=>m.id===id);return Boolean(mission&&api.progress(id)>=mission.target);},
  start({id,mode,glyph='',run=''}){
   if(!active()||!identifier(id)||!['standard','challenge','scout','boss'].includes(mode)||typeof glyph!=='string'||glyph.length>40||typeof run!=='string'||run.length>180||data.done.includes(id))return false;
   if(data.pending[id])return true;
   const pending={...data.pending,[id]:{mode,glyph:glyph.normalize('NFC'),run}};
   for(const old of Object.keys(pending).slice(0,Math.max(0,Object.keys(pending).length-8)))delete pending[old];
   return save({...data,pending});
  },
  settle({id,winner}){
   if(!active()||!identifier(id)||![0,1,null].includes(winner)||!Object.hasOwn(data.pending,id))return false;
   const match=data.pending[id],pending={...data.pending};delete pending[id];let streak={...data.streak},best=data.best;
   if(match.mode==='challenge'&&match.run){
    if(streak.run!==match.run||streak.glyph!==match.glyph)streak={run:match.run,glyph:match.glyph,wins:0};
    streak.wins=winner===0&&HALLOWEEN_EVENT.targets.includes(match.glyph)?Math.min(10,streak.wins+1):0;best=Math.max(best,streak.wins);
   }
   return saveProgress({...data,pending,streak,best,wins:Math.min(10,data.wins+Number(winner===0)),done:[...data.done,id].slice(-64)},match.mode);
  },
  // The boss will call this only after its real battle is implemented and launched.
  bossVictory({cleared=0}={}){if(!HALLOWEEN_EVENT.bossAvailable||!active()||cleared!==5)return false;if(data.boss)return true;return saveProgress({...data,boss:true},'boss');},
  claim(id,skins){const mission=HALLOWEEN_MISSIONS.find(m=>m.id===id);if(!mission||!api.achieved(id)||!guard()||skins.owns(mission.skin))return null;const skin=skins.grant(mission.skin,{mission_id:id});trackFeature('mission_action',{event_id:HALLOWEEN_EVENT.id,mission_id:id,skin_id:mission.skin,action:skin?'claim':'claim_failed',progress_value:api.progress(id),target_value:mission.target,...(!skin?{error_code:'save_failed'}:{})});return skin;}
 };
 return api;
}

// A single boundary timer, refreshed on foreground return by the caller.
export function watchHalloweenPeriod(refresh,{now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer=null,stopped=false;
 const check=()=>{if(stopped)return;if(timer!==null)clearTimer(timer);timer=null;refresh();const time=now(),next=time<HALLOWEEN_EVENT.start?HALLOWEEN_EVENT.start:HALLOWEEN_EVENT.end;if(time<next)timer=setTimer(check,Math.min(next-time+20,2147483647));};
 check();return {refresh:check,dispose(){stopped=true;if(timer!==null)clearTimer(timer);timer=null;}};
}
