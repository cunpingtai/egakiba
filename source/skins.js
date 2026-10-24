import {trackFeature} from './feature-telemetry.js';
import {createSkinCarousel} from './skin-carousel.js';
import {skinPaint,applySkinVariables} from './skin-catalog.js';
import {translate as t} from './i18n.js?v=1.2.5';
export function createSkinPicker({skins,ready=()=>true,side=0}){
 const second=side===1,buttonId=second?'skin-open-2p':'skin-open',panelId=second?'skin-panel-2p':'skin-panel',name=second?'COM / 2Pのスキン':'スキン';
 const anchor=document.querySelector(second?'.com-setup .character-preview':'.player-setup .character-preview'),font=document.getElementById(second?'com-font-choice':'font-choice');if(!anchor||!font)return {phase(){},close(){}};
 anchor.classList.add('has-skin-button');const button=document.createElement('button');button.type='button';button.id=buttonId;button.className='skin-open';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',panelId);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',t(name));button.title=t(name);
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="skin-brush-rainbow"><stop stop-color="#f05b66"/><stop offset=".2" stop-color="#f6ad36"/><stop offset=".4" stop-color="#e3d94c"/><stop offset=".6" stop-color="#45bc82"/><stop offset=".8" stop-color="#459de5"/><stop offset="1" stop-color="#a76bdf"/></linearGradient></defs><path d="M5 14h14v7H5z" fill="url(#skin-brush-rainbow)" stroke="none"/><path d="M10 10V4a2 2 0 0 1 4 0v6M5 10h14v11H5zM5 14h14M9 18v3M15 18v3"/></svg>';anchor.append(button);
 const panel=document.createElement('section');panel.id=panelId;panel.className=second?'skin-panel is-upward':'skin-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',t(name));panel.innerHTML='<header><button type="button" class="ranking-close skin-close" aria-label="閉じる"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></header><div class="skin-carousel"><button type="button" class="skin-prev" aria-label="前のページ">‹</button><div class="skin-pages"></div><button type="button" class="skin-next" aria-label="次のページ">›</button></div><footer><span class="skin-page" data-no-i18n></span></footer>';
 if(second)anchor.insertAdjacentElement('beforebegin',panel);else font.insertAdjacentElement('afterend',panel);let closing=null,revision=0;
 const $=selector=>panel.querySelector(selector);
 const carousel=createSkinCarousel({viewport:$('.skin-pages'),previous:$('.skin-prev'),next:$('.skin-next'),label:$('.skin-page')});
 function render(){
  const list=skins.list();$('.skin-close').setAttribute('aria-label',t('閉じる'));$('.skin-prev').setAttribute('aria-label',t('前のページ'));$('.skin-next').setAttribute('aria-label',t('次のページ'));
  const pages=[];for(let start=0;start<list.length;start+=10){const grid=document.createElement('div');grid.className='skin-grid';grid.setAttribute('role','group');grid.replaceChildren(...list.slice(start,start+10).map(skin=>{
   const item=document.createElement('button');item.type='button';item.className='skin-swatch';item.dataset.skinId=skin.id;item.style.setProperty('--swatch',skinPaint(skin));item.setAttribute('aria-label',t(skin.name));item.title=t(skin.name);item.setAttribute('aria-pressed',String(skins.selected(side).id===skin.id));item.onclick=()=>{if(skins.select(skin.id,side))panel.querySelector(`.skin-grid:not([data-carousel-clone]) [data-skin-id="${skin.id}"]`)?.focus({preventScroll:true});};return item;
  }));pages.push(grid);}carousel.setPages(pages);button.title=t(name);button.setAttribute('aria-label',t(name));applySkinVariables(button,skins.selected(side));
 }
 function close(){++revision;if(panel.hidden||button.getAttribute('aria-expanded')!=='true')return;trackFeature('skin_action',{action:'close',target:second?'p2':'p1',skin_id:skins.selected(side).id});button.setAttribute('aria-expanded','false');panel.classList.remove('is-open');closing=panel.getAnimations?.().length?Promise.all(panel.getAnimations().map(a=>a.finished.catch(()=>{}))):Promise.resolve();closing.then(()=>{if(button.getAttribute('aria-expanded')==='false'){panel.hidden=true;document.dispatchEvent(new Event('moji-skin-closed'));}});}
 function open(){if(!ready()||button.getAttribute('aria-expanded')==='true')return;trackFeature('skin_action',{action:'open',target:second?'p2':'p1',skin_id:skins.selected(side).id});document.dispatchEvent(new CustomEvent('moji-skin-opening',{detail:panelId}));const token=++revision;closing=null;render();panel.hidden=false;carousel.go(Math.floor(skins.list().findIndex(s=>s.id===skins.selected(side).id)/10),false);button.setAttribute('aria-expanded','true');requestAnimationFrame(()=>{if(token===revision){panel.classList.add('is-open');if(second)panel.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});}
 button.onclick=()=>button.getAttribute('aria-expanded')==='true'?close():open();$('.skin-close').onclick=()=>{close();button.focus({preventScroll:true});};
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target))close();});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();button.focus({preventScroll:true});}});
 if(second)window.addEventListener('resize',()=>{if(button.getAttribute('aria-expanded')==='true')requestAnimationFrame(()=>{if(button.getAttribute('aria-expanded')==='true')panel.scrollIntoView({block:'nearest',behavior:'auto'});});});
 document.addEventListener('moji-skin-opening',event=>{if(event.detail!==panelId)close();});
 window.addEventListener('moji-skin-back',close);skins.subscribe(render);render();
 return {close,phase(next){if(next!=='setup')close();button.disabled=next!=='setup';}};
}
export function createSkinReceipt({id='skin-received',libraries,onReveal=()=>{}}={}){
 const dialog=document.createElement('dialog');dialog.id=id;dialog.className='home-dialog skin-received';dialog.setAttribute('aria-labelledby','skin-received-title');dialog.innerHTML='<div class="home-dialog-panel"><h2 id="skin-received-title"></h2><div class="skin-received-stage"><span class="skin-received-swatch" aria-hidden="true"></span></div><p></p><button type="button" class="primary"></button></div>';dialog.querySelector('h2').id=id+'-title';dialog.setAttribute('aria-labelledby',id+'-title');document.body.append(dialog);
 const stage=dialog.querySelector('.skin-received-stage');let generation=0,preview=null;
 function cleanup(){++generation;preview?.dispose();preview=null;stage.removeAttribute('data-ready');stage.querySelector('canvas')?.remove();for(const spark of stage.querySelectorAll('.skin-received-spark'))spark.remove();}
 dialog.addEventListener('close',()=>{if(!dialog.open)cleanup();});
 window.addEventListener('moji-skin-back',()=>{if(dialog.open){cleanup();dialog.close();}});
 const close=dialog.querySelector('button');close.onclick=()=>{cleanup();dialog.close();};dialog.addEventListener('click',event=>{if(event.target===dialog){cleanup();dialog.close();}});
 return skin=>{
  cleanup();const token=generation;
  dialog.querySelector('h2').textContent=t('スキンを獲得しました！');dialog.querySelector('p').textContent=t(skin.name);dialog.querySelector('p').hidden=skin.source==='halloween-2026';dialog.querySelector('.skin-received-swatch').style.background=skinPaint(skin);dialog.querySelector('.skin-received-swatch').style.backgroundSize='cover';close.textContent=t('閉じる');
  stage.style.setProperty('--reward-spark',skin.color);const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',t('解放されたスキンの3Dコマ'));stage.prepend(canvas);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<12;i++){const spark=document.createElement('i');spark.className='skin-received-spark';spark.style.setProperty('--x',(10+(i*29)%80)+'%');spark.style.setProperty('--y',(20+(i*17)%65)+'%');spark.style.setProperty('--delay',(i%4)*.06+'s');stage.append(spark);}
  if(!dialog.open)dialog.showModal();close.focus({preventScroll:true});onReveal(skin);
  import('./skin-receipt-preview.js').then(({createSkinReceiptPreview})=>{
   if(token!==generation||!dialog.open)return null;return createSkinReceiptPreview(canvas,skin,{libraries,isCurrent:()=>token===generation&&dialog.open});
  }).then(next=>{
   if(!next)return;if(token!==generation||!dialog.open){next.dispose();return;}
   preview=next;stage.setAttribute('data-ready','');preview.onError=()=>{if(token===generation){preview?.dispose();preview=null;stage.removeAttribute('data-ready');}};
  }).catch(()=>{/* The received inventory is saved; keep the colour swatch if 3D is unavailable. */});
 };
}
