import {ENCYCLOPEDIA_KEY,loadEncyclopedia,decodeEncyclopedia,createEncyclopediaStore} from './encyclopedia-store.js';
const copy=value=>JSON.parse(JSON.stringify(value));
import {ENCYCLOPEDIA_VERSION,PACKED_V1_FIELDS as COUNT_FIELDS} from './encyclopedia-schema.js';
// Compact on disk; keep descriptive objects in the gameplay/store interface.
export function packEncyclopediaEntry(entry){return Array.isArray(entry)?entry:[1,entry.order,Object.entries(entry.variants).map(([key,counts])=>[key,COUNT_FIELDS.map(field=>counts[field])])];}
export function unpackEncyclopediaEntry(entry){if(!Array.isArray(entry))return entry;if(entry[0]!==1||entry.length!==3)throw Error('Unknown entry encoding');return {order:entry[1],variants:Object.fromEntries(entry[2].map(([key,counts])=>[key,Object.fromEntries(COUNT_FIELDS.map((field,i)=>[field,counts[i]]))]))};}
const stateOf=data=>{const {entries,...state}=data;return copy(state);};
function requestValue(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=transaction.onabort=()=>reject(transaction.error||Error('Transaction aborted'));});}
async function indexedRepository(namespace){
 if(typeof indexedDB==='undefined')return null;
 const db=await new Promise(resolve=>{
  let abandoned=false;const timer=setTimeout(()=>{abandoned=true;resolve(null);},15000);
  try{const request=indexedDB.open('tsukuruum.moji-blade.encyclopedia'+(namespace?'.'+namespace:''),1);
   request.onupgradeneeded=()=>{request.result.createObjectStore('entries');request.result.createObjectStore('meta');};
   request.onerror=request.onblocked=()=>{clearTimeout(timer);abandoned=true;resolve(null);};request.onsuccess=()=>{clearTimeout(timer);if(abandoned)request.result.close();else resolve(request.result);};
  }catch{clearTimeout(timer);resolve(null);}
 });
 if(!db)return null;db.onversionchange=()=>db.close();
 return {
  async read(){const transaction=db.transaction(['entries','meta']);const done=transactionDone(transaction),rows=requestValue(transaction.objectStore('entries').getAll()),meta=requestValue(transaction.objectStore('meta').get('state'));const [entries,state]=await Promise.all([rows,meta,done]);return state?{...state,entries}:null;},
  close:()=>db.close(),
  async write(snapshot){const transaction=db.transaction(['entries','meta'],'readwrite'),done=transactionDone(transaction),entries=transaction.objectStore('entries');
   for(const [glyph,entry] of snapshot.entries){if(entry===null)entries.delete(glyph);else entries.put([glyph,packEncyclopediaEntry(entry)],glyph);}
   transaction.objectStore('meta').put({revision:snapshot.revision,state:snapshot.state},'state');await done;
  },
 };
}
const DATABASE_USED_KEY=ENCYCLOPEDIA_KEY+'.database-used';
export class EncyclopediaReadError extends Error{constructor(code='read-unavailable'){super('Collection storage is temporarily unavailable');this.code=code;}}
const FALLBACK_KEY=ENCYCLOPEDIA_KEY+'.fallback.v1';
function readFallback(storage,onError,strictRead=false){
 try{const value=JSON.parse(storage?.getItem(FALLBACK_KEY)||'null');if(!value)return null;
  if(strictRead&&(value.version>1||value.state?.version>ENCYCLOPEDIA_VERSION))throw new EncyclopediaReadError('newer-version');
  if(value.version!==1||typeof value.id!=='string'||!Array.isArray(value.rows)||!Array.isArray(value.operations))throw Error('Invalid fallback');
  const checked=decodeEncyclopedia({...value.state,entries:Object.fromEntries(value.rows.map(([g,e])=>[g,unpackEncyclopediaEntry(e)]))});if(checked.invalid){if(strictRead)throw new EncyclopediaReadError(checked.reason);throw Error('Invalid fallback');}return {...value,data:checked.data};
 }catch(error){if(strictRead)throw error instanceof EncyclopediaReadError?error:new EncyclopediaReadError();onError('invalid');return null;}
}
function localFallback(storage,onError,strictRead=false){
 const restored=readFallback(storage,onError,strictRead),legacy=loadEncyclopedia(storage),id=restored?.id||(globalThis.crypto?.randomUUID?.()||'fallback-'+Date.now()+'-'+Math.random()),operations=restored?.operations||[];
 if(legacy.invalid&&!restored){onError('invalid');if(strictRead)throw new EncyclopediaReadError(legacy.reason);}
 const initialData=restored?.data||legacy.data;
 const adapter={save(data,changed,operation){if(operation)operations.push(copy(operation));const value={version:1,id,state:stateOf(data),rows:Object.entries(data.entries).map(([g,e])=>[g,packEncyclopediaEntry(e)]),operations};if(!storage)throw Error('Storage unavailable');storage.setItem(FALLBACK_KEY,JSON.stringify(value));return true;},flush:async()=>true,close:async()=>{}};
 return {storage:adapter,initialData,backend:'localStorage'};
}
function replayFallback(data,fallback){
 if(!fallback||data.fallbackReceipt===fallback.id)return {data,changed:[]};
 const changed=new Set(),store=createEncyclopediaStore({initialData:copy(data),storage:{save:(current,glyphs)=>glyphs.forEach(g=>changed.add(g))}});
 for(const op of fallback.operations){
  if(op.type==='prepare')store.prepare(op);else if(op.type==='start')store.start(op.id);else if(op.type==='settle')store.settle(op);else if(op.type==='recruit')store.recruit(op);else if(op.type==='abandon')store.abandon(op.id);else if(op.type==='unlock')store.unlockRewards(op);else if(op.type==='review')store.reviewGlyphs(op.glyphs);else throw Error('Unknown fallback operation');
 }
 store.data.fallbackReceipt=fallback.id;return {data:store.data,changed:[...changed]};
}
export async function openEncyclopediaPersistence({storage,namespace='',onError=()=>{},repository,strictRead=false,readTimeoutMs=15000,guard=()=>true}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const check=()=>{if(!guard())throw Error('Game session ownership lost');};check();
 const repo=repository===undefined?await indexedRepository(namespace):repository;
 const useFallback=()=>{let used=false;try{used=storage?.getItem(DATABASE_USED_KEY)==='1';}catch{}if(strictRead&&(used||repository!==undefined||typeof indexedDB!=='undefined'))throw new EncyclopediaReadError();onError('temporary');return localFallback(storage,onError,strictRead);};
 if(!repo){const result=useFallback(),save=result.storage.save;result.storage.save=(...args)=>{check();return save(...args);};return result;}
 const journalKey=ENCYCLOPEDIA_KEY+'.journal';let stored;
 let readTimer;try{stored=await Promise.race([repo.read(),new Promise((resolve,reject)=>{readTimer=setTimeout(()=>reject(Error('Read timed out')),readTimeoutMs);})]);}catch{repo.close?.();if(strictRead)throw new EncyclopediaReadError();return useFallback();}finally{clearTimeout(readTimer);}
 let entries;try{entries=Object.fromEntries((stored?.entries||[]).map(([glyph,entry])=>[glyph,unpackEncyclopediaEntry(entry)]));}catch{repo.close?.();onError('invalid');if(strictRead)throw new EncyclopediaReadError();return useFallback();}
 const base=stored?decodeEncyclopedia({...stored.state,entries}):loadEncyclopedia(storage);
 if(stored&&(base.invalid||!Number.isSafeInteger(stored.revision)||stored.revision<0)){repo.close?.();onError('invalid');if(strictRead)throw new EncyclopediaReadError(base.reason==='newer-version'?'newer-version':undefined);return useFallback();}
 if(base.invalid){onError('invalid');if(strictRead){repo.close?.();throw new EncyclopediaReadError(base.reason==='newer-version'?'newer-version':undefined);}}let fallback;try{fallback=readFallback(storage,onError,strictRead);}catch(error){repo.close?.();throw error;}let data=base.data,revision=stored?.revision||0,journal=null,initialCommitFailed=false,replayed=false,journalRecovered=false;
 try{journal=JSON.parse(storage?.getItem(journalKey)||'null');}catch{onError('invalid');}
 if(strictRead&&journal&&(journal.version>1||journal.state?.version>ENCYCLOPEDIA_VERSION)){repo.close?.();throw new EncyclopediaReadError('newer-version');}
 if(journal?.version===1&&Number.isSafeInteger(journal.revision)&&journal.revision>revision&&Array.isArray(journal.entries)){
  try{
   const recovered={...journal.state,entries:{...data.entries}};
   for(const row of journal.entries){if(!Array.isArray(row)||typeof row[0]!=='string')throw Error('Invalid journal entry');if(row[1]===null)delete recovered.entries[row[0]];else Object.defineProperty(recovered.entries,row[0],{value:unpackEncyclopediaEntry(row[1]),enumerable:true,writable:true,configurable:true});}
   const checked=decodeEncyclopedia(recovered);if(checked.invalid)throw Error('Invalid journal');data=checked.data;revision=journal.revision;journalRecovered=true;
  }catch{onError('invalid');}
 }
 // Replay only fallback operations into the old DB, never add whole counter snapshots.
 // A single atomic commit plus its receipt makes recovery safe across another crash.
 if(fallback){try{if(!stored){data=fallback.data;data.fallbackReceipt=fallback.id;}else{data=replayFallback(data,fallback).data;}if(data.fallbackReceipt===fallback.id){revision++;replayed=true;}}catch{onError('invalid');}}
 // Compare the original revision against the journal BEFORE reserving a new
 // migration revision, otherwise a v1 journal at DB revision + 1 gets skipped.
 if(stored&&base.migrated&&revision===stored.revision)revision++;
 // Migration and journal recovery commit atomically before gameplay can record.
 try{
  check();if(!stored||revision>stored.revision){
   // v1/v2 -> current adds metadata only; retain the existing packed glyph rows.
   const metadataOnly=stored&&base.migrated&&!journalRecovered&&!replayed;
   await repo.write({revision,state:stateOf(data),entries:metadataOnly?[]:Object.entries(data.entries)});
  }
  try{storage?.setItem(DATABASE_USED_KEY,'1');storage?.removeItem(journalKey);storage?.removeItem(ENCYCLOPEDIA_KEY);if(replayed)storage?.removeItem(FALLBACK_KEY);}catch{}
 }catch{initialCommitFailed=true;onError('save');}
 let queue=Promise.resolve(true),pending=new Map(initialCommitFailed?Object.entries(data.entries).map(([glyph,entry])=>[glyph,packEncyclopediaEntry(entry)]):[]);
 const adapter={
  save(current,changed){
   check();
   for(const glyph of changed)pending.set(glyph,current.entries[glyph]?packEncyclopediaEntry(current.entries[glyph]):null);
   const snapshot={version:1,revision:++revision,state:stateOf(current),entries:[...pending]};let journalSaved=false;
   try{if(storage){storage.setItem(journalKey,JSON.stringify(snapshot));journalSaved=true;}}catch{}
   const commit=async()=>{try{check();await repo.write(snapshot);if(snapshot.revision===revision){pending.clear();try{storage?.setItem(DATABASE_USED_KEY,'1');storage?.removeItem(journalKey);storage?.removeItem(ENCYCLOPEDIA_KEY);if(replayed)storage?.removeItem(FALLBACK_KEY);}catch{}}return true;}catch{if(!journalSaved)onError('save');return false;}};
   queue=queue.then(commit,commit);return true;
  },
  flush:()=>queue,
  async close(){await queue;repo.close?.();},
 };
 return {storage:adapter,initialData:data,backend:'indexedDB'};
}
