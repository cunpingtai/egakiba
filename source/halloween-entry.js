// HOME-only moon/cloud/bat sweep -> blackout -> reveal. No downloaded images or extra audio context.
export function createHalloweenEntry({doc=globalThis.document,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true}={}){
 const layer=doc.createElement('div');layer.className='boss-entry-transition';layer.setAttribute('aria-hidden','true');
 layer.innerHTML=`<svg class="boss-entry-moon" viewBox="0 0 80 80"><path d="M54 6C24-1 4 25 15 49C23 70 50 76 68 58C44 64 25 47 29 28C31 18 39 10 54 6Z"/></svg>`+Array.from({length:2},(_,i)=>`<svg class="boss-entry-cloud boss-entry-cloud-${i}" viewBox="0 0 200 90"><path d="M8 75C-4 68 0 50 13 47C10 28 29 17 43 27C49 5 80 7 88 30C109 17 129 31 128 47C145 43 160 55 158 69C176 59 193 68 200 80H8Z"/></svg>`).join('')+Array.from({length:3},(_,i)=>`<svg class="boss-entry-bat boss-entry-bat-${i}" viewBox="0 0 48 32"><path d="M24 12 20 7l-2 6C13 7 5 4 1 6l7 15 8-1 8 10 8-10 8 1 7-15c-4-2-12 1-17 7l-2-6Z"/></svg>`).join('');
 layer.classList.toggle('is-reduced',reduced);doc.body.append(layer);let disposed=false;const animations=[],decorations=[];
 function animate(target,frames,options){if(!target.animate){Object.assign(target.style,frames.at(-1));return null;}const animation=target.animate(frames,options);animations.push(animation);animation.finished.catch(()=>{});return animation;}
 const coverAnimation=animate(layer,[{backgroundColor:'rgba(16,11,24,0)'},{backgroundColor:'rgba(16,11,24,0)',offset:.25},{backgroundColor:'#100b18'}],{duration:reduced?100:600,easing:'ease-in',fill:'forwards'});
 // WAAPI effects survive DOM reparenting; CSS animations would restart on append.
 // Hold their clocks under the blackout while glyph/renderer preparation runs.
 if(!reduced){
  for(const moon of layer.querySelectorAll('.boss-entry-moon'))decorations.push(animate(moon,[{opacity:0,transform:'translateY(16px) rotate(-24deg) scale(.88)'},{opacity:1,offset:.25},{opacity:1,offset:.7},{opacity:0,transform:'translateY(-9px) rotate(-12deg) scale(1)'}],{duration:1200,easing:'ease-out',fill:'both'}));
  for(const [i,cloud] of [...layer.querySelectorAll('.boss-entry-cloud')].entries())decorations.push(animate(cloud,[{opacity:0,transform:`translateX(${i?25:-20}vw)`},{opacity:.6,offset:.2},{opacity:.6,offset:.65},{opacity:0,transform:`translateX(${i?-40:35}vw)`}],{duration:1200,delay:i*40,easing:'cubic-bezier(.2,.55,.4,1)',fill:'both'}));
  for(const [i,bat] of [...layer.querySelectorAll('.boss-entry-bat')].entries()){const turn=[-14,8,-8][i];decorations.push(animate(bat,[{transform:`translate(-20vw,8vh) rotate(${turn}deg) scaleY(.48)`},{transform:`translate(65vw,-4vh) rotate(${turn}deg) scaleY(1)`,offset:.45},{transform:'translate(155vw,-10vh) rotate(0) scaleY(.58)'}],{duration:720,delay:i*50,easing:'cubic-bezier(.35,0,.45,1)',fill:'both'}));}
 }
 const ready=(coverAnimation?.finished||Promise.resolve()).catch(()=>{}).then(()=>{if(disposed)return;for(const animation of decorations)animation?.pause();});
 function dispose(){if(disposed)return;disposed=true;for(const animation of animations)animation.cancel();layer.remove();}
 return {cover:()=>ready,attach(parent){if(!disposed)parent.append(layer);},async reveal(){if(disposed)return;await ready;if(disposed)return;for(const animation of decorations)animation?.play();const revealAnimation=animate(layer,[{opacity:1},{opacity:0}],{duration:reduced?140:550,easing:'ease-out',fill:'forwards'});await revealAnimation?.finished.catch(()=>{});dispose();},dispose};
}
