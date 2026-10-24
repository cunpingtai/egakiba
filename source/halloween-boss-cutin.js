// Final-round presentation only. DOM animation, no additional WebGL resources.
export function createBossCutin({parent,doc=globalThis.document,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true,onStart=()=>{}}={}){
 const layer=doc.createElement('div');layer.className='boss-cutin';layer.setAttribute('aria-hidden','true');
 layer.innerHTML='<span class="boss-cutin-moon">🌝</span><div class="boss-cutin-band"><strong>BOSS</strong></div>';
 parent.append(layer);const animations=[];let disposed=false;
 function animate(target,frames,options){if(!target.animate)return;const animation=target.animate(frames,options);animation.finished.catch(()=>{});animations.push(animation);return animation;}
 const band=layer.querySelector('.boss-cutin-band'),center='translate(-50%,-50%) rotate(-12deg)',moon=layer.querySelector('.boss-cutin-moon'),duration=reduced?300:2800,ease='cubic-bezier(.45,0,.55,1)';
 if(!reduced){
  animate(band,[{opacity:0,transform:'translate(calc(-50% - 140vw),calc(-50% + 30vw)) rotate(-12deg)',offset:0,easing:ease},{opacity:1,transform:center,offset:.25},{opacity:1,transform:center,offset:.75,easing:ease},{opacity:0,transform:'translate(calc(-50% + 140vw),calc(-50% - 30vw)) rotate(-12deg)',offset:1}],{duration,fill:'both'});
  const moonCenter='translate(-50%,-50%) rotate(0deg) scale(1)';
  animate(moon,[{opacity:0,transform:'translate(calc(-50% - 95vw),calc(-50% + 12vh)) rotate(-18deg) scale(.88)',offset:0,easing:ease},{opacity:1,transform:moonCenter,offset:.44},{opacity:1,transform:moonCenter,offset:.68,easing:ease},{opacity:0,transform:'translate(calc(-50% + 95vw),calc(-50% - 12vh)) rotate(12deg) scale(1.03)',offset:1}],{duration,fill:'both'});
 }
 const fade=animate(layer,[{opacity:1,offset:0},{opacity:1,offset:.82},{opacity:0,offset:1}],{duration,fill:'both'});
 function dispose(){if(disposed)return;disposed=true;for(const animation of animations)animation.cancel();layer.remove();}
 try{onStart();}catch(error){dispose();throw error;}const finished=(fade?.finished||Promise.resolve()).catch(()=>{}).then(dispose);
 return {finished,dispose};
}
