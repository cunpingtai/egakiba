import {createSkinReceipt} from './skins.js';
import {rewardSkin,skinPaint} from './skin-catalog.js';
import {createEncyclopediaNotices,bindEncyclopediaEntryNotice} from './encyclopedia-notices.js';
import {encyclopediaDirectionIcon} from './encyclopedia-direction.js';
import {createEncyclopediaSupport} from './encyclopedia-support.js';
import {createEncyclopediaRewards,applyGlyphFinish} from './encyclopedia-rewards.js';
import {attachEncyclopediaScrollbar} from './encyclopedia-scrollbar.js';
import {translate as t} from './i18n.js?v=1.2.5';
import {FONTS} from './fonts.js';
import {SCOUT_RARE} from './scout-variant.js';
import {buildEncyclopediaCatalog,filterEncyclopedia,encyclopediaWindow,encyclopediaNeighborHints} from './encyclopedia-catalog.js';
import {encyclopediaSummary,encyclopediaStats} from './encyclopedia-store.js';
import {createEncyclopediaPerformance,PERFORMANCE_SORTS} from './encyclopedia-performance.js';
import {EncyclopediaPreview} from './encyclopedia-preview.js';
const categoryNames={kanji:'漢字',hiragana:'ひらがな',katakana:'カタカナ',alphanumeric:'英数字',symbol:'記号',emoji:'絵文字',other:'その他'};
export function createEncyclopedia({store,libraries,ready,onClose=()=>{},rewards=null,availability=null,skins=null,onSkinReceived=()=>{}}){
 const entry=document.getElementById('encyclopedia-open');if(!entry)return null;
 bindEncyclopediaEntryNotice({store,button:entry});
 const dialog=document.createElement('dialog');dialog.id='encyclopedia';dialog.className='encyclopedia';dialog.setAttribute('aria-labelledby','encyclopedia-title');
 dialog.innerHTML=`<header class="encyclopedia-header"><button type="button" id="encyclopedia-back" class="com-back" aria-label="もどる"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button><h2 id="encyclopedia-title" tabindex="-1" autofocus></h2><button type="button" id="encyclopedia-total" aria-pressed="false" disabled><span class="encyclopedia-reward-lock" aria-hidden="true"><svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5 6V4a3 3 0 0 1 6 0v2h.5A1.5 1.5 0 0 1 13 7.5v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5v-5A1.5 1.5 0 0 1 4.5 6H5Zm1.5 0h3V4a1.5 1.5 0 0 0-3 0v2Z"/></svg></span><span id="encyclopedia-total-label"><span id="encyclopedia-total-count"></span><span id="encyclopedia-total-percent"></span></span></button></header>
 <section id="encyclopedia-list" class="encyclopedia-list"><div class="encyclopedia-tools">
 <input id="encyclopedia-search" type="search" placeholder="文字を検索" aria-label="文字を検索" autocomplete="off" spellcheck="false">
 <div class="encyclopedia-type-font"><select id="encyclopedia-category" aria-label="文字の種類"></select><select id="encyclopedia-list-font" aria-label="書体"></select><label class="encyclopedia-star-filter"><input id="encyclopedia-star-filter" type="checkbox"><span>★</span></label></div><div class="encyclopedia-filters"><select id="encyclopedia-status" aria-label="発見状態"></select><select id="encyclopedia-sort" aria-label="並べ替え"></select><button type="button" id="encyclopedia-direction" class="encyclopedia-direction" aria-label="降順にする"></button></div></div>
 <p id="encyclopedia-support-status" class="encyclopedia-performance-status" role="status" hidden></p><p id="encyclopedia-performance-status" class="encyclopedia-performance-status" role="status" hidden></p><p id="encyclopedia-empty" class="encyclopedia-empty" hidden></p><div id="encyclopedia-scroll" class="encyclopedia-scroll" tabindex="0"><div id="encyclopedia-spacer" class="encyclopedia-spacer"><div id="encyclopedia-grid" class="encyclopedia-grid" role="group" aria-label="文字一覧"></div></div></div></section>
 <section id="encyclopedia-detail" class="encyclopedia-detail" hidden><div class="encyclopedia-model-row"><div class="encyclopedia-model"><canvas id="encyclopedia-canvas" tabindex="0" aria-label="コマを回転・拡大縮小"></canvas><button type="button" id="encyclopedia-holo" class="encyclopedia-holo" aria-label="ホロ表示" aria-pressed="false">★</button><button type="button" id="encyclopedia-playback" class="encyclopedia-playback" aria-label="再生" aria-pressed="false" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 19 12 9 19Z"/></svg></button><p id="encyclopedia-model-error" role="status" hidden></p></div><div class="encyclopedia-stats-panel"><div id="encyclopedia-gauges" class="encyclopedia-gauges"></div><button type="button" id="encyclopedia-copy" class="encyclopedia-copy" aria-label="文字をコピー"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg><span></span></button></div></div>
 <div id="encyclopedia-fonts" class="encyclopedia-fonts segments font-choice connected-radio" role="group" aria-label="書体"></div><div id="encyclopedia-records" class="encyclopedia-records"></div></section>
 <p id="encyclopedia-copy-feedback" class="encyclopedia-copy-feedback opponent-copy-feedback" role="status" aria-live="polite"></p>
 <p id="encyclopedia-save-error" class="encyclopedia-save-error" role="status" hidden></p>`;
 document.body.append(dialog);const $=id=>dialog.querySelector('#encyclopedia-'+id);
 const showSkinReceipt=createSkinReceipt({libraries,onReveal:onSkinReceived});
 const rewardNotice=()=>{entry.toggleAttribute('data-reward-unread',Boolean(skins?.pending().length));if(dialog.open)updateCompletion();};skins?.subscribe(rewardNotice);rewardNotice();
 const listScrollbar=attachEncyclopediaScrollbar($('scroll'),{label:t('スクロール')}),detailScrollbar=attachEncyclopediaScrollbar($('detail'),{label:t('スクロール')});
 const notices=createEncyclopediaNotices({store:{isUnread:char=>store.isUnread?.(char),reviewGlyphs:chars=>store.reviewGlyphs?.(chars)},root:$('scroll'),isVisible:()=>dialog.open&&!$('list').hidden&&!document.hidden});
 let releaseGlyph=()=>{},copyTimer,copyRevision=0;
 let catalog=null,filtered=[],preview=null,glyph=null,font='gothic',rare=false,scrollTop=0,rowHeight=80,revision=0,scheduled=0;
 let hintCatalog=null,hintEntries=null,hintsDirty=true;
 store.subscribe?.(()=>{hintsDirty=true;});
 const options={query:'',category:'',status:'',star:false,sort:'fixed',direction:'asc'};
 rewards ||= createEncyclopediaRewards({store,catalog:()=>buildEncyclopediaCatalog(libraries()),onError:()=>{}});
 availability ||= createEncyclopediaSupport({libraries});rewards.setAvailability(availability);
 let listFont='gothic',sortRevision=0;options.eligible=char=>availability.supports(listFont,char);
 availability.subscribe(event=>queueMicrotask(()=>{
  if(event?.kind==='progress'){if(dialog.open)updateSupportStatus();return;}
  catalog=rewards.catalog();if(!dialog.open)return;
  if(glyph){for(const button of $('fonts').children)button.disabled=!availability.supports(button.dataset.bookFont,glyph);if(!availability.supports(font,glyph)){const next=Object.keys(FONTS).find(id=>availability.supports(id,glyph));if(next){font=next;text();updateDetail();}else back();}else updateCompletion();}
  else refresh(false);
 }));
 const performanceIndex=createEncyclopediaPerformance({libraries,onProgress:({font:target,done,total})=>{if(dialog.open&&target===listFont&&PERFORMANCE_SORTS.has(options.sort))$('performance-status').textContent=t('能力を計算中… {n}/{total}').replace('{n}',number(done)).replace('{total}',number(total));}});
 const number=value=>String(value);
 function optionList(id,values){const select=$(id),selected=select.value;select.replaceChildren(...values.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=t(label);return option;}));select.value=selected||'';}
 function text(){
  const title=$('title');title.replaceChildren();title.toggleAttribute('data-no-i18n',Boolean(glyph));
  if(glyph){
   const character=document.createElement('span'),unicode=document.createElement('span');character.className='encyclopedia-title-glyph';character.textContent=glyph;applyGlyphFinish(character,null,glyph,false);unicode.className='encyclopedia-unicode';
   unicode.textContent=`(${Array.from(glyph,char=>'U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' ')})`;title.append(character,unicode);
  }else title.textContent=t('文字図鑑');
  optionList('category',[['','すべての文字'],...Object.entries(categoryNames)]);
  optionList('status',[['','すべての状態'],['unseen','未発見'],['seen','発見・使用済'],['unlocked','撃破・勝利済']]);
  optionList('sort',[['fixed','文字種順'],['recent','最近発見した順'],['uses','使用回数順'],['speed','スピード順'],['power','パワー順'],['balance','バランス順'],['total','万能順']]);$('sort').value=options.sort;
  $('star-filter').parentElement.setAttribute('title',t('レア撃破済み'));$('star-filter').setAttribute('aria-label',t('レア撃破済み'));
  $('fonts').replaceChildren(...Object.entries(FONTS).map(([id,spec])=>{const button=document.createElement('button');button.type='button';button.textContent=t(spec.label);button.dataset.bookFont=id;button.disabled=Boolean(glyph&&!availability.supports(id,glyph));button.setAttribute('aria-pressed',String(font===id));button.onclick=()=>{font=id;updateDetail();};return button;}));
  optionList('list-font',Object.entries(FONTS).map(([id,spec])=>[id,spec.label]));$('list-font').value=listFont;
  $('grid').style.setProperty('--encyclopedia-font',`${FONTS[listFont].family},${FONTS[listFont].fallback}`);
  $('direction').innerHTML=encyclopediaDirectionIcon(options.direction);$('direction').setAttribute('aria-label',t(options.direction==='asc'?'降順にする':'昇順にする'));$('direction').title=t(options.direction==='asc'?'昇順':'降順');
  $('copy').querySelector('span').textContent=t('コピー');$('copy').setAttribute('aria-label',t('文字をコピー'));
  $('empty').textContent=t('該当する文字がありません');updateCompletion();listScrollbar.refresh(t('スクロール'));detailScrollbar.refresh(t('スクロール'));
 }
 function updateSupportStatus(){
  const {done=0,total=0}=availability.progress||{};$('support-status').hidden=availability.ready;
  $('support-status').textContent=t('残りの文字をバックグラウンドで確認中… {n}/{total}（初回のみ）').replace('{n}',number(done)).replace('{total}',number(total));
 }
 function updateCompletion(){
  const progress=rewards.progress(options.category),button=$('total');$('total-count').textContent=t('{done}/{total}文字').replace('{done}',number(progress.completed)).replace('{total}',number(progress.total));$('total-percent').textContent=`(${progress.percent.toFixed(1)}%)`;updateSupportStatus();
  if(skins){button.disabled=!skins.claimable(options.category);button.removeAttribute('aria-pressed');button.dataset.claimed=String(skins.claimed(options.category));button.toggleAttribute('data-unread',skins.claimable(options.category));button.dataset.reward=options.category?'skin':'rainbow';const reward=rewardSkin(options.category);button.style.setProperty('--reward-paint',skinPaint(reward));button.style.setProperty('--reward-edge',reward?.color||'#8294ad');button.style.setProperty('--reward-ink',['sapphire','obsidian','candy'].includes(reward?.id)?'#fff':'#283548');button.title=t(button.disabled?'コンプリートでスキンを解禁':'スキンを受け取る');entry.toggleAttribute('data-reward-unread',skins.pending().length>0);return;}
  button.disabled=!rewards.unlocked(options.category);button.setAttribute('aria-pressed',String(rewards.active(options.category)));button.dataset.reward=options.category?'gold':'rainbow';button.title=t(options.category?(button.disabled?'コンプリートで金色の文字を解禁':'金色の文字を切り替える'):(button.disabled?'全種類コンプリートで虹色の文字を解禁':'虹色の文字を切り替える'));
 }
 function refresh(reset=true){
  if(hintsDirty||hintCatalog!==catalog||hintEntries!==store.entries){options.hints=encyclopediaNeighborHints(catalog||[],store.entries);hintCatalog=catalog;hintEntries=store.entries;hintsDirty=false;}
  filtered=filterEncyclopedia(catalog||[],store.entries,options,performanceIndex.map(listFont));
  updateCompletion();
  const sortToken=++sortRevision,performanceSort=PERFORMANCE_SORTS.has(options.sort);$('performance-status').hidden=!performanceSort;
  if(performanceSort){
   const owned=filtered.filter(char=>encyclopediaSummary(store.entries[char]).unlocked);
   $('performance-status').textContent=t('能力を計算中… {n}/{total}').replace('{n}','0').replace('{total}',String(owned.length));$('grid').setAttribute('aria-busy','true');
   performanceIndex.ensure(listFont,owned).then(success=>{if(sortToken!==sortRevision||!dialog.open)return;$('grid').removeAttribute('aria-busy');$('performance-status').hidden=success;if(!success)$('performance-status').textContent=t('能力を計算できませんでした。並べ替えを選び直してください。');if(success){filtered=filterEncyclopedia(catalog||[],store.entries,options,performanceIndex.map(listFont));$('scroll').scrollTop=scrollTop;renderGrid();}});
  }else{performanceIndex.cancel();$('grid').removeAttribute('aria-busy');}
  $('empty').hidden=filtered.length!==0;if(reset){scrollTop=0;$('scroll').scrollTop=0;}renderGrid();
 }
 function renderGrid(){
  const viewport=$('scroll'),width=viewport.clientWidth;if(!width||$('list').hidden)return;
  rowHeight=(width-18-24)/5+6;const window=encyclopediaWindow({scrollTop:viewport.scrollTop,height:viewport.clientHeight,rowHeight,count:filtered.length});
  $('spacer').style.height=`${window.total}px`;$('grid').style.transform=`translateY(${window.offset}px)`;$('grid').style.gridAutoRows=`${rowHeight-6}px`;
  notices.resetTargets();const children=[];
  for(let index=window.start;index<Math.min(filtered.length,window.end);index++){
   const char=filtered[index],summary=encyclopediaSummary(store.entries[char]),seen=summary.seen||options.hints?.has(char),button=document.createElement('button');button.type='button';button.className='encyclopedia-cell';button.dataset.noI18n='';button.dataset.state=summary.unlocked?'unlocked':seen?'seen':'unseen';
   button.textContent=seen?char:'−';button.setAttribute('aria-label',seen?`${char} ${t(summary.unlocked?'撃破・勝利済':'発見・使用済')}`:t('未発見'));button.setAttribute('aria-disabled',String(!seen));button.tabIndex=seen?0:-1;button.disabled=!seen;if(seen&&!summary.unlocked)button.title=t('文字をコピー');
   if(summary.unlocked){const label=document.createElement('span');label.className='encyclopedia-cell-glyph';label.textContent=char;button.textContent='';button.append(label);applyGlyphFinish(label,null,char,false);}
   if(summary.rareDefeated){const star=document.createElement('span');star.className='encyclopedia-cell-star';star.textContent='★';star.setAttribute('aria-label',t('レア撃破済み'));button.append(star);}
   if(store.isUnread?.(char)){const dot=document.createElement('span');dot.className='encyclopedia-cell-new';dot.setAttribute('aria-hidden','true');button.append(dot);button.classList?.toggle('has-new',true);}
   button.onclick=()=>{if(summary.unlocked)openDetail(char);else if(seen)copyGlyph(char,button);};children.push(button);
  }
  availability.prioritize?.(filtered.slice(window.start,window.end).filter(char=>encyclopediaSummary(store.entries[char]).seen||options.hints?.has(char)));
  $('grid').replaceChildren(...children);for(let i=0;i<children.length;i++)notices.observe(children[i],filtered[window.start+i]);listScrollbar.refresh();
 }
 function queueGrid(){if(scheduled)return;scheduled=requestAnimationFrame(()=>{scheduled=0;renderGrid();});}
 function playbackState({playing=false,busy=true}={}){
  const button=$('playback');button.disabled=busy;button.setAttribute('aria-label',t(playing?'停止':'再生'));button.title=t(playing?'停止':'再生');button.setAttribute('aria-pressed',String(playing));button.querySelector('path').setAttribute('d',playing?'M7 7H17V17H7Z':'M9 5 19 12 9 19Z');
 }
 function clearPreview(){preview?.dispose();preview=null;releaseGlyph();releaseGlyph=()=>{};playbackState();}
 function records(){
  const c=encyclopediaStats(store.entries[glyph],font,rare),sections=[
   ['自分で使った記録',[[['使用回数',c.uses]],[['勝ち',c.wins],['負け',c.losses]],[['引き分け',c.draws],['勝率',c.winRate===null?'−':`${Math.round(c.winRate*100)}%`]]]],
   ['対戦相手としての記録',[[['遭遇回数',c.encounters]],[['倒した回数',c.defeated],['負けた回数',c.lostTo]],[['引き分け',c.enemyDraws]]]],
   ['スカウトの記録',[[['加入回数',c.recruits]]]]
  ];
  $('records').replaceChildren(...sections.map(([title,rows])=>{const section=document.createElement('section'),h=document.createElement('h3'),list=document.createElement('div');h.textContent=t(title);list.className='encyclopedia-record-rows';
   for(const values of rows){const row=document.createElement('dl');row.className='encyclopedia-record-row';row.classList.toggle('is-paired',values.length===2);
    for(const [label,value] of values){const cell=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');cell.className='encyclopedia-record-cell';dt.textContent=t(label);dd.textContent=String(value);dd.dataset.noI18n='';cell.append(dt,dd);row.append(cell);}list.append(row);
   }section.append(h,list);return section;}));
 }

 function gauges(stats){
  $('gauges').replaceChildren(...['speed','power','balance'].map((key,index)=>{
   const label=document.createElement('label'),name=document.createElement('span'),bar=document.createElement('span'),base=document.createElement('span');label.className='encyclopedia-stat';name.textContent=t(['スピード','パワー','バランス'][index]);
   bar.className='encyclopedia-meter'+(rare?' is-rare':'');bar.setAttribute('role','meter');bar.setAttribute('aria-label',name.textContent);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(100+SCOUT_RARE.bonus*100));bar.setAttribute('aria-valuenow',String(Math.round(stats[key]*100)));
   base.className='encyclopedia-meter-base';base.style.width=`${(stats[key]-(rare?SCOUT_RARE.bonus:0))*100}%`;bar.append(base);
   if(rare){const bonus=document.createElement('span');bonus.className='encyclopedia-meter-bonus';bonus.style.left=base.style.width;bonus.style.width=`${SCOUT_RARE.bonus*100}%`;bar.append(bonus);}label.append(name,bar);return label;
  }));
 }
 async function updateDetail(){
  const token=++revision;applyGlyphFinish($('title').querySelector('.encyclopedia-title-glyph'),null,glyph,false);records();detailScrollbar.refresh();$('holo').setAttribute('aria-pressed',String(rare));for(const button of $('fonts').children)button.setAttribute('aria-pressed',String(button.dataset.bookFont===font));
  $('gauges').replaceChildren();$('model-error').hidden=true;playbackState();
  try{
   await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==revision||!glyph||!dialog.open)return;
   const lib=libraries().get(font);if(!lib?.supports(glyph)){availability.reject(font,glyph);throw Error('unsupported');}clearPreview();const owned=!lib.cache.has(glyph),char=glyph,base=lib.get(char,'mixed');
   if(owned)releaseGlyph=()=>{if(lib.cache.get(char)===base){lib.cache.delete(char);base.geometry.dispose();}};
   // A fresh canvas does not inherit the deliberately lost context of a closed preview.
   const previous=$('canvas'),canvas=previous.cloneNode();previous.replaceWith(canvas);preview=new EncyclopediaPreview(canvas);preview.onError=()=>{clearPreview();$('model-error').textContent=t('3D表示を再開するには書体を選び直してください');$('model-error').hidden=false;};
   preview.onStateChange=playbackState;gauges(preview.show(base,rare));
  }catch{
   clearPreview();$('model-error').textContent=t('この書体では表示できません');$('model-error').hidden=false;
  }
 }
 function clearCopyFeedback(){++copyRevision;clearTimeout(copyTimer);$('copy-feedback').textContent='';$('copy-feedback').classList.remove('is-visible');}
 async function copyGlyph(value,anchor){
  if(!value)return;clearCopyFeedback();const token=copyRevision;let copied=false;
  try{await navigator.clipboard.writeText(value);copied=true;}catch{
   const field=document.createElement('textarea'),focus=document.activeElement;field.value=value;field.readOnly=true;field.style.cssText='position:fixed;left:-9999px;top:0';dialog.append(field);field.select();
   try{copied=document.execCommand('copy');}catch{}finally{field.remove();focus?.focus?.({preventScroll:true});}
  }
  if(!dialog.open||token!==copyRevision||!anchor.isConnected)return;
  const feedback=$('copy-feedback');feedback.textContent=t(copied?'コピーしました':'コピーできませんでした');
  const target=anchor.getBoundingClientRect(),bounds=dialog.getBoundingClientRect(),half=feedback.offsetWidth/2;
  feedback.style.left=`${Math.max(half+8,Math.min(dialog.clientWidth-half-8,target.left+target.width/2-bounds.left-dialog.clientLeft))}px`;
  feedback.style.top=`${Math.max(24,target.top-bounds.top-dialog.clientTop-feedback.offsetHeight-6)}px`;
  void feedback.offsetWidth;feedback.classList.add('is-visible');copyTimer=setTimeout(clearCopyFeedback,1600);
 }
 function openDetail(char){
  notices.detail(char);clearCopyFeedback();
  scrollTop=$('scroll').scrollTop;glyph=char;font=listFont;rare=false;$('list').hidden=true;$('detail').hidden=false;$('detail').scrollTop=0;
  $('holo').hidden=!encyclopediaSummary(store.entries[glyph]).rareDefeated;text();updateDetail();$('title').focus({preventScroll:true});
 }
 function back(){
  clearCopyFeedback();
  ++revision;clearPreview();
  if(glyph){glyph=null;$('detail').hidden=true;$('list').hidden=false;text();refresh(false);$('scroll').scrollTop=scrollTop;renderGrid();$('scroll').focus({preventScroll:true});}
  else{availability.pause?.();notices.close();dialog.close();onClose();entry.focus({preventScroll:true});}
 }
 function open(){if(!ready())return;notices.open();availability.ensure(buildEncyclopediaCatalog(libraries()),{priority:Object.keys(store.entries).sort((a,b)=>Number(encyclopediaSummary(store.entries[b]).unlocked)-Number(encyclopediaSummary(store.entries[a]).unlocked))});glyph=null;catalog ||= rewards.catalog();text();$('list').hidden=false;$('detail').hidden=true;dialog.showModal();refresh(false);$('scroll').scrollTop=scrollTop;renderGrid();$('title').focus({preventScroll:true});}
 $('copy').onclick=()=>copyGlyph(glyph,$('copy'));
 $('total').onclick=()=>{if(skins){const skin=skins.claim(options.category);if(skin){updateCompletion();showSkinReceipt(skin);}return;}if(rewards.toggle(options.category)){updateCompletion();if(glyph)updateDetail();else renderGrid();}};
 $('playback').onclick=async()=>{const active=preview;if(!active)return;if(active.playing)active.stop();else try{await active.play();}catch{if(preview===active){clearPreview();$('model-error').textContent=t('3D表示を再開するには書体を選び直してください');$('model-error').hidden=false;}}};
 entry.onclick=open;$('back').onclick=back;$('holo').onclick=()=>{rare=!rare;updateDetail();};
 for(const [id,key,event] of [['search','query','input'],['category','category','change'],['status','status','change'],['sort','sort','change'],['star-filter','star','change']])$(id).addEventListener(event,()=>{options[key]=key==='star'?$(id).checked:$(id).value;if(key==='query')availability.prioritize?.(Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(options.query.normalize('NFC')),part=>part.segment).filter(char=>char.trim()));if(key==='sort'){options.direction=options.sort==='fixed'?'asc':'desc';text();}refresh();});
 $('list-font').onchange=()=>{listFont=$('list-font').value;text();refresh();};
 $('direction').onclick=()=>{options.direction=options.direction==='asc'?'desc':'asc';text();refresh();};
 $('scroll').addEventListener('scroll',()=>{scrollTop=$('scroll').scrollTop;queueGrid();},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)availability.pause?.();else if(dialog.open){availability.ensure(buildEncyclopediaCatalog(libraries()),{priority:Object.keys(store.entries).sort((a,b)=>Number(encyclopediaSummary(store.entries[b]).unlocked)-Number(encyclopediaSummary(store.entries[a]).unlocked))});queueGrid();}});
 new ResizeObserver(queueGrid).observe($('scroll'));
 dialog.addEventListener('cancel',event=>{event.preventDefault();back();});
 dialog.addEventListener('close',()=>{availability.pause?.();notices.close();clearCopyFeedback();++revision;++sortRevision;performanceIndex.cancel();clearPreview();});
 window.addEventListener('moji-app-back',event=>{if(dialog.open){event.stopImmediatePropagation();back();}},true);
 new MutationObserver(()=>{if(dialog.open){text();if(glyph){records();updateDetail();}else refresh(false);}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

 return {open,back,get opened(){return dialog.open;},saveError(kind){$('save-error').textContent=t(kind==='preferences'?'図鑑の表示設定を読み込めません。設定は上書きしません。':kind==='temporary'?'図鑑はこの環境の代替保存先に記録します。':kind==='invalid'?'図鑑の保存データを読み込めませんでした。新しく記録します。':'図鑑を保存できません。この画面内では記録を続けます。');$('save-error').hidden=false;}};
}
