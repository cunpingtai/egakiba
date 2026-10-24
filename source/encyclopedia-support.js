import {FONTS} from './fonts.js';
import {isEmojiCharacter} from './glyph-emoji.js';
import {createDisplayProbe,mobileAppleCanvas} from './encyclopedia-display-probe.js';
export {createDisplayProbe} from './encyclopedia-display-probe.js';
const CACHE_VERSION='94de8088359111bcf6f06ca2',KEY='tsukuruum.moji-blade.encyclopedia-display.v1';
const CACHE_COMPATIBLE=["5c0cb142e88ad5253b86c673","d33de1659dacaf76f78d2af5"];
const ids=Object.keys(FONTS);
function fontEnvironment(){
 if(typeof document==='undefined')return '';
 try{const canvas=Object.assign(document.createElement('canvas'),{width:256,height:32}),ctx=canvas.getContext('2d',{willReadFrequently:true});let hash=2166136261;
  for(const spec of Object.values(FONTS)){ctx.clearRect(0,0,256,32);ctx.font=`16px ${spec.fallback}`;ctx.fillText('文한😀',0,24);for(const byte of ctx.getImageData(0,0,256,32).data)hash=Math.imul(hash^byte,16777619);}return String(hash>>>0);
 }catch{return '';}
}
function signature(candidates,libraries,environment,version=CACHE_VERSION){let hash=2166136261;for(const glyph of candidates)for(const char of glyph)hash=Math.imul(hash^char.codePointAt(0),16777619);return `${version}:${hash>>>0}:${candidates.length}:${[...libraries().keys()].join(',')}:${globalThis.navigator?.userAgent||''}:${environment}`;}
function encode(values,bits=4){const perByte=8/bits,bytes=new Uint8Array(Math.ceil(values.length/perByte));values.forEach((v,i)=>bytes[Math.floor(i/perByte)]|=v<<((i%perByte)*bits));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function decode(text,length,bits=4){const perByte=8/bits,binary=atob(text);if(binary.length!==Math.ceil(length/perByte))throw Error('Invalid coverage');return Array.from({length},(_,i)=>(binary.charCodeAt(Math.floor(i/perByte))>>((i%perByte)*bits))&((1<<bits)-1));}
export function createEncyclopediaSupport({libraries,storage,probe=null,yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0)),workerFactory=null,environmentKey=fontEnvironment}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const masks=new Map(),checked=new Set(),rejected=new Map(),listeners=new Set();let candidates=null,candidateSet=new Set(),ready=false,pending=null,draw=probe,key=null,revision=0,worker=null,cancelWorker=null,lastSaved=0,lastNotified=0,environment=null,priorityTask=null,backgroundEnabled=true;const priorityQueue=new Set();
 const notify=(kind='change')=>{lastNotified=performance.now();for(const listener of listeners)listener({kind});};
 const progress=()=>({done:candidates?.reduce((n,g)=>n+Number(checked.has(g)),0)||0,total:candidates?.length||0,priorityRemaining:priorityQueue.size});
 const report=()=>{if(performance.now()-lastNotified>=1000)notify('progress');};
 function checkBatch(glyphs){if(!glyphs.length)return;draw ||= createDisplayProbe(libraries);const values=draw.batch?draw.batch(glyphs):glyphs.map(probeMask);glyphs.forEach((glyph,i)=>remember(glyph,values[i]));}
 function prioritize(glyphs){for(const g of glyphs)if(!checked.has(g)){priorityQueue.add(g);if(!masks.has(g))masks.set(g,0);}if(!priorityQueue.size||priorityTask)return priorityTask;
  if(!backgroundEnabled)ready=false;
  const token=revision,task=(async()=>{
   await yieldControl();
   while(token===revision&&priorityQueue.size){const part=[];for(const g of priorityQueue){part.push(g);if(part.length===16)break;}for(const g of part)priorityQueue.delete(g);checkBatch(part.filter(g=>!checked.has(g)));if(performance.now()-lastNotified>=100)notify('priority');await yieldControl();}
   if(token===revision){if(!backgroundEnabled)ready=true;persist();notify(backgroundEnabled?'priority':'ready');}
  })();priorityTask=task;task.finally(()=>{if(priorityTask===task)priorityTask=null;});return task;
 }
 function persist(){if(!candidates)return;try{const value={signature:key,count:candidates.length,coverage:encode(candidates.map(g=>masks.get(g)||0))};const extras=[...masks].filter(([g])=>!candidateSet.has(g)&&checked.has(g));if(extras.length)value.extras=extras;if(!ready||candidates.some(g=>!checked.has(g)))value.checked=encode(candidates.map(g=>checked.has(g)?1:0),1);storage?.setItem(KEY,JSON.stringify(value));lastSaved=performance.now();}catch{}}
 function probeMask(glyph){draw ||= createDisplayProbe(libraries);if(draw.batch)return draw.batch([glyph])[0];let value=0;for(let i=0;i<ids.length;i++)if(draw(ids[i],glyph))value|=1<<i;return value;}
 function remember(glyph,bits){masks.set(glyph,(bits&15)&~(rejected.get(glyph)||0));checked.add(glyph);}
 function value(glyph){if(!masks.has(glyph)){masks.set(glyph,probeMask(glyph));checked.add(glyph);if(ready)persist();}return masks.get(glyph);}
 function restore(){
  try{const cached=JSON.parse(storage?.getItem(KEY)||'null'),count=cached?.count??candidates.length;if(!Number.isSafeInteger(count)||count<0||count>candidates.length||![CACHE_VERSION,...CACHE_COMPATIBLE].some(version=>cached.signature===signature(candidates.slice(0,count),libraries,environment,version)))return;
   const values=decode(cached.coverage,count),flags=cached.checked?decode(cached.checked,count,1):null;candidates.slice(0,count).forEach((g,i)=>{if(checked.has(g))return;masks.set(g,values[i]);if(!flags||flags[i])checked.add(g);});for(const row of cached.extras||[])if(Array.isArray(row)&&typeof row[0]==='string'&&row[0].length<=40&&Number.isInteger(row[1])&&row[1]>=0&&row[1]<=15&&!checked.has(row[0])){masks.set(row[0],row[1]);checked.add(row[0]);}
  }catch{}
 }
 async function background(glyphs,token){
  if(!glyphs.length)return true;
  if(probe&&!workerFactory||!workerFactory&&mobileAppleCanvas())return false;
  try{return await new Promise(resolve=>{
   const active=workerFactory?workerFactory():new Worker(new URL('./encyclopedia-support-worker.js',import.meta.url),{type:'module'});let timer=setTimeout(()=>finish(false),15000);worker=active;let stopped=false;cancelWorker=()=>finish(false);
   function finish(ok){if(stopped)return;stopped=true;clearTimeout(timer);active.terminate();if(worker===active){worker=null;cancelWorker=null;}resolve(ok);}
   active.onerror=event=>{event.preventDefault?.();finish(false);};
   active.onmessage=event=>{if(token!==revision){finish(false);return;}const message=event.data;clearTimeout(timer);timer=setTimeout(()=>finish(false),15000);if(message.error){finish(false);return;}
    if(message.rows){for(const [index,bits] of message.rows){const glyph=glyphs[index];if(glyph!==undefined){remember(glyph,bits);}}if(performance.now()-lastSaved>1000)persist();report();}
    if(message.done)finish(true);
   };
   const states=ids.map(font=>{const lib=libraries().get(font);return Uint8Array.from(glyphs,g=>!lib?2:lib.supportCache?.has(g)?lib.supportCache.get(g)?1:2:!isEmojiCharacter(g)&&lib.hasBundledOutline?.(g)?1:0);});
   active.postMessage({glyphs,states});
  });}catch{return false;}
 }
 const api={get ready(){return ready;},get progress(){return progress();},prioritize,has:glyph=>value(glyph)!==0,supports:(font,glyph)=>Boolean(value(glyph)&(1<<ids.indexOf(font))),subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  pause(){if(!pending||ready)return;++revision;cancelWorker?.();priorityTask=null;priorityQueue.clear();pending=null;if(candidates)persist();},
  reject(font,glyph){const old=value(glyph),next=old&~(1<<ids.indexOf(font));if(next!==old){rejected.set(glyph,(rejected.get(glyph)||0)|(1<<ids.indexOf(font)));masks.set(glyph,next);if(ready){checked.add(glyph);persist();}notify('reject');}},
  ensure(glyphs,{priority=[],background:scan=true}={}){
   if(pending&&scan===backgroundEnabled&&glyphs.length<=candidates.length&&glyphs.every(glyph=>masks.has(glyph))){prioritize(priority);return pending;}
   const token=++revision;cancelWorker?.();priorityTask=null;priorityQueue.clear();backgroundEnabled=scan;ready=false;lastSaved=performance.now();candidates=[...new Set(glyphs)];candidateSet=new Set(candidates);environment ??= environmentKey();key=signature(candidates,libraries,environment);restore();
   // Keep confirmed answers; new candidates receive only the already-known bundled coverage.
   const bundled=ids.map(font=>new Set(Object.values(libraries().get(font)?.randomPools||{}).flat()));
   for(const glyph of candidates)if(!checked.has(glyph)){let bits=0;if(!isEmojiCharacter(glyph))for(let i=0;i<ids.length;i++)if(bundled[i].has(glyph))bits|=1<<i;masks.set(glyph,bits&~(rejected.get(glyph)||0));}
   for(const g of priority)if(!checked.has(g)){priorityQueue.add(g);if(!masks.has(g))masks.set(g,0);}
   const missing=candidates.filter(g=>!checked.has(g));if((!scan||!missing.length)&&!priorityQueue.size){ready=true;pending=Promise.resolve();return pending;}
   pending=(async()=>{
    await yieldControl();if(token!==revision)return;
    if(priorityQueue.size)await prioritize([]);if(token!==revision)return;
    if(!scan){ready=true;persist();return;}
    await background(missing.filter(g=>!checked.has(g)),token);if(token!==revision)return;
    const left=missing.filter(g=>!checked.has(g));
    for(let offset=0;offset<left.length;offset+=16){if(token!==revision)return;const glyphs=left.slice(offset,offset+16).filter(g=>!checked.has(g));checkBatch(glyphs);if(performance.now()-lastSaved>1000)persist();report();await yieldControl();}
    if(priorityTask)await priorityTask;if(token!==revision)return;ready=true;persist();notify('ready');
   })();return pending;
  }
 };return api;
}
