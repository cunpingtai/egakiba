/* Browser host for the shared 2.0.1 UI. No native navigation or analytics. */
(()=>{
 const root=document.documentElement;
 root.dataset.appKeyboardFocus='false';
 document.addEventListener('keydown',event=>{if(event.key==='Tab')root.dataset.appKeyboardFocus='true';});
 document.addEventListener('pointerdown',()=>{root.dataset.appKeyboardFocus='false';});
 window.mojiBladeApp={
  paused:false,
  phase(next){if(next==='setup')document.activeElement?.blur();},
  vibrate(milliseconds){
   if(!Number.isInteger(milliseconds)||milliseconds<0||milliseconds>40)return;
   if(milliseconds&&document.hidden)return;
   try{navigator.vibrate?.(milliseconds);}catch{/* Unsupported devices can still play. */}
  }
 };
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)window.mojiBladeApp.vibrate(0);
 });
})();
