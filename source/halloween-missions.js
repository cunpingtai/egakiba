import {trackFeature} from './feature-telemetry.js';
import {translate as t} from './i18n.js?v=1.2.5';
import {HALLOWEEN_EVENT,HALLOWEEN_MISSIONS,watchHalloweenPeriod} from './halloween-progress.js';
import {skinById,skinPaint} from './skin-catalog.js';
import {createSkinReceipt} from './skins.js';
const closeArt='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
function entryDialog(buttonId,id,title,body){
 const button=buttonId?document.getElementById(buttonId):null,dialog=document.createElement('dialog');dialog.id=id;dialog.className='home-dialog halloween-missions';dialog.setAttribute('aria-labelledby',`${id}-title`);
 dialog.innerHTML=`<div class="home-dialog-panel"><header><h2 id="${id}-title"></h2><button type="button" class="ranking-close halloween-close">${closeArt}</button></header>${body}</div>`;document.body.append(dialog);
 dialog.dataset.keyboardFocus='false';
 dialog.addEventListener('pointerdown',()=>{dialog.dataset.keyboardFocus='false';});
 dialog.addEventListener('keydown',event=>{if(event.key==='Tab')dialog.dataset.keyboardFocus='true';});
 dialog.addEventListener('close',()=>{dialog.dataset.keyboardFocus='false';});
 let phase='loading',opening=null,closing=false;const closeButton=dialog.querySelector('header button');
 const api={dialog,onOpen(){},onClose(){},open(){
  if(phase!=='setup'||button?.hidden||dialog.open||closing)return;dialog.querySelector('h2').textContent=t(title);closeButton.setAttribute('aria-label',t('閉じる'));api.onOpen();dialog.showModal();closeButton.focus({preventScroll:true});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)opening=dialog.animate([{opacity:0,transform:'translate(-50%,calc(-50% + 12px)) scale(.96)'},{opacity:1,transform:'translate(-50%,-50%)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
 },async close(){
  if(!dialog.open||closing)return;closing=true;opening?.cancel();api.onClose();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)try{await dialog.animate([{opacity:1,transform:'translate(-50%,-50%)'},{opacity:0,transform:'translate(-50%,calc(-50% + 8px)) scale(.97)'}],{duration:150,easing:'ease-in'}).finished;}catch{}
  if(dialog.open)dialog.close();closing=false;if(phase==='setup')button?.focus({preventScroll:true});
 },phase(next){phase=next;if(button)button.disabled=next!=='setup';if(next!=='setup'&&dialog.open){opening?.cancel();api.onClose();dialog.close();closing=false;}}};
 button?.addEventListener('click',()=>{if(!button.hidden)api.open();});closeButton.onclick=()=>void api.close();dialog.addEventListener('cancel',e=>{e.preventDefault();void api.close();});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)void api.close();});
 return api;
}
export function initHalloweenMissions({progress,skins,libraries,onSkinReceived=()=>{},onBossStart=()=>{}}){
 const missions=entryDialog('missions-open','halloween-missions','ハロウィンミッション','<div class="halloween-mission-scroll"><p class="halloween-deadline"></p><p class="halloween-period-state"></p><div class="halloween-mission-list"></div><p class="halloween-mission-note"></p></div>');
 const trackMissionOpen=()=>{trackFeature('mission_action',{event_id:HALLOWEEN_EVENT.id,action:'open',completed_count:HALLOWEEN_MISSIONS.filter(m=>progress.achieved(m.id)).length,claimed_count:HALLOWEEN_MISSIONS.filter(m=>skins.owns(m.skin)).length});};
 missions.dialog.addEventListener('close',()=>trackFeature('mission_action',{event_id:HALLOWEEN_EVENT.id,action:'close'}));
 const bossButton=document.getElementById('halloween-boss-open');let bossPhase='loading',bossStarting=false;
 bossButton.addEventListener('click',async()=>{
  if(bossPhase!=='setup'||bossButton.hidden||bossStarting||!progress.active())return;
  bossStarting=true;bossButton.disabled=true;
  try{await onBossStart();}finally{bossStarting=false;bossButton.disabled=bossPhase!=='setup';}
 });
 const preview=entryDialog(null,'halloween-skin-preview','報酬スキン','<div class="halloween-preview-stage"><span></span></div><p class="halloween-preview-name" hidden></p>');
 const stage=preview.dialog.querySelector('.halloween-preview-stage');let generation=0,view=null;
 function cleanupPreview(){++generation;view?.dispose();view=null;stage.querySelector('canvas')?.remove();stage.removeAttribute('data-ready');}
 preview.onClose=cleanupPreview;
 function showPreview(skin){
  trackFeature('mission_action',{event_id:HALLOWEEN_EVENT.id,mission_id:HALLOWEEN_MISSIONS.find(m=>m.skin===skin.id)?.id,skin_id:skin.id,action:'preview'});
  cleanupPreview();preview.open();const token=generation;preview.dialog.querySelector('.halloween-preview-name').textContent=t(skin.name);stage.querySelector('span').style.backgroundImage=skinPaint(skin);
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',t('報酬スキンの3Dプレビュー'));stage.append(canvas);
  import('./skin-receipt-preview.js').then(({createSkinReceiptPreview})=>token===generation&&preview.dialog.open?createSkinReceiptPreview(canvas,skin,{libraries,isCurrent:()=>token===generation&&preview.dialog.open}):null).then(next=>{
   if(!next)return;if(token!==generation||!preview.dialog.open){next.dispose();return;}view=next;stage.dataset.ready='true';view.onError=()=>{cleanupPreview();};
  }).catch(()=>{/* Keep the large pattern icon if 3D is unavailable. */});
 }
 const receipt=createSkinReceipt({id:'halloween-skin-received',libraries,onReveal:onSkinReceived});
 const headerDecor=document.querySelector('#missions-open .halloween-edge-decor')?.cloneNode(true);if(headerDecor)missions.dialog.querySelector('header').prepend(headerDecor);
 const list=missions.dialog.querySelector('.halloween-mission-list'),cards=[];
 const feedback=document.createElement('span');feedback.className='halloween-copy-feedback';feedback.setAttribute('role','status');missions.dialog.append(feedback);let copyTimer=0,copyRevision=0;
 function clearCopy(){++copyRevision;clearTimeout(copyTimer);feedback.textContent='';feedback.classList.remove('is-visible');}
 missions.onClose=clearCopy;
 async function copyTarget(value,anchor){
  clearCopy();const token=copyRevision;let copied=false;
  try{await navigator.clipboard.writeText(value);copied=true;}catch{
   const field=document.createElement('textarea'),focus=document.activeElement;field.value=value;field.readOnly=true;field.style.cssText='position:fixed;left:-9999px;top:0';missions.dialog.append(field);field.select();
   try{copied=document.execCommand('copy');}catch{}finally{field.remove();focus?.focus?.({preventScroll:true});}
  }
  trackFeature('mission_action',{event_id:HALLOWEEN_EVENT.id,mission_id:'streak',action:'copy',glyph:value,status:copied?'success':'failure'});
  if(!missions.dialog.open||token!==copyRevision||!anchor.isConnected)return;
  feedback.textContent=t(copied?'コピーしました':'コピーできませんでした');const target=anchor.getBoundingClientRect(),bounds=missions.dialog.getBoundingClientRect(),half=feedback.offsetWidth/2;
  feedback.style.left=Math.max(half+8,Math.min(missions.dialog.clientWidth-half-8,target.left+target.width/2-bounds.left-missions.dialog.clientLeft))+'px';feedback.style.top=Math.max(24,target.top-bounds.top-missions.dialog.clientTop-feedback.offsetHeight-6)+'px';void feedback.offsetWidth;feedback.classList.add('is-visible');copyTimer=setTimeout(clearCopy,1600);
 }
 for(const mission of HALLOWEEN_MISSIONS){
  const skin=skinById(mission.skin),article=document.createElement('article');article.className='halloween-mission-card';
  article.innerHTML='<div class="halloween-mission-copy"><h3></h3><p class="halloween-mission-detail"></p><div class="halloween-progress-track"><i></i></div><strong class="halloween-progress-count"></strong><button type="button" class="primary halloween-claim"></button></div><button type="button" class="halloween-reward-preview"><b class="halloween-reward-label"></b><span class="halloween-reward-icon"></span><small></small></button>';
  article.querySelector('.halloween-reward-icon').style.backgroundImage=skinPaint(skin);article.querySelector('.halloween-reward-preview').onclick=()=>showPreview(skin);
  article.querySelector('.halloween-claim').onclick=()=>{const earned=progress.claim(mission.id,skins);if(earned){render();receipt(earned);}};
  if(mission.id==='streak'){
   const targets=document.createElement('div');targets.className='halloween-targets';targets.setAttribute('role','group');targets.setAttribute('aria-label',t('対象の文字'));
   for(const char of HALLOWEEN_EVENT.targets){const target=document.createElement('button');target.type='button';target.textContent=char;target.dataset.noI18n='';target.setAttribute('aria-label',t('文字をコピー：{glyph}').replace('{glyph}',char));target.onclick=()=>void copyTarget(char,target);targets.append(target);}
   article.querySelector('.halloween-mission-detail').after(targets);
  }
  list.append(article);cards.push({mission,skin,article});
 }
 function render(){
  const active=progress.active(),pending=HALLOWEEN_MISSIONS.some(m=>progress.achieved(m.id)&&!skins.owns(m.skin));
  document.getElementById('missions-open').toggleAttribute('data-reward-unread',pending);
  for(const id of ['missions-open','halloween-boss-open'])document.getElementById(id).hidden=!active;
  const actions=document.querySelector('.mission-actions');if(actions)actions.hidden=!active;
  if(!active)for(const entry of [missions,preview])if(entry.dialog.open)void entry.close();
  missions.dialog.querySelector('.halloween-deadline').textContent=t('開催期間：11/8 23:59まで（日本時間）');
  missions.dialog.querySelector('.halloween-period-state').textContent=active?'':t('開催期間は終了しました。');
  missions.dialog.querySelector('.halloween-mission-note').textContent=t('獲得したスキンは期間終了後も使えます。');
  for(const {mission,skin,article} of cards){
   const n=progress.progress(mission.id),owned=skins.owns(skin.id),achieved=progress.achieved(mission.id),claim=article.querySelector('.halloween-claim'),isBoss=mission.id==='boss';
   article.dataset.complete=String(achieved);article.querySelector('h3').textContent=t(mission.title);
   article.querySelector('.halloween-mission-detail').textContent=mission.id==='wins'?t('VS COM・連勝・スカウト・ボスバトルが対象。'):mission.id==='streak'?t('連勝チャレンジ限定。書体は自由。'):t('5連戦の敵を全員倒してクリア。');
   article.querySelector('.halloween-progress-track i').style.width=`${n/mission.target*100}%`;
   article.querySelector('.halloween-progress-count').textContent=t('{n}/{total}勝').replace('{n}',String(n)).replace('{total}',String(mission.target));
   claim.textContent=t(owned?'受取済み':isBoss&&!HALLOWEEN_EVENT.bossAvailable?'準備中':achieved?'受け取る':active?'挑戦中':'終了');claim.disabled=owned||!achieved;
   const previewButton=article.querySelector('.halloween-reward-preview');previewButton.setAttribute('aria-label',t('スキンをプレビュー：{name}').replace('{name}',t(skin.name)));previewButton.querySelector('small').textContent=t('プレビュー');previewButton.querySelector('.halloween-reward-label').textContent=t('スキン');
  }
 }
 const period=watchHalloweenPeriod(render);
 missions.onOpen=()=>{render();trackMissionOpen();};progress.subscribe(render);skins.subscribe(render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)period.refresh();});window.addEventListener('pageshow',()=>period.refresh());window.addEventListener('moji-app-lifecycle',()=>period.refresh());
 window.addEventListener('moji-home-back',()=>{if(preview.dialog.open)void preview.close();else if(missions.dialog.open)void missions.close();});
 return {open(){missions.open();},phase(next){bossPhase=next;bossButton.disabled=next!=='setup'||bossStarting;for(const entry of [missions,preview])entry.phase(next);if(next==='setup')render();}};
}
