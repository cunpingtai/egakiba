// Follow the finger directly; one damped motion handles release and interruption.
export function createSkinCarousel({viewport,previous,next,label,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,frame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}){
 let page=0,count=1,drag=null,suppressClick=false,position=0,goal=0,velocity=0,frameId=null,lastTime=null,wheelTimer=null,size=viewport.clientWidth||1;
 const wrap=index=>((index%count)+count)%count,offset=()=>count>1?1:0;
 function update(){previous.disabled=next.disabled=count<2;label.textContent=`${page+1} / ${count}`;let index=0;for(const child of viewport.children){if(child.dataset.carouselClone)continue;const active=index++===page;child.inert=!active;child.setAttribute('aria-hidden',String(!active));}}
 function stop(){if(frameId!==null)cancelFrame(frameId);frameId=null;lastTime=null;}
 function draw(){
  if(count>1){const period=count*size,shift=position<size?Math.ceil((size-position)/period)*period:position>=(count+1)*size?-Math.floor((position-size)/period)*period:0;
   if(shift){position+=shift;goal+=shift;if(drag){drag.anchor+=shift;drag.origin+=shift;}}
  }
  viewport.scrollLeft=position;
 }
 function measure(){const nextSize=viewport.clientWidth;if(nextSize>0&&nextSize!==size){const ratio=nextSize/size;position*=ratio;goal*=ratio;velocity*=ratio;if(drag){drag.anchor*=ratio;drag.origin*=ratio;}size=nextSize;draw();}}
 function tick(time){
  frameId=null;measure();const elapsed=lastTime===null?1/60:Math.max(0,Math.min(.05,(time-lastTime)/1000));lastTime=time;
  // Small substeps keep the critically damped spring stable on slow devices.
  for(let remaining=elapsed;remaining>0;){const dt=Math.min(remaining,1/120);velocity+=((goal-position)*576-velocity*48)*dt;position+=velocity*dt;remaining-=dt;}
  if(Math.abs(goal-position)<.25&&Math.abs(velocity)<5){position=goal;velocity=0;draw();lastTime=null;return;}
  draw();frameId=frame(tick);
 }
 function animate(){if(reduced()){stop();position=goal;velocity=0;draw();return;}if(frameId===null)frameId=frame(tick);}
 function go(target,smooth=true){
  clearTimeout(wheelTimer);measure();const delta=target-page;page=wrap(target);update();
  if(!smooth||reduced()||count<2){stop();position=goal=(page+offset())*size;velocity=0;draw();}
  else{goal+=delta*size;animate();}
 }
 previous.onclick=()=>go(page-1);next.onclick=()=>go(page+1);
 viewport.addEventListener('pointerdown',event=>{
  if(count<2||event.isPrimary===false||event.button!==0)return;clearTimeout(wheelTimer);measure();stop();suppressClick=false;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,anchor:position,origin:goal,lastX:event.clientX,time:event.timeStamp,speed:0,active:false};
 });
 viewport.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active){if(Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)){drag=null;animate();return;}if(Math.abs(dx)<6)return;drag.active=true;viewport.classList.add('is-dragging');viewport.setPointerCapture?.(event.pointerId);}
  event.preventDefault();const dt=(event.timeStamp-drag.time)/1000;
  if(dt>0){const sample=-(event.clientX-drag.lastX)/dt;drag.speed=drag.speed*.25+Math.max(-size*3,Math.min(size*3,sample))*.75;}
  drag.lastX=event.clientX;drag.time=event.timeStamp;position=drag.anchor-dx;velocity=0;draw();
 });
 function finish(event,cancelled=false){
  if(!drag||drag.id!==event.pointerId)return;const gesture=drag;drag=null;viewport.classList.remove('is-dragging');
  if(gesture.active){
   suppressClick=true;velocity=cancelled?0:gesture.speed*Math.exp(-Math.max(0,event.timeStamp-gesture.time)/70);
   const origin=Math.round(gesture.origin/size);let destination=cancelled?origin:Math.round((position+velocity*.14)/size);
   if(!cancelled){
    const distance=position-gesture.anchor,projection=distance+velocity*.14,threshold=Math.max(24,Math.min(64,size*.22));
    // A deliberate swipe needs less than half a page, including a slow release.
    if(Math.abs(distance)>=threshold||(Math.abs(distance)>=12&&Math.abs(velocity)>=size*.75))destination=origin+Math.sign(projection||distance);
    // A single fast swipe must not skip two pages and appear to stay put.
    destination=Math.max(origin-1,Math.min(origin+1,destination));
   }
   goal=destination*size;page=wrap(destination-offset());update();animate();
  }else animate();
  if(viewport.hasPointerCapture?.(event.pointerId))viewport.releasePointerCapture(event.pointerId);
 }
 viewport.addEventListener('pointerup',event=>finish(event));viewport.addEventListener('pointercancel',event=>finish(event,true));viewport.addEventListener('lostpointercapture',event=>{
  // Touch implicitly captures the swatch first. Its bubbled loss during the
  // transfer to this viewport is not a cancellation of the carousel gesture.
  if(event.target===viewport&&!viewport.hasPointerCapture?.(event.pointerId))finish(event,true);
 });
 viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
 viewport.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(page+(event.key==='ArrowLeft'?-1:1));}});
 // Trackpad momentum already supplies its own decay; snap after it finishes.
 viewport.addEventListener('wheel',event=>{
  if(count<2||drag||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
  event.preventDefault();measure();stop();clearTimeout(wheelTimer);velocity=0;
  position+=event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?size:1);draw();
  wheelTimer=setTimeout(()=>{wheelTimer=null;goal=Math.round(position/size)*size;page=wrap(Math.round(goal/size)-offset());update();animate();},90);
 },{passive:false});
 // Layout anchoring/focus must not move an idle page away from its model.
 viewport.addEventListener('scroll',()=>{if(!drag&&frameId===null&&wheelTimer===null){measure();if(Math.abs(viewport.scrollLeft-position)>.5)draw();}},{passive:true});
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;observer?.observe(viewport);
 return {go,get page(){return page;},setPages(pages){
  clearTimeout(wheelTimer);stop();drag=null;viewport.classList.remove('is-dragging');count=Math.max(1,pages.length);page=Math.min(page,count-1);
  // Inert endpoint copies make both seams continuous without duplicate controls.
  const ghost=node=>{const copy=node.cloneNode(true);copy.dataset.carouselClone='true';copy.setAttribute('aria-hidden','true');copy.inert=true;return copy;};
  viewport.replaceChildren(...(count>1?[ghost(pages.at(-1)),...pages,ghost(pages[0])]:pages));go(page,false);
 }};
}
