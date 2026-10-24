// One writable game per save namespace. Web Locks survive background timer
// throttling; older WebViews use a checked lease and stop if ownership changes.
export async function acquireGameSession({name='main',locks=globalThis.navigator?.locks,storage,events=globalThis.window,now=()=>Date.now(),delay=ms=>new Promise(r=>setTimeout(r,ms)),leaseMs=60000,heartbeatMs=5000,onRestore=()=>globalThis.location?.reload(),onLost=()=>{}}={}){
 const key='tsukuruum.moji-blade.session.'+name,token=globalThis.crypto?.randomUUID?.()||`${now()}-${Math.random()}`;
 let active=true,releaseLock=()=>{},timer=null;const cleanup=[];
 function lose(){if(!active)return;active=false;clearInterval(timer);onLost();}
 function listen(type,handler){events?.addEventListener(type,handler);cleanup.push(()=>events?.removeEventListener(type,handler));}
 let backend='web-locks',assert=()=>active;
 if(locks?.request){
  const result=await new Promise(resolve=>{
   try{Promise.resolve(locks.request(key,{ifAvailable:true},lock=>{if(!lock){resolve(false);return;}return new Promise(release=>{releaseLock=release;resolve(true);});})).catch(()=>resolve(null));}catch{resolve(null);}
  });
  if(result===false)return {active:false,reason:'busy'};
  if(result===null)backend='lease';
 }else backend='lease';
 if(backend==='lease'){
  if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
  const read=()=>JSON.parse(storage?.getItem(key)||'null');
  try{
   if(!storage)throw Error('no storage');const owner=read();
   if(owner&&typeof owner.token==='string'&&Number.isFinite(owner.time)&&now()-owner.time<leaseMs)return {active:false,reason:'busy'};
   storage.setItem(key,JSON.stringify({token,time:now()}));await delay(100);
   if(read()?.token!==token)return {active:false,reason:'busy'};
  }catch{return {active:false,reason:'unavailable'};}
  assert=()=>{if(!active)return false;try{if(read()?.token!==token)lose();}catch{lose();}return active;};
  const renew=()=>{if(!assert())return;try{storage.setItem(key,JSON.stringify({token,time:now()}));}catch{lose();}};
  timer=setInterval(renew,heartbeatMs);timer.unref?.();
  listen('storage',event=>{if(event.key===key)assert();});listen('pageshow',renew);listen('visibilitychange',renew);
  releaseLock=()=>{try{if(read()?.token===token)storage.removeItem(key);}catch{}};
 }
 const session={get active(){return active;},backend,assert,
  release(){if(!active)return;active=false;clearInterval(timer);cleanup.forEach(fn=>fn());releaseLock();}};
 // Cached history pages must not hold an invisible lock. Restore through a
 // fresh read before any old in-memory game state can write again.
 listen('pagehide',event=>{session.release();if(event.persisted)events?.addEventListener('pageshow',()=>onRestore(),{once:true});});
 return session;
}
