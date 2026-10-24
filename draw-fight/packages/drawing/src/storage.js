/** R1-01 offline-first storage: V2 works without an account; V1 records are copied, never deleted. */
const DB_NAME='rakugaki-fighter-v2';
const reqToPromise=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const openDb=(name,version,upgrade)=>new Promise((resolve,reject)=>{
  if(!('indexedDB' in window))return reject(Error('IndexedDB unavailable'));
  const req=indexedDB.open(name,version);req.onupgradeneeded=()=>upgrade(req.result);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function transact(db,store,mode,act){return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);const r=act(tx.objectStore(store));let result; r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}
let dbPromise;
const db=()=>dbPromise||(dbPromise=openDb(DB_NAME,2,d=>{if(!d.objectStoreNames.contains('fighters'))d.createObjectStore('fighters',{keyPath:'id'});if(!d.objectStoreNames.contains('drafts'))d.createObjectStore('drafts',{keyPath:'id'});if(!d.objectStoreNames.contains('cloudMeta'))d.createObjectStore('cloudMeta',{keyPath:'id'});}));
export async function saveFighter(record){const prev=await loadFighter(record.id);return transact(await db(),'fighters','readwrite',s=>s.put({...record,cloud:prev?.cloud?{...prev.cloud,dirty:true}:record.cloud||null}));}
/** Used for applying remote revisions: bypass editing metadata preservation. */
export async function saveSyncedFighter(record){return transact(await db(),'fighters','readwrite',s=>s.put(record));}
export async function cloudMeta(id){return transact(await db(),'cloudMeta','readonly',s=>s.get(id));}
export async function saveCloudMeta(id,data){return transact(await db(),'cloudMeta','readwrite',s=>s.put({id,...data}));}
export async function loadFighter(id){return transact(await db(),'fighters','readonly',s=>s.get(id));}
export async function listFighters(){return (await transact(await db(),'fighters','readonly',s=>s.getAll())).sort((a,b)=>b.updatedAt-a.updatedAt);}
export async function saveDraft(png){return transact(await db(),'drafts','readwrite',s=>s.put({id:'current',png,updatedAt:Date.now()}));}
export async function loadDraft(){return transact(await db(),'drafts','readonly',s=>s.get('current'));}
export async function migrateLegacy(){
  let legacy;
  try{legacy=await openDb('rakugakiFighter',1, d=>{if(!d.objectStoreNames.contains('library'))d.createObjectStore('library',{keyPath:'id'});});}
  catch{return {count:0,available:false};}
  try{
    if(!legacy.objectStoreNames.contains('library'))return {count:0,available:true};
    const rows=await transact(legacy,'library','readonly',s=>s.getAll());let count=0;
    for(const item of rows){if(!item.png)continue;const id='legacy-'+String(item.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,72);
      const existing=await loadFighter(id);if(existing)continue;
      await saveFighter({id,name:'むかしのラクガキ',png:new Blob([item.png],{type:'image/png'}),updatedAt:item.t||Date.now(),source:'legacy',revision:1});count++;
    }
    return {count,available:true};
  }finally{legacy.close();}
}
export async function blobToImage(blob){const url=URL.createObjectURL(blob);try{const im=new Image();im.src=url;await im.decode();return im;}finally{URL.revokeObjectURL(url);}}
