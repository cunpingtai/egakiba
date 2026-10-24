// Separate, local-only collection. Match IDs are supplied by the caller so a
// resumed Scout trial and its reward remain idempotent across process restarts.
import {FONTS} from './fonts.js';
import {ENCYCLOPEDIA_VERSION,PACKED_V1_FIELDS,savedIdentifier,migrateEncyclopedia} from './encyclopedia-schema.js';
export const ENCYCLOPEDIA_KEY='tsukuruum.moji-blade.encyclopedia.v1';
const MODES=new Set(['standard','challenge','scout','online','local']);
const fields=PACKED_V1_FIELDS;
const emptyCounts=()=>Object.fromEntries(fields.map(key=>[key,0]));
const fresh=()=>({version:ENCYCLOPEDIA_VERSION,sequence:0,entries:{},pending:{},receipts:{},unread:[],unlocks:{gold:[],rainbow:false}});
const own=(object,key)=>Object.hasOwn(object,key);
export const variantKey=member=>`${member.font}:${member.rare===true?'rare':'normal'}`;
function member(value){
 if(!value||typeof value.glyph!=='string'||!value.glyph.length||value.glyph.length>40||!own(FONTS,value.font)||!savedIdentifier(value.font))return null;
 return {glyph:value.glyph.normalize('NFC'),font:value.font,rare:value.rare===true};
}
function savedMember(value){return value&&typeof value.glyph==='string'&&value.glyph.length>0&&value.glyph.length<=40&&savedIdentifier(value.font);}
function counts(value){return value&&fields.every(key=>Number.isSafeInteger(value[key])&&value[key]>=0);}
export function loadEncyclopedia(storage){
 try{const raw=storage?.getItem(ENCYCLOPEDIA_KEY);return raw?decodeEncyclopedia(JSON.parse(raw)):{data:fresh(),invalid:false};}catch{return {data:fresh(),invalid:true};}
}
export function decodeEncyclopedia(value){
 try{
  const migration=migrateEncyclopedia(value);value=migration.data;
  if(value?.version!==ENCYCLOPEDIA_VERSION||!Number.isSafeInteger(value.sequence)||value.sequence<0||!value.entries||!value.pending||!value.receipts)throw Error('Invalid collection');
  for(const [glyph,entry] of Object.entries(value.entries)){
   if(!glyph.length||glyph.length>40||!Number.isSafeInteger(entry.order)||entry.order<1||entry.order>value.sequence||!entry.variants)throw Error('Invalid entry');
   for(const [key,record] of Object.entries(entry.variants))if(!/^[a-z][a-z0-9_-]{0,63}:(normal|rare)$/.test(key)||!counts(record))throw Error('Invalid counts');
  }
  for(const trial of Object.values(value.pending))if(!MODES.has(trial.mode)||!savedMember(trial.player)||!savedMember(trial.enemy)||typeof trial.started!=='boolean')throw Error('Invalid trial');
  for(const receipt of Object.values(value.receipts))if(!receipt||typeof receipt.recruited!=='boolean')throw Error('Invalid receipt');
  if(!Array.isArray(value.unread)||value.unread.some(glyph=>typeof glyph!=='string'||!own(value.entries,glyph)||!encyclopediaSummary(value.entries[glyph]).unlocked)||new Set(value.unread).size!==value.unread.length)throw Error('Invalid unread glyphs');
  if(!value.unlocks||!Array.isArray(value.unlocks.gold)||!value.unlocks.gold.every(savedIdentifier)||typeof value.unlocks.rainbow!=='boolean')throw Error('Invalid unlocks');
  return {data:value,invalid:false,migrated:migration.migrated};
 }catch(error){return {data:fresh(),invalid:true,reason:error.code||'invalid'};}
}
const summaryCache=new WeakMap();
export function encyclopediaSummary(entry){
 if(entry&&summaryCache.has(entry))return summaryCache.get(entry);
 const total=emptyCounts();let rareDefeated=false;
 for(const [key,c] of Object.entries(entry?.variants||{})){for(const field of fields)total[field]+=c[field];if(key.endsWith(':rare')&&c.defeated>0)rareDefeated=true;}
 const summary=Object.freeze({...total,seen:total.uses+total.encounters>0,unlocked:total.wins+total.defeated>0,rareDefeated,order:entry?.order||0});if(entry)summaryCache.set(entry,summary);return summary;
}
export function encyclopediaStats(entry,font='gothic',rare=false){
 const c={...emptyCounts(),...entry?.variants?.[variantKey({font,rare})]},finished=c.wins+c.losses+c.draws;
 return {...c,winRate:finished?c.wins/finished:null};
}
export function createEncyclopediaStore({storage,initialData,onError=()=>{}}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const loaded=initialData?decodeEncyclopedia(initialData):loadEncyclopedia(storage);let data=loaded.data;const unread=new Set(data.unread),dirty=new Set(),listeners=new Set();
 if(loaded.invalid)onError('invalid');
 function persist(operation=null){
  const changed=[...dirty];let saved=false;
  try{if(loaded.invalid||!storage)throw Error('Storage unavailable');if(storage.save)storage.save(data,changed,operation);else storage.setItem(ENCYCLOPEDIA_KEY,JSON.stringify(data));dirty.clear();saved=true;}catch{onError('save');}
  // Listeners may persist earned rewards. Notify only after capturing this save
  // so a nested metadata update cannot consume the match's dirty glyphs/log.
  for(const listener of listeners)try{listener(changed);}catch{}
  return saved;
 }
 function adjust(unit,field,amount){
  dirty.add(unit.glyph);
  if(!own(data.entries,unit.glyph))Object.defineProperty(data.entries,unit.glyph,{value:{order:++data.sequence,variants:{}},enumerable:true,configurable:true,writable:true});
  const entry=data.entries[unit.glyph],key=variantKey(unit);summaryCache.delete(entry);
  entry.variants[key]||=emptyCounts();entry.variants[key][field]=Math.max(0,entry.variants[key][field]+amount);
  if(fields.every(f=>entry.variants[key][f]===0))delete entry.variants[key];
  if(!Object.keys(entry.variants).length)delete data.entries[unit.glyph];
 }
 function receipt(id,extra={}){
  Object.defineProperty(data.receipts,id,{value:{recruited:false,...extra},enumerable:true,configurable:true,writable:true});
  if(extra.mode==='scout')data.scoutReceipt=id;
  // The active Scout may replay its last join after many skipped opponents.
  const latestRecruit=Object.keys(data.receipts).findLast(key=>data.receipts[key].recruited);
  const ids=Object.keys(data.receipts).filter(key=>key!==data.scoutReceipt&&key!==latestRecruit);for(const old of ids.slice(0,Math.max(0,ids.length-256)))delete data.receipts[old];
 }
 const api={
  unlockRewards({gold=[],rainbow=false}={}){
   if(!Array.isArray(gold)||!gold.every(savedIdentifier)||typeof rainbow!=='boolean')return false;
   const added=gold.filter(kind=>!data.unlocks.gold.includes(kind)),newRainbow=rainbow&&!data.unlocks.rainbow;
   if(!added.length&&!newRainbow)return false;
   data.unlocks={gold:[...new Set([...data.unlocks.gold,...added])],rainbow:data.unlocks.rainbow||rainbow};
   persist({type:'unlock',gold:added,rainbow:newRainbow});return true;
  },
  isUnread(glyph){return unread.has(glyph);},
  reviewGlyphs(glyphs){
   const reviewed=[...new Set(glyphs)].filter(glyph=>unread.has(glyph));if(!reviewed.length)return false;
   for(const glyph of reviewed)unread.delete(glyph);data.unread=[...unread];persist({type:'review',glyphs:reviewed});return true;
  },
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  get data(){return data;},get entries(){return data.entries;},get pending(){return data.pending;},
  prepare({id,mode,player,enemy}){
   player=member(player);enemy=member(enemy);
   if(typeof id!=='string'||!id||id.length>180||!MODES.has(mode)||!player||!enemy||own(data.receipts,id))return false;
   const previous=own(data.pending,id)?data.pending[id]:null;
   const same=(a,b)=>a.glyph===b.glyph&&variantKey(a)===variantKey(b);
   if(previous&&previous.mode===mode&&same(previous.player,player)&&same(previous.enemy,enemy))return true;
   const involved=[player,enemy,...(previous?[previous.player,previous.enemy]:[])];
   const orders=new Map(involved.filter(unit=>own(data.entries,unit.glyph)).map(unit=>[unit.glyph,data.entries[unit.glyph].order]));
   // Reverse this trial only; old wins and earlier discovery remain intact.
   if(previous){adjust(previous.player,'uses',-1);adjust(previous.enemy,'encounters',-1);if(previous.mode==='local'){adjust(previous.enemy,'uses',-1);adjust(previous.player,'encounters',-1);}}
   adjust(player,'uses',1);adjust(enemy,'encounters',1);if(mode==='local'){adjust(enemy,'uses',1);adjust(player,'encounters',1);}
   for(const unit of [player,enemy])if(orders.has(unit.glyph))data.entries[unit.glyph].order=orders.get(unit.glyph);
   Object.defineProperty(data.pending,id,{value:{mode,player,enemy,started:false},enumerable:true,configurable:true,writable:true});
   persist({type:'prepare',id,mode,player,enemy});return true;
  },
  start(id){const trial=own(data.pending,id)?data.pending[id]:null;if(!trial)return false;trial.started=true;persist({type:'start',id});return true;},
  settle({id,winner,mode,player,enemy}){
   if(own(data.receipts,id)||![0,1,null].includes(winner))return false;
   // Scout saves the result envelope before notification. Recover a missing
   // preparation if a previous storage write failed, without replaying history.
   if(!own(data.pending,id)&&!api.prepare({id,mode,player,enemy}))return false;
   const trial=data.pending[id],wasUnlocked=new Map([trial.player,trial.enemy].map(unit=>[unit.glyph,encyclopediaSummary(data.entries[unit.glyph]).unlocked]));adjust(trial.player,winner===0?'wins':winner===1?'losses':'draws',1);
   adjust(trial.enemy,winner===0?'defeated':winner===1?'lostTo':'enemyDraws',1);
   if(trial.mode==='local'){adjust(trial.enemy,winner===1?'wins':winner===0?'losses':'draws',1);adjust(trial.player,winner===1?'defeated':winner===0?'lostTo':'enemyDraws',1);}
   for(const [glyph,before] of wasUnlocked)if(!before&&encyclopediaSummary(data.entries[glyph]).unlocked)unread.add(glyph);data.unread=[...unread];
   delete data.pending[id];receipt(id,{mode:trial.mode});persist({type:'settle',id,winner});return true;
  },
  recruit({id,unit,starter=false}){
   unit=member(unit);if(!unit||typeof id!=='string'||!id||id.length>180||starter&&(!id.endsWith(':starter')||unit.rare))return false;
   if(!own(data.receipts,id)){if(!starter)return false;receipt(id,{mode:'scout'});}
   if(data.receipts[id].recruited)return false;
   adjust(unit,'recruits',1);data.receipts[id].recruited=true;persist({type:'recruit',id,unit,...(starter?{starter:true}:{})});return true;
  },
  abandon(id){if(!own(data.pending,id))return;delete data.pending[id];receipt(id);persist({type:'abandon',id});},
 };
 // Browser reloads cannot resume an ordinary physics match. Preserve its
 // counts, but retire the stale preparation transaction. Scout can resume it.
 for(const [id,trial] of Object.entries(data.pending))if(['standard','challenge','local'].includes(trial.mode))api.abandon(id);
 return api;
}
export function encyclopediaMatchId(){return globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;}
