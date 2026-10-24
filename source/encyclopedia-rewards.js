import {encyclopediaCategory,ENCYCLOPEDIA_CATEGORIES} from './encyclopedia-catalog.js';
import {applySkinGlyph} from './skin-catalog.js';
import {encyclopediaSummary} from './encyclopedia-store.js';
export const GOLD_SETTINGS_KEY='tsukuruum.moji-blade.encyclopedia-gold.v1';
export function createEncyclopediaRewards({store,catalog,storage,onError=()=>{},availability=null}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const listeners=new Set();
 let enabled=new Set(),rainbow=false,settingsWritable=true;
 try{const raw=storage?.getItem(GOLD_SETTINGS_KEY);if(raw){const value=JSON.parse(raw);if(![1,2].includes(value?.version)||!Array.isArray(value.enabled))throw Error('Unknown reward preferences');enabled=new Set(value.enabled.filter(kind=>ENCYCLOPEDIA_CATEGORIES.includes(kind)));rainbow=value.version===2&&value.rainbow===true;if(rainbow)enabled.clear();}}catch{settingsWritable=false;onError('preferences');}
 // Lightweight test previews may have only an immutable entries object. Real
 // collections persist earned rights in v2 metadata, independently of ON/OFF.
 let localEarned={gold:[],rainbow:false};const earned=()=>store.data?.unlocks||localEarned;
 function grant(gold,all){
  const old=earned(),added=gold.filter(kind=>!old.gold.includes(kind)),newRainbow=all&&!old.rainbow;if(!added.length&&!newRainbow)return;
  if(store.unlockRewards)store.unlockRewards({gold:added,rainbow:newRainbow});
  else localEarned={gold:[...new Set([...old.gold,...added])],rainbow:old.rainbow||all};
  for(const listener of listeners)listener();
 }
 // An old enabled preference proves the reward was earned before the update,
 // even if the new catalog already contains additional characters.
 grant([...enabled],rainbow);
 let candidates=null,known=null,counts=null,unsubscribe=()=>{};const previous=new Map();
 const eligible=glyph=>!availability||availability.has(glyph);
 function reset(){counts=null;previous.clear();}
 function setAvailability(next){unsubscribe();availability=next;unsubscribe=availability?.subscribe(event=>{if(event?.kind==='progress')return;reset();if(availability.ready)init();})||(()=>{});reset();}
 function update(glyph){
  if(!eligible(glyph))return;
  const category=encyclopediaCategory(glyph),present=Object.hasOwn(store.entries,glyph),unlocked=encyclopediaSummary(store.entries[glyph]).unlocked,old=previous.get(glyph)||{present:false,unlocked:false},row=counts.get(category);
  if(!known.has(glyph))row.total+=Number(present)-Number(old.present);
  row.completed+=Number(unlocked)-Number(old.unlocked);
  if(present)previous.set(glyph,{present,unlocked});else previous.delete(glyph);
 }
 function rememberCompletion(){
  if(!counts||availability&&!availability.ready)return;
  const gold=[];let total=0,completed=0;
  for(const [category,row] of counts){total+=row.total;completed+=row.completed;if(row.total>0&&row.completed===row.total)gold.push(category);}
  grant(gold,total>0&&completed===total);
 }
 function init(){if(counts)return;const raw=[...new Set(catalog())];availability?.ensure(raw,{priority:Object.keys(store.entries).sort((a,b)=>Number(encyclopediaSummary(store.entries[b]).unlocked)-Number(encyclopediaSummary(store.entries[a]).unlocked))});candidates=raw.filter(eligible);known=new Set(candidates);counts=new Map(ENCYCLOPEDIA_CATEGORIES.map(key=>[key,{completed:0,total:0}]));for(const glyph of candidates)counts.get(encyclopediaCategory(glyph)).total++;for(const glyph of Object.keys(store.entries))update(glyph);rememberCompletion();}
 store.subscribe?.(glyphs=>{if(counts){for(const glyph of glyphs)update(glyph);rememberCompletion();}});
 function progress(category=''){init();const row=category?counts.get(category):[...counts.values()].reduce((a,b)=>({completed:a.completed+b.completed,total:a.total+b.total}),{completed:0,total:0});return {...row,percent:row.total?row.completed/row.total*100:0};}
 function unlocked(category=''){if(earned().rainbow||category&&earned().gold.includes(category))return true;init();rememberCompletion();return earned().rainbow||Boolean(category&&earned().gold.includes(category));}
 setAvailability(availability);
 return {setAvailability,earned:()=>({gold:[...earned().gold],rainbow:earned().rainbow}),subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},catalog(){init();return candidates;},progress,unlocked,
  active(category=''){return unlocked(category)&&(category?enabled.has(category):rainbow);},
  goldFor(glyph){const category=encyclopediaCategory(glyph);return enabled.has(category)&&unlocked(category);},
  rainbowFor(glyph){return rainbow&&eligible(glyph)&&unlocked();},
  toggle(category=''){
   if(!settingsWritable||!unlocked(category))return false;
   if(category){if(rainbow){rainbow=false;enabled.clear();}if(enabled.has(category))enabled.delete(category);else enabled.add(category);}
   else{rainbow=!rainbow;enabled.clear();}
   try{if(!storage)throw Error('Storage unavailable');storage.setItem(GOLD_SETTINGS_KEY,JSON.stringify({version:2,enabled:[...enabled],rainbow}));}catch{onError('save');}
   return true;
  }
 };
}

// Apply only to a glyph element, keeping stars, badges and unknown/grey states separate.
export function applyGlyphFinish(element,rewards,glyph,eligible=true,side=0){
 if(rewards?.skinFor){const skin=eligible&&glyph?rewards.skinFor(glyph,side):null;applySkinGlyph(element,skin);const finish=skin&&['gold','rainbow'].includes(skin.id)?skin.id:'';if(element)element.dataset.glyphFinish=finish;return finish;}
 applySkinGlyph(element,null);
 const finish=eligible&&glyph?(rewards?.rainbowFor(glyph)?'rainbow':rewards?.goldFor(glyph)?'gold':''):'';
 if(element)element.dataset.glyphFinish=finish;return finish;
}
