export function scrollbarGeometry(scrollHeight,clientHeight,trackHeight){
 const length=Math.max(0,trackHeight-12),max=Math.max(0,scrollHeight-clientHeight),thumb=Math.min(length,Math.max(32,scrollHeight?length*clientHeight/scrollHeight:length));
 return {max,thumb,travel:Math.max(0,length-thumb)};
}
export function scrollbarPosition(offset,grab,geometry){return geometry.travel?Math.max(0,Math.min(geometry.max,(offset-6-grab)/geometry.travel*geometry.max)):0;}
export function attachEncyclopediaScrollbar(viewport,{label='Scroll'}={}){
 const shell=document.createElement('div');shell.className='encyclopedia-scroll-shell';viewport.before(shell);shell.append(viewport);
 const bar=document.createElement('div'),thumb=document.createElement('div');bar.className='encyclopedia-scrollbar';thumb.className='encyclopedia-scrollbar-thumb';bar.append(thumb);shell.append(bar);
 bar.tabIndex=0;bar.setAttribute('role','scrollbar');bar.setAttribute('aria-controls',viewport.id);bar.setAttribute('aria-orientation','vertical');bar.setAttribute('aria-valuemin','0');
 const events=new AbortController(),options={signal:events.signal};let frame=0,drag=null;
 const geometry=()=>scrollbarGeometry(viewport.scrollHeight,viewport.clientHeight,bar.clientHeight);
 function refresh(nextLabel=label){label=nextLabel;shell.hidden=viewport.hidden;bar.setAttribute('aria-label',label);const g=geometry();
  thumb.style.height=`${g.thumb}px`;thumb.style.transform=`translateY(${6+(g.max?Math.min(g.max,viewport.scrollTop)/g.max*g.travel:0)}px)`;
  bar.setAttribute('aria-valuemax',String(Math.round(g.max)));bar.setAttribute('aria-valuenow',String(Math.round(viewport.scrollTop)));bar.setAttribute('aria-disabled',String(!g.max));bar.classList.toggle('is-disabled',!g.max);
 }
 function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;refresh();});}
 function move(event){if(drag?.id!==event.pointerId)return;viewport.scrollTop=scrollbarPosition(event.clientY-bar.getBoundingClientRect().top,drag.grab,geometry());refresh();}
 bar.addEventListener('pointerdown',event=>{if(event.button>0||!geometry().max)return;event.preventDefault();const g=geometry(),rect=bar.getBoundingClientRect(),start=6+viewport.scrollTop/g.max*g.travel;drag={id:event.pointerId,grab:event.clientY-rect.top>=start&&event.clientY-rect.top<=start+g.thumb?event.clientY-rect.top-start:g.thumb/2};bar.setPointerCapture(event.pointerId);move(event);},options);
 bar.addEventListener('pointermove',move,options);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])bar.addEventListener(name,()=>{drag=null;},options);
 bar.addEventListener('keydown',event=>{const g=geometry(),changes={ArrowUp:-40,ArrowDown:40,PageUp:-viewport.clientHeight*.9,PageDown:viewport.clientHeight*.9};if(event.key in changes){event.preventDefault();viewport.scrollTop+=changes[event.key];}else if(event.key==='Home'||event.key==='End'){event.preventDefault();viewport.scrollTop=event.key==='Home'?0:g.max;}else return;refresh();},options);
 viewport.addEventListener('scroll',schedule,{...options,passive:true});const observer=new ResizeObserver(schedule);observer.observe(viewport);observer.observe(shell);
 const mutations=new MutationObserver(schedule);mutations.observe(viewport,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden']});refresh();
 return {refresh,destroy(){events.abort();observer.disconnect();mutations.disconnect();cancelAnimationFrame(frame);}};
}
