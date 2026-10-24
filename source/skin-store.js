import {trackFeature} from './feature-telemetry.js';
import {BASIC_SKINS,REWARD_SKINS,EVENT_SKINS,skinById,rewardSkin} from './skin-catalog.js';
import {isDeviceDependentCharacter} from './glyph-emoji.js';
import {GOLD_SETTINGS_KEY} from './encyclopedia-rewards.js';
export const SKIN_STORAGE_KEY='tsukuruum.moji-blade.skins.v1';
// A small independent inventory. No catalog scan, glyph geometry or battle data.
export function createSkinStore({rewards,storage,onError=()=>{}}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let state={version:1,selected:'blue',owned:[]},writable=true;const listeners=new Set();
 const earned=()=>rewards.earned?.()||{gold:[],rainbow:false};
 const emit=()=>{for(const listener of listeners)listener();};
 function save(next){
  if(!writable){onError('preferences');return false;}
  try{if(!storage)throw Error('Storage unavailable');storage.setItem(SKIN_STORAGE_KEY,JSON.stringify(next));state=next;emit();return true;}
  catch{onError('save');return false;}
 }
 try{
  const raw=storage?.getItem(SKIN_STORAGE_KEY);
  if(raw){const parsed=JSON.parse(raw);if(parsed?.version!==1||typeof parsed.selected!=='string'||!Array.isArray(parsed.owned)||parsed.owned.some(id=>typeof id!=='string'))throw Error('Unsupported skins');state={...parsed,owned:[...new Set(parsed.owned)]};}
  else{
   const rights=earned(),old=JSON.parse(storage?.getItem(GOLD_SETTINGS_KEY)||'null');
   // Previously earned gold remains usable, even if its original category was
   // not kanji. Existing completed categories also keep their new rewards.
   if(rights.gold.length)state.owned.push('gold');
   for(const category of rights.gold){const reward=rewardSkin(category);if(reward&&!state.owned.includes(reward.id))state.owned.push(reward.id);}
   if(rights.rainbow)state.owned.push('rainbow');
   if(old?.rainbow&&state.owned.includes('rainbow'))state.selected='rainbow';
   else if(old?.enabled?.length&&state.owned.includes('gold'))state.selected='gold';
   // Persist the migration marker even with an empty inventory. Rewards earned
   // after installing this version must be claimed rather than auto-granted.
   save(state);
  }
 }catch{writable=false;onError('preferences');}
 const owns=id=>BASIC_SKINS.some(s=>s.id===id)||state.owned.includes(id);
 // Preserve a close equivalent for colours from the unreleased palette draft.
 const selected=(side=0)=>{const stored=side===1?state.selected2:state.selected,id=({lavender:'violet',leaf:'lime',emerald:'green'})[stored]||stored;return owns(id)&&skinById(id)||skinById(side===1?'red':'blue');};
 const pending=()=>REWARD_SKINS.filter(s=>!owns(s.id)&&(s.category?earned().gold.includes(s.category):earned().rainbow));
 rewards.subscribe?.(emit);
 return {
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  selected,skinFor(char,side=0){return char&&!isDeviceDependentCharacter(char)?selected(side):null;},
  // Catalog order is the stable display order; receipt order stays in save data.
  list(){return [...BASIC_SKINS,...[...REWARD_SKINS,...EVENT_SKINS].filter(s=>owns(s.id))];},
  owns,pending,claimable(category=''){return pending().some(s=>s.category===category);},
  claimed(category=''){return owns(rewardSkin(category)?.id);},
  select(id,side=0){if(!skinById(id)||!owns(id))return false;const key=side===1?'selected2':'selected',before=selected(side).id;if(id===state[key])return true;const ok=save({...state,[key]:id});if(ok&&before!==id)trackFeature('skin_selected',{skin_id:id,previous_skin_id:before,target:side===1?'p2':'p1',source:'picker'});else if(!ok)trackFeature('skin_action',{action:'select_failed',skin_id:id,target:side===1?'p2':'p1',error_code:'save_failed'});return ok;},
  grant(id,context={}){const skin=EVENT_SKINS.find(s=>s.id===id);if(!skin||owns(id))return null;const ok=save({...state,owned:[...state.owned,id]});trackFeature(ok?'skin_acquired':'skin_action',{skin_id:id,source:'mission',event_id:skin.source,mission_id:context.mission_id,...(!ok?{action:'acquire_failed',error_code:'save_failed'}:{})});return ok?skin:null;},
  claim(category=''){const skin=rewardSkin(category);if(!skin||!pending().some(s=>s.id===skin.id))return null;const ok=save({...state,owned:[...state.owned,skin.id]});trackFeature(ok?'skin_acquired':'skin_action',{skin_id:skin.id,source:'collection',category,...(!ok?{action:'acquire_failed',error_code:'save_failed'}:{})});return ok?skin:null;}
 };
}
