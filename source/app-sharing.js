// The native save acknowledges a completed write. Browser downloads can only acknowledge a request.
export const IMAGE_CHUNK_SIZE=24576;
export const MAX_IMAGE_BASE64=12*1024*1024;
export function createResultSharing(host=globalThis){
 const native=false;
 const pending=new Map();let sequence=0;
 const request=(action,values,image)=>new Promise(resolve=>{
  const id='share_'+Date.now().toString(36)+'_'+(++sequence);
  const timer=host.setTimeout(()=>finish(id,'failure','timeout'),120000);
  pending.set(id,{resolve,timer,image});
  try{host.location.href=`uniwebview://moji-${action}?`+new URLSearchParams({id,...values});}
  catch{finish(id,'failure','bridge_unavailable');}
 });
 function finish(id,status,code=''){
  const item=pending.get(id);if(!item||!['success','failure','cancelled','handoff'].includes(status))return;
  pending.delete(id);host.clearTimeout(item.timer);item.resolve({status,code});
 }
 const api={
  readImageChunk(id,index){const image=pending.get(id)?.image;return typeof image==='string'&&Number.isInteger(index)&&index>=0?image.slice(index*IMAGE_CHUNK_SIZE,(index+1)*IMAGE_CHUNK_SIZE):'';},
  complete:finish,
  async save(imageUrl,filename){
   if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(imageUrl))return {status:'failure',code:'invalid_image'};
   const image=imageUrl.slice('data:image/png;base64,'.length);
   if(!image.length||image.length>MAX_IMAGE_BASE64)return {status:'failure',code:'image_too_large'};
   if(native)return request('save-image',{length:String(image.length)},image);
   let objectUrl;
   try{
    const bytes=host.atob(image),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);
    objectUrl=host.URL.createObjectURL(new Blob([array],{type:'image/png'}));
    const link=host.document.createElement('a');link.href=objectUrl;link.download=filename;
    host.document.body.append(link);try{link.click();}finally{link.remove();}
    host.setTimeout(()=>host.URL.revokeObjectURL(objectUrl),10000);
    return {status:'download_requested',code:''};
   }catch{if(objectUrl)host.URL.revokeObjectURL(objectUrl);return {status:'failure',code:'download_failed'};}
  },
  async openX(intent){
   let url;try{url=new URL(intent);}catch{return {status:'failure',code:'invalid_url'};}
   if(url.origin!=='https://x.com'||url.pathname!=='/intent/post'||url.username||url.password)return {status:'failure',code:'invalid_url'};
   if(native)return request('open-x',{url:url.href});
   try{const opened=host.open(url.href,'_blank');if(!opened)return {status:'failure',code:'popup_blocked'};opened.opener=null;return {status:'handoff',code:''};}
   catch{return {status:'failure',code:'browser_unavailable'};}
  }
 };
 return api;
}

export function createResultActions({sharing,analytics,capture,filename,context,feedback}){
 const active=new Set();
 async function perform(action){
  if(active.has(action))return;
  const before=context(),eventContext=analytics.common();active.add(action);
  const button=before.button(action);button.disabled=true;analytics.share(action,'request','',eventContext);
  try{
   let result;
   try{result=action==='save_image'?await sharing.save(capture(),filename()):await sharing.openX(before.intent());}
   catch{result={status:'failure',code:action==='save_image'?'capture_failed':'browser_unavailable'};}
   analytics.share(action,result.status,result.code,eventContext);
   if(context().token===before.token){
    if(action==='save_image'){
     button.dataset.saveState=result.status==='success'?'done':result.status==='download_requested'?'requested':result.status;
     feedback(button,result.status==='success'?'保存しました':result.status==='download_requested'?'保存を開始しました':result.status==='cancelled'?'保存をキャンセルしました':'保存できませんでした');
    }else if(result.status==='failure')feedback(button,'ブラウザを開けませんでした');
   }
  }finally{button.disabled=false;active.delete(action);}
 }
 return {save:()=>perform('save_image'),share:()=>perform('x_share')};
}
