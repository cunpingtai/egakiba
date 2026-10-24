import {GlyphLibrary} from './glyph.js?v=1.1.9';
import {CONFIG,statGauges} from './config.js';
export const PERFORMANCE_SORTS=new Set(['speed','power','balance','total']);
// Bump when glyph/stat formulas or font assets change independently of CONFIG.
const CACHE_VERSION='2d42200bd605d4b683ea3b3d';
export function measureEncyclopediaScore(library,glyph){
 try{
  if(!library.supports(glyph))return null;
  const {speed,power,balance}=statGauges(library.measure(glyph,'mixed'));
  return Array.from(Float32Array.of(speed,power,balance));
 }catch{return null;}
 finally{
  // The sorting index owns only numbers, never 3D meshes, textures or contours.
  library.measurements.clear();library.rasterCache.clear();library.rasterTextures.clear();
 }
}
export function performanceValue(score,sort){if(!score)return null;return sort==='total'?score[0]+score[1]+score[2]:score[{speed:0,power:1,balance:2}[sort]];}
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function database(){return new Promise(resolve=>{
 try{const request=indexedDB.open('tsukuruum.moji-blade.encyclopedia-performance',3);
  request.onupgradeneeded=()=>{const db=request.result;if(db.objectStoreNames.contains('scores'))db.deleteObjectStore('scores');db.createObjectStore('scores');};request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);request.onsuccess=()=>resolve(request.result);
 }catch{resolve(null);}
});}
async function readCache(font,signature){const db=await database();if(!db)return [];
 return new Promise(resolve=>{try{const request=db.transaction('scores').objectStore('scores').get(font);request.onsuccess=()=>{db.close();const value=request.result;resolve(value?.signature===signature&&Array.isArray(value.glyphs)&&value.values instanceof Float32Array&&value.values.length===value.glyphs.length*3?value.glyphs.map((glyph,i)=>[glyph,Number.isNaN(value.values[i*3])?null:Array.from(value.values.subarray(i*3,i*3+3))]):[]);};request.onerror=()=>{db.close();resolve([]);};}catch{db.close();resolve([]);}});
}
async function writeCache(font,signature,rows){const db=await database();if(!db)return;
 return new Promise(resolve=>{try{const transaction=db.transaction('scores','readwrite');const glyphs=rows.map(row=>row[0]),values=new Float32Array(rows.length*3);rows.forEach((row,i)=>values.set(row[1]||[NaN,NaN,NaN],i*3));transaction.objectStore('scores').put({signature,glyphs,values},font);transaction.oncomplete=transaction.onerror=transaction.onabort=()=>{db.close();resolve();};}catch{db.close();resolve();}});
}
export function createEncyclopediaPerformance({libraries,onProgress=()=>{},workerTimeoutMs=15000,measureScore=measureEncyclopediaScore,workerFactory=()=>new Worker(new URL('./encyclopedia-performance-worker.js',import.meta.url),{type:'module'})}={}){
 const maps=new Map(),loaded=new Set();let operation=null,sequence=0;
 const map=font=>{if(!maps.has(font))maps.set(font,new Map());return maps.get(font);};
 const key=font=>`${CACHE_VERSION}:${font}:${JSON.stringify(CONFIG)}:${globalThis.navigator?.userAgent||''}`;
 function cancel(){sequence++;if(operation){clearTimeout(operation.timer);operation.worker?.terminate();operation.resolve(false);operation=null;}}
 function ensure(font,glyphs){
  if(operation?.font===font)return operation.promise;
  cancel();const token=sequence,scores=map(font),unique=[...new Set(glyphs)];
  const task={font,worker:null,resolve:null,promise:null};task.promise=new Promise(resolve=>task.resolve=resolve);operation=task;
  const active=()=>operation===task&&token===sequence;
  const finish=success=>{clearTimeout(task.timer);task.worker?.terminate();if(active()){operation=null;task.resolve(success);}};
  (async()=>{
   if(!unique.length){finish(true);return;}
   if(!loaded.has(font)){
    for(const row of await readCache(font,key(font)))if(Array.isArray(row)&&typeof row[0]==='string'&&(row[1]===null||(Array.isArray(row[1])&&row[1].length===3&&row[1].every(v=>Number.isFinite(v)&&v>=0&&v<=1))))scores.set(row[0],row[1]);
    loaded.add(font);
   }
   if(!active())return;
   const source=libraries?.().get(font),before=scores.size;
   for(const glyph of unique){if(scores.has(glyph))continue;const metrics=source?.measurements.get(glyph)||source?.cache.get(glyph);if(metrics){const stats=statGauges(metrics);scores.set(glyph,Array.from(Float32Array.of(stats.speed,stats.power,stats.balance)));}}
   const missing=unique.filter(glyph=>!scores.has(glyph)),initial=unique.length-missing.length;
   if(!missing.length){if(scores.size>before)await writeCache(font,key(font),[...scores]);finish(true);return;}
   onProgress({font,done:initial,total:unique.length});
   let completed=0;
   const receive=rows=>{for(const [glyph,score] of rows)scores.set(glyph,score);completed+=rows.length;onProgress({font,done:initial+completed,total:unique.length});};
   const fallback=async()=>{
    clearTimeout(task.timer);task.worker?.terminate();task.worker=null;
    const source=libraries().get(font);if(!source){finish(false);return;}
    // Older WebViews without worker canvas use short, cancellable 2D batches.
    const library=new GlyphLibrary(source.font,source.spec,{randomPools:source.randomPools});let last=performance.now(),reported=last,rows=[];
    for(const glyph of missing){if(!active())return;if(!scores.has(glyph))rows.push([glyph,measureScore(library,glyph)]);if(performance.now()-reported>100){receive(rows);rows=[];reported=performance.now();}if(performance.now()-last>8){await pause();last=performance.now();}}
    if(rows.length)receive(rows);
    await writeCache(font,key(font),[...scores]);if(active())finish(true);
   };
   if(source&&missing.length<=64){await fallback();return;}
   try{
    task.worker=workerFactory();let fallingBack=false;
    const useFallback=()=>{if(fallingBack||!active())return;fallingBack=true;fallback().catch(()=>finish(false));};
    const watch=()=>{clearTimeout(task.timer);task.timer=setTimeout(useFallback,workerTimeoutMs);};watch();
    task.worker.onerror=event=>{event.preventDefault?.();useFallback();};
    task.worker.onmessage=async event=>{if(!active()||fallingBack)return;const message=event.data;if(message.error){useFallback();return;}if(message.rows?.length)watch();receive(message.rows||[]);if(message.done){clearTimeout(task.timer);await writeCache(font,key(font),[...scores]);finish(true);}};
    task.worker.postMessage({font,glyphs:missing});
   }catch{await fallback();}
  })().catch(()=>finish(false));
  return task.promise;
 }
 return {map,ensure,cancel};
}
