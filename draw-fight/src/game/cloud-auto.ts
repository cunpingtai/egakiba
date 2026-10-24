// @ts-nocheck
import { CloudApi } from '../../packages/cloud-sync/src/client.js';
import { syncAccount } from '../../packages/cloud-sync/src/sync.js';
import { listFighters, loadFighter, saveSyncedFighter, loadDraft, saveDraft, cloudMeta, saveCloudMeta } from '../../packages/drawing/src/storage.js';
import { loadProgress, storeProgress } from '../../packages/campaign/src/progress.js';
const api=new CloudApi();let session=null,inFlight=null,callback=null;
const store={getItem:key=>{try{return localStorage.getItem(key);}catch{return null;}},setItem:(key,value)=>{try{localStorage.setItem(key,value);}catch{throw Error('Local progress could not be saved');}}};
const repo={listFighters,loadFighter,saveSynced:saveSyncedFighter};
const progressStore={load:()=>loadProgress(store),store:p=>{if(!storeProgress(store,p))throw Error('Offline progress is not writable');}};
export async function getCloudSession(){try{session=await api.me();return session;}catch{session=null;return null;}}
export function cloudSession(){return session;}
async function syncDraft(){
  if(!session)return {draft:'skipped'};
  const metaId=`draft:${session.userId}`;const meta=await cloudMeta(metaId);
  const local=await loadDraft();const remote=await api.snapshot();const rev=Number(remote.draft?.revision)||0;
  const known=Number(meta?.revision)||0;
  const dirty=!!local?.png && (!meta || (local.updatedAt||0)>(meta?.syncedUpdatedAt||0));
  if(dirty&&rev===known){const uploaded=await api.uploadDraft(local.png,rev);await saveCloudMeta(metaId,{revision:uploaded.revision,syncedUpdatedAt:local.updatedAt});return {draft:'uploaded'};}
  if(rev>0&&(rev!==known||!local?.png)){
    // If a local unsynced draft differs, keep it locally, and tell the user.
    if(dirty)return {draft:'conflict-local-kept'};
    const remoteDraft=await api.downloadDraft();await saveDraft(remoteDraft.png);
    const stored=await loadDraft();await saveCloudMeta(metaId,{revision:remoteDraft.revision,syncedUpdatedAt:stored.updatedAt});return {draft:'downloaded'};
  }
  return {draft:'unchanged'};
}
export async function syncNow(onStatus){
  if(inFlight)return inFlight;
  inFlight=(async()=>{
    if(!session)session=await api.me();
    const result=await syncAccount({api,repo,progressStore,report:(kind,detail)=>onStatus?.(kind,detail)});
    const draft=await syncDraft();const full={...result,...draft,at:Date.now()};
    dispatchEvent(new CustomEvent('rf-cloud-synced',{detail:full}));callback?.(full);return full;
  })().finally(()=>{inFlight=null;});
  return inFlight;
}
export async function initCloudSync(onComplete){callback=onComplete;const me=await getCloudSession();if(me&&navigator.onLine)syncNow().catch(err=>console.warn('Cloud sync on startup failed:',err.message));return me;}
let queued;
export function queueCloudSync(){clearTimeout(queued);queued=setTimeout(()=>{if(session&&navigator.onLine)syncNow().catch(err=>console.warn('Cloud sync queued for later:',err.message));},1000);}
addEventListener('online',()=>queueCloudSync());
export function clearCloudCallback(){callback=null;}
export {api as cloudApi};
