import {mergeCampaign,forkId} from './merge.js';
/** Non-destructive offline first merge; uploads are per-owner, per-fighter revisions. */
export async function syncAccount({api,repo,progressStore,report=()=>{},now=()=>Date.now()}){
  const me=await api.me(), uid=me.userId;
  const remote=await api.snapshot();const remoteById=new Map(remote.fighters.map(f=>[f.id,f]));
  const locals=await repo.listFighters();let uploaded=0,downloaded=0,conflicts=0;
  for(const item of locals){
    if(!item?.png)continue;
    // Never silently upload a different signed-in person's previously synced art.
    if(item.cloud?.ownerId&&item.cloud.ownerId!==uid){report('skippedOtherAccount',item.id);continue;}
    const synced=item.cloud?.ownerId===uid?item.cloud:null;
    const fromCloud=remoteById.get(item.id),remoteRevision=Number(fromCloud?.revision)||0;
    const localModified=!synced||item.updatedAt>Number(synced.syncedUpdatedAt||0)||!!synced.dirty||!fromCloud;
    if(!localModified&&synced?.revision===remoteRevision)continue;
    if(!localModified&&synced&&fromCloud&&remoteRevision>synced.revision)continue;
    if(fromCloud && (!synced||synced.revision!==remoteRevision)){
      // Preserve BOTH copies: never overwrite another device's changes.
      const suffix=crypto.randomUUID().slice(0,8);
      const copy={...item,id:forkId(item.id,suffix),name:`${item.name||'マイキャラ'} (コピー)`,cloud:null,updatedAt:now()};
      await repo.saveSynced(copy);
      const saved=await api.uploadFighter(copy,0);
      await repo.saveSynced({...copy,cloud:{ownerId:uid,revision:saved.revision,syncedUpdatedAt:copy.updatedAt}});
      uploaded++;conflicts++;report('conflict',copy.id);
      continue;
    }
    try{
      const saved=await api.uploadFighter(item,synced?.revision||0);
      await repo.saveSynced({...item,cloud:{ownerId:uid,revision:saved.revision,syncedUpdatedAt:item.updatedAt}});
      uploaded++;
    }catch(error){
      if(error.status!==409)throw error;
      const copy={...item,id:forkId(item.id,crypto.randomUUID().slice(0,8)),name:`${item.name||'マイキャラ'} (コピー)`,cloud:null,updatedAt:now()};
      const saved=await api.uploadFighter(copy,0);
      await repo.saveSynced({...copy,cloud:{ownerId:uid,revision:saved.revision,syncedUpdatedAt:copy.updatedAt}});
      conflicts++;uploaded++;
    }
  }
  // Refresh manifest after uploads; original remote copy wins its original ID.
  const after=await api.snapshot();
  for(const item of after.fighters){
    const current=await repo.loadFighter(item.id);
    if(current?.cloud?.ownerId && current.cloud.ownerId!==uid){report('skippedOtherAccount',item.id);continue;}
    if(current?.cloud?.ownerId===uid&&current.cloud.revision===item.revision)continue;
    const png=await api.downloadFighter(item.id);
    await repo.saveSynced({id:item.id,name:item.name,revision:1,png,source:'cloud',updatedAt:now(),cloud:{ownerId:uid,revision:item.revision,syncedUpdatedAt:now()}});
    downloaded++;
  }
  const merged=mergeCampaign(progressStore.load(),after.progress);
  progressStore.store(merged);
  await api.pushProgress(merged);
  report('done',{uploaded,downloaded,conflicts});
  return {uploaded,downloaded,conflicts,progress:merged};
}
