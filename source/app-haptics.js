const KEY='moji-blade.vibration.v1';
export function createHaptics(host=globalThis){
 let enabled=true,last=-Infinity;
 const button=host.document.getElementById('vibration');
 try{enabled=host.localStorage.getItem(KEY)!=='off';}catch{}
 const output=duration=>{try{host.mojiBladeApp?.vibrate(duration);}catch{/* Haptics must never interrupt a match. */}};
 const label=()=>{
  const text=enabled?'バイブレーションをオフにする':'バイブレーションをオンにする';
  button.setAttribute('aria-label',text);button.title=text;
  button.setAttribute('aria-pressed',String(enabled));button.classList.toggle('is-muted',!enabled);
 };
 button.addEventListener('click',()=>{
  const before=enabled;enabled=!enabled;label();
  try{host.localStorage.setItem(KEY,enabled?'on':'off');}catch{const note=host.document.getElementById('storage-note');if(note)note.hidden=false;}
  if(!enabled)output(0);
  host.dispatchEvent(new host.CustomEvent('moji-app-setting',{detail:{name:'vibration',before:Number(before),after:Number(enabled)}}));
 });
 label();
 return {get enabled(){return enabled;},impact(strength){
  if(!enabled||host.document.hidden||host.mojiBladeApp?.paused||!Number.isFinite(strength)||strength<=0)return;
  const now=host.performance.now();if(now-last<100)return;last=now;
  output(Math.round(18+17*Math.min(1,strength)));
 }};
}
