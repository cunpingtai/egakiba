import {translate as t} from './i18n.js?v=1.2.5';
import {createUpdateNotice} from './update-notice.js';

export function initHomeNotices(){
 const $=id=>document.getElementById(id),release=$('release-dialog'),help=$('help-dialog'),update=$('app-update-dialog'),button=$('app-update-open');
 if(!release||!help||!update||!button)return {phase(){}};
 const list=document.querySelector('.release-notes .release-list');if(list)$('release-content').append(list);
 const guide=document.querySelector('.guide>div');if(guide)$('help-content').append(guide);
 const native=window.mojiBladeApp,supported=native?.updatesSupported===true;
 let closing=new WeakSet(),opening=new WeakMap(),autoQueued=false,alive=true,manual=false,manualPending=false,attempt=null;
 const canPrompt=()=>alive&&document.body.dataset.phase==='setup'&&!document.hidden&&!native?.paused&&!document.querySelector('dialog[open]')&&document.getElementById('skin-panel')?.hidden!==false&&document.getElementById('skin-panel-2p')?.hidden!==false;
 const show=dialog=>{
  if(dialog.open||closing.has(dialog))return;
  dialog.showModal();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)opening.set(dialog,dialog.animate([{opacity:0,transform:'translate(-50%,calc(-50% + 12px)) scale(.96)'},{opacity:1,transform:'translate(-50%,-50%)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'}));
 };
 const close=async dialog=>{
  if(!dialog.open||closing.has(dialog))return;closing.add(dialog);opening.get(dialog)?.cancel();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){try{await dialog.animate([{opacity:1,transform:'translate(-50%,-50%)'},{opacity:0,transform:'translate(-50%,calc(-50% + 8px)) scale(.97)'}],{duration:150,easing:'ease-in'}).finished;}catch{}}
  dialog.close();closing.delete(dialog);
 };
 let storage;try{storage=localStorage;}catch{}
 button.hidden=!supported;button.dataset.updateAvailable='false';
 function renderUpdate(status){
  const kind=['available','current','error','checking'].includes(status)?status:'error';
  const titles={available:'アップデートがあります',current:'最新バージョンです',checking:'更新を確認中…',error:'更新を確認できませんでした'};
  const messages={available:'Google Playで更新できます。',current:'このままお楽しみください。',checking:'Google Playに確認しています。',error:'通信状況を確認して再試行してください。'};
  update.dataset.state=kind;$('app-update-title').textContent=t(titles[kind]);$('app-update-message').textContent=t(messages[kind]);
  $('app-update-later').textContent=t(kind==='available'?'あとで':'閉じる');
  $('app-update-store').hidden=kind!=='available';$('app-update-retry').hidden=kind!=='error';$('app-update-error').hidden=true;
 }
 const model=createUpdateNotice({check:()=>native.checkForUpdate(),storage,onChange:state=>{
  button.dataset.updateAvailable=String(state.available);
  if(manual&&update.open){if(state.available)model.prompted();renderUpdate(state.status);}
  else maybePrompt();
 }});
 function maybePrompt(){
  if(!supported||manualPending||autoQueued||!canPrompt()||!model.shouldPrompt())return;
  autoQueued=true;
  // Let synchronous HOME state changes and other modals settle first.
  queueMicrotask(()=>{autoQueued=false;if(!manualPending&&canPrompt()&&model.shouldPrompt()){manual=false;model.prompted();renderUpdate('available');show(update);}});
 }
 const dismiss=()=>{manual=false;if(attempt)attempt.cancelled=true;model.dismiss();void close(update);};
 async function checkManually(){
  if(!supported||manualPending)return;
  manual=true;manualPending=true;const current=attempt={cancelled:false};renderUpdate('checking');show(update);
  await model.check(true);manualPending=false;
  if(current.cancelled){model.dismiss();return;}
  if(manual&&update.open){if(model.state().available)model.prompted();renderUpdate(model.state().status);}
 }
 $('help-open').addEventListener('click',()=>show(help));
 $('help-close').addEventListener('click',()=>void close(help));
 $('release-open').addEventListener('click',()=>show(release));
 $('release-close').addEventListener('click',()=>void close(release));
 button.addEventListener('click',checkManually);
 $('app-update-retry').addEventListener('click',checkManually);
 $('app-update-later').addEventListener('click',dismiss);
 $('app-update-store').addEventListener('click',async()=>{
  if(!model.state().available)return;
  const action=$('app-update-store');if(action.disabled)return;action.disabled=true;
  try{await native.openUpdateStore();model.dismiss();void close(update);}catch{$('app-update-error').textContent=t('Google Playを開けませんでした。もう一度お試しください。');$('app-update-error').hidden=false;}finally{action.disabled=false;}
 });
 for(const dialog of [release,help,update]){
  dialog.dataset.keyboardFocus='false';
  dialog.addEventListener('pointerdown',()=>{dialog.dataset.keyboardFocus='false';});
  dialog.addEventListener('keydown',event=>{if(event.key==='Tab')dialog.dataset.keyboardFocus='true';});
  dialog.addEventListener('close',()=>{dialog.dataset.keyboardFocus='false';});
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(dialog===update)dismiss();else void close(dialog);});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog===update)dismiss();else void close(dialog);}});
 }
 window.addEventListener('moji-home-back',()=>{if(release.open)void close(release);else if(help.open)void close(help);else if(update.open)dismiss();});
 document.addEventListener('close',()=>{maybePrompt();},true);
 const refresh=()=>{if(supported&&document.body.dataset.phase==='setup'&&!document.hidden&&!native?.paused){void model.check();maybePrompt();}};
 document.addEventListener('visibilitychange',refresh);
 document.addEventListener('moji-skin-closed',refresh);
 window.addEventListener('moji-app-lifecycle',refresh);
 window.addEventListener('online',()=>{if(supported&&canPrompt())void model.check(true);});
 window.addEventListener('pagehide',()=>{alive=false;});
 window.addEventListener('pageshow',()=>{alive=true;refresh();});
 return {phase(next){
  if(next!=='setup'){if(help.open)help.close();if(release.open)release.close();if(update.open){manual=false;if(attempt)attempt.cancelled=true;model.dismiss();update.close();}return;}
  refresh();
 }};
}
