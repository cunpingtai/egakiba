import {translate} from './i18n.js?v=1.2.5';
import {STAGES,getStage,DEFAULT_STAGE_ID} from './stages.js';
const STORAGE_KEY='tsukuruum.moji-blade.stage.v1';
const PREVIEW_REVISIONS={"boost-bowl":"30583a645f71","rotating-floor":"633a2e2a9c4c","square":"c074f33f27ad","standard":"e8395feab04a"}; // Shared builds fill this with each PNG's content hash.
function availableStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function readSelectedStage(storage=availableStorage()){
 try{return getStage(storage?.getItem(STORAGE_KEY)).id;}catch{return DEFAULT_STAGE_ID;}
}
export function writeSelectedStage(id,storage=availableStorage()){
 try{storage.setItem(STORAGE_KEY,getStage(id).id);return true;}catch{return false;}
}
function preview(stage){
 const image=document.createElement('img');image.src=`./stage-previews/${stage.id}.png?v=${PREVIEW_REVISIONS[stage.id]||'20261013-06'}`;image.alt='';image.width=640;image.height=400;image.draggable=false;image.decoding='async';return image;
}
// Fit the actual rendered font, including locale fallback and device text scaling.
export function fitStageButtonLabel(button){
 const label=button.querySelector('span');if(!label)return;label.style.fontSize='';
 const width=label.clientWidth;if(!width)return;
 const measured=label.scrollWidth;if(measured>width){const size=parseFloat(getComputedStyle(label).fontSize);label.style.fontSize=`${Math.max(1,Math.floor(size*width/measured*98)/100)}px`;}
}
export function createStageSelection({button,dialog,selectedStage,onApply,onOpen=()=>{},bestWins=()=>0}){
 const cards=dialog.querySelector('.stage-cards'),viewport=dialog.querySelector('.stage-window'),previous=dialog.querySelector('#stage-prev'),next=dialog.querySelector('#stage-next'),error=dialog.querySelector('#stage-error');
 const label=button.querySelector('span');
 if(label){
  let labelFrame=0;const fitLabel=()=>{if(labelFrame)return;labelFrame=requestAnimationFrame(()=>{labelFrame=0;fitStageButtonLabel(button);});};
  if(globalThis.ResizeObserver)new ResizeObserver(fitLabel).observe(button);
  if(globalThis.MutationObserver)new MutationObserver(fitLabel).observe(label,{childList:true,characterData:true,subtree:true});
  document.fonts?.ready.then(fitLabel);document.fonts?.addEventListener('loadingdone',fitLabel);fitLabel();
 }
 let selected=getStage(selectedStage).id,index=STAGES.findIndex(stage=>stage.id===selected),position=index+STAGES.length,enabled=false,gesture=null,suppressClickUntil=0;
 function updateCards(offset=0){
  viewport.scrollLeft=0;
  const card=cards.children[position];
  if(viewport.clientWidth>0&&card)cards.style.transform=`translateX(${viewport.clientWidth/2-card.offsetLeft-card.offsetWidth/2+offset}px)`;
  for(const [i,card] of Array.from(cards.children).entries()){
   const nearby=Math.abs(i-position)<=1;card.dataset.active=String(i===position);card.dataset.side=i<position?'left':'right';
   card.setAttribute('aria-pressed',String(card.dataset.stage===selected));card.setAttribute('aria-hidden',String(!nearby));card.tabIndex=i===position?0:-1;card.inert=!nearby;
  }
 }
 function snapToMiddle(){
  if(position===index+STAGES.length)return;
  const focused=Array.from(cards.children).includes(globalThis.document?.activeElement);cards.classList.add('repositioning');position=index+STAGES.length;updateCards();void cards.offsetWidth;cards.classList.remove('repositioning');if(focused)cards.children[position].focus({preventScroll:true});
 }
 function move(amount){snapToMiddle();index=(index+amount+STAGES.length)%STAGES.length;position+=amount;updateCards();}
 cards.addEventListener('transitionend',event=>{if(event.target===cards&&event.propertyName==='transform')snapToMiddle();});
 function close(restoreFocus=true){gesture=null;cards.classList.remove('dragging');if(dialog.open)dialog.close();if(restoreFocus&&enabled)button.focus({preventScroll:true});}
 function apply(id){
  if(!enabled||Date.now()<suppressClickUntil)return;
  try{if(id!==selected&&onApply(id)===false)return;selected=id;button.dataset.stage=selected;close();}
  catch(cause){console.error(cause);error.textContent='ステージを切り替えられませんでした。';}
 }
 for(const stage of [...STAGES,...STAGES,...STAGES]){
  const card=document.createElement('button');card.type='button';card.className='stage-card';card.dataset.stage=stage.id;
  const name=document.createElement('strong'),description=document.createElement('span'),record=document.createElement('small');name.textContent=stage.name;description.textContent=stage.description;
  record.className='stage-best';record.hidden=true;card.challengeRecord=record;
  card.append(preview(stage),name,description,record);card.addEventListener('click',()=>apply(stage.id));cards.append(card);
 }
 button.addEventListener('click',()=>{
  if(!enabled)return;onOpen();index=STAGES.findIndex(stage=>stage.id===selected);position=index+STAGES.length;cards.classList.add('repositioning');updateCards();error.textContent='';dialog.showModal();updateCards();void cards.offsetWidth;cards.classList.remove('repositioning');cards.children[position].focus({preventScroll:true});
 });
 previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);cards.children[position].focus({preventScroll:true});}});
 viewport.addEventListener('pointerdown',event=>{if(event.isPrimary===false||event.button!==0)return;suppressClickUntil=0;snapToMiddle();gesture={id:event.pointerId,x:event.clientX,dx:0};});
 viewport.addEventListener('pointermove',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;gesture.dx=event.clientX-gesture.x;
  if(Math.abs(gesture.dx)>8){viewport.setPointerCapture(event.pointerId);cards.classList.add('dragging');suppressClickUntil=Date.now()+400;updateCards(gesture.dx);}
 });
 function finishGesture(event,cancelled=false){
  if(!gesture||gesture.id!==event.pointerId)return;
  const dx=gesture.dx;gesture=null;cards.classList.remove('dragging');
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(!cancelled&&Math.abs(dx)>=40)move(dx<0?1:-1);else updateCards();
 }
 viewport.addEventListener('pointerup',event=>finishGesture(event));viewport.addEventListener('pointercancel',event=>finishGesture(event,true));
 // A translated track must not also be scrolled by browser focus handling.
 viewport.addEventListener('scroll',()=>{if(dialog.open&&viewport.scrollLeft)viewport.scrollLeft=0;});
 if(globalThis.ResizeObserver)new ResizeObserver(()=>{
  if(!dialog.open)return;
  gesture=null;cards.classList.remove('dragging');cards.classList.add('repositioning');updateCards();void cards.offsetWidth;cards.classList.remove('repositioning');
 }).observe(viewport);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 button.dataset.stage=selected;updateCards();
 return {close,update(mode,phase,blocked=false,challengeSelectable=false,stageId=selected){
  selected=getStage(stageId).id;button.dataset.stage=selected;
  for(const card of cards.children){card.challengeRecord.hidden=!['challenge','scout'].includes(mode);card.challengeRecord.textContent=mode==='scout'?`${translate('自己ベスト')} ${translate('{n}連勝').replace('{n}',String(bestWins(card.dataset.stage,mode)))}`:`自己ベスト ${bestWins(card.dataset.stage)}連勝`;}
  const supported=['standard','local'].includes(mode)||['challenge','scout'].includes(mode)&&challengeSelectable;
  enabled=supported&&['ready','scout-select'].includes(phase)&&!blocked;button.hidden=!supported||!['ready','scout-select'].includes(phase);button.disabled=!enabled;
  if(!enabled)close(false);
 }};
}
