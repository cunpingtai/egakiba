// Exercise lazy WASM/physics paths while the preparation screen is visible.
// Only the disposable world advances; the real match and its inputs stay intact.
export function createPhysicsWarmup(Battle,{
 now=()=>performance.now(),yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))
}={}){
 const warmed=new WeakSet();
 return async function warmPhysics(glyphs){
  if(glyphs.every(glyph=>warmed.has(glyph)))return;
  const started=now();let scratch;
  try{
   scratch=new Battle(glyphs);
   scratch.launchPair([{angle:0,power:.8,spinDirection:1},{angle:-.1,power:.8,spinDirection:1}]);
   for(let frame=0;frame<60&&scratch.running;frame++){
    scratch.advance(1/60);
    scratch.events.length=0;
    if(now()-started>=2000)break;
    await yieldTask();
   }
   glyphs.forEach(glyph=>warmed.add(glyph));
  }finally{scratch?.dispose();}
 };
}
