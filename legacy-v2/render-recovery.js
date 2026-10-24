// Only drawing quality changes. Physics, glyphs and match state remain intact.
export const RENDER_QUALITIES=Object.freeze([
 Object.freeze({id:'normal',antialias:true,shadows:true,pixelRatio:1.7}),
 Object.freeze({id:'no-antialias',antialias:false,shadows:true,pixelRatio:1.7}),
 Object.freeze({id:'light',antialias:false,shadows:false,pixelRatio:1})
]);
const STORAGE_KEY='tsukuruum.moji-blade.render-quality.v1';
function sessionStorageOrNull(){try{return globalThis.sessionStorage||null;}catch{return null;}}
export function pixel10RenderLevel(model=''){
 return /\bPixel 10(?:\s+Pro(?:\s+(?:XL|Fold))?)?(?=$|[;)]|\s+Build\/)/i.test(model.trim())?1:0;
}

export class RenderRecovery {
 constructor({rebuild,isLost,pause,resume,progress,failure,storage=sessionStorageOrNull(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  Object.assign(this,{rebuild,isLost,pause,resume,progress,failure,storage,wait});
  this.level=pixel10RenderLevel(globalThis.navigator?.userAgent||'');
  try{const stored=storage?.getItem(STORAGE_KEY);if(/^[0-2]$/.test(stored))this.level=Math.max(this.level,Number(stored));}catch{}
  this.blocked=false;this.recovering=false;this.failed=false;this.seen=new WeakSet();this.pending=null;
 }
 get quality(){return RENDER_QUALITIES[this.level];}
 initializeDevice(device=globalThis.navigator){
  return this.deviceReady ||= (async()=>{
   let timer;
   try{
    this.level=Math.max(this.level,pixel10RenderLevel(device?.userAgent||''));
    // Chromium can hide the model in its reduced UA. Never delay boot indefinitely.
    const hints=await Promise.race([
     Promise.resolve(device?.userAgentData?.getHighEntropyValues(['model'])),
     new Promise(resolve=>{timer=setTimeout(()=>resolve(null),500);})
    ]);
    this.level=Math.max(this.level,pixel10RenderLevel(hints?.model||''));
   }catch{}finally{clearTimeout(timer);}
   return this.quality;
  })();
 }
 interrupt(canvas){
  if(this.failed||this.seen.has(canvas))return this.pending||Promise.resolve(false);
  this.seen.add(canvas);
  if(this.recovering){this.attemptLost=true;return this.pending;}
  this.blocked=true;this.recovering=true;this.pause();
  this.pending=this.recover();return this.pending;
 }
 async recover(){
  while(this.level<RENDER_QUALITIES.length-1){
   this.level++;this.progress(this.quality);
   // Retain a lower tier for this visit, including a manual page reload.
   try{this.storage?.setItem(STORAGE_KEY,String(this.level));}catch{}
   await this.wait(1000);this.attemptLost=false;
   try{
    await this.rebuild(this.quality);
    // Context-loss events can arrive after the first render returns.
    await this.wait(500);
    if(this.attemptLost||this.isLost())continue;
    this.blocked=false;this.recovering=false;this.resume();return true;
   }catch{
    // A failed renderer allocation consumes a tier too; never loop forever.
   }
  }
  this.failed=true;this.recovering=false;this.failure();return false;
 }
}
