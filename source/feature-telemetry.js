// Shared gameplay emits committed facts; only the native host installs a sender.
// No queue, storage, networking or gameplay RNG is used here.
let observer=null;
export function setFeatureObserver(next){observer=typeof next==='function'?next:null;return ()=>{if(observer===next)observer=null;};}
export function trackFeature(name,data={}){try{observer?.(name,data);}catch{/* Analytics must never block play or saving. */}}
