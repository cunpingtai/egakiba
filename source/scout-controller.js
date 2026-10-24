import {applySkinVariables} from './skin-catalog.js';
import {applyGlyphFinish} from './encyclopedia-rewards.js';
import {encyclopediaMatchId} from './encyclopedia-store.js';
import {scoutStats,SCOUT_RARE} from './scout-variant.js';
import {scoutPartyBonus,scoutBenchBonus,SCOUT_PARTY_BONUS} from './scout-party-bonus.js';
import {prepareScoutRadicals,scoutRadicalSymbol} from './scout-radicals.js';
import {prepareGlyphSymmetry} from './glyph-symmetry.js';
import {FONTS} from './fonts.js';
import {STAGES,getStage} from './stages.js';
import {statGauges,createComLaunch} from './config.js';
import {translate as t} from './i18n.js?v=1.2.5';
import {prepareScoutStart,prepareScoutStarterEnemy,chooseScoutStarter,chooseInitialScoutMember,loadScoutRun,saveScoutRun,readScoutBests,rememberScoutBest,scoutStarLabel,prepareScoutEnemy,selectScoutMember,beginScoutBattle,reselectScoutMember,settleScoutBattle,scoutRecruitChoice,retireScoutRun,suspendScoutRun} from './scout-run.js';

const $=id=>document.getElementById(id);
const fontName=id=>t(FONTS[id].label);
function browserStorage(){try{return localStorage;}catch{return null;}}
const family=id=>`${FONTS[id].family},${FONTS[id].fallback}`;
export function createScoutController(api){
 const storage=()=>api.storage?api.storage():browserStorage();
 let run=loadScoutRun(storage()),working=false,leaving=false,lastPanelPhase=null,shownEnemyId=null,pendingBest=false;
 const root=document.createElement('div');root.id='scout-ui';root.innerHTML=`
 <button type="button" id="scout-menu" class="scout-menu" hidden aria-label="スカウトの操作メニュー" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
 <button type="button" id="scout-reselect" class="scout-reselect" hidden aria-label="仲間を選び直す"><span>選び直す</span></button>
 <section id="scout-panel" class="scout-panel" hidden aria-label="スカウトパーティー">
  <div id="scout-choice-heading" class="scout-choice-heading"><strong id="scout-choice-label">パーティ</strong><strong id="scout-choice-prompt">どれで挑む？</strong><strong id="scout-choice-count"></strong></div><div id="scout-bonuses" class="scout-bonuses" role="status" hidden></div><div class="scout-panel-heading"><h2 id="scout-heading"></h2></div>
  <p id="scout-message" role="status"></p><div id="scout-reward-row" class="scout-reward-row" hidden><div id="scout-candidate" class="scout-candidate" hidden></div><p id="scout-count"></p></div>
  <div id="scout-actions" class="scout-actions"></div>
  <div id="scout-party" class="scout-party" role="group" aria-label="手持ちの仲間"></div>
 </section>
 <dialog id="scout-entry" class="scout-popover scout-entry-popover" aria-label="スカウトチャレンジ">
  <div class="scout-popover-content"><div class="scout-entry-actions"><button type="button" id="scout-new" class="primary">はじめから</button><button type="button" id="scout-resume" class="primary">つづきから</button></div><aside id="scout-entry-progress" class="scout-entry-progress"></aside></div>
 </dialog>
 <dialog id="scout-pause" class="scout-popover scout-menu-popover" aria-label="スカウトの操作メニュー">
  <div class="scout-popover-content"><button type="button" id="scout-suspend" class="primary">中断する</button><button type="button" id="scout-retire" class="primary">リタイア</button></div>
 </dialog>
 <dialog id="scout-confirm" class="scout-dialog"><h2 id="scout-confirm-title"></h2><p id="scout-confirm-message"></p><aside id="scout-confirm-progress" class="scout-entry-progress scout-confirm-progress" hidden></aside><div class="scout-actions"><button type="button" id="scout-confirm-yes">確定</button><button type="button" id="scout-confirm-no" class="primary" autofocus>キャンセル</button></div></dialog>
 <p id="scout-error" class="scout-error" role="alert" hidden></p>`;
 document.body.append(root);
 // Safari marks modal autofocus as focus-visible even when opened by a tap.
 root.dataset.keyboardFocus='false';
 document.addEventListener('keydown',event=>{if(event.key==='Tab')root.dataset.keyboardFocus='true';});
 document.addEventListener('pointerdown',()=>{root.dataset.keyboardFocus='false';});
 const dialogs=[$('scout-entry'),$('scout-pause'),$('scout-confirm')];let confirmation=null;
 function score(value=run?.wins||0){return t('{n}連勝').replace('{n}',String(value));}
 function persist(){if(!saveScoutRun(run,storage())){$('storage-note').hidden=false;error(t('途中経過を保存できません。この画面を閉じると続きから再開できません。'));}}
 function replayCollection(){
  if(run?.bookResult){api.collection?.settle({...run.bookResult,mode:'scout'});api.missionResult?.(run.bookResult);}
  if(run?.bookReward)api.collection?.recruit(run.bookReward);
 }
 function commit(next){
  if(run?.phase==='starter'&&next.phase==='aim'&&next.party.filter(Boolean).length===1){
   const unit=next.party.find(Boolean),id=next.bookId||encyclopediaMatchId();
   if(run.starters.some(m=>m.glyph===unit.glyph&&m.font===unit.font))next={...next,bookId:id,bookRound:0,bookReward:{id:id+':starter',starter:true,unit:{glyph:unit.glyph,font:unit.font,rare:false}}};
  }
  if(['recruit','replace'].includes(run?.phase)&&run.enemy&&!next.enemy&&next.phase==='select'&&run.bookResult?.winner===0&&next.bookResult?.id===run.bookResult.id){
   const oldIds=new Set(run.party.filter(Boolean).map(m=>m.id)),unit=next.party.find(m=>m&&!oldIds.has(m.id));
   if(unit&&unit.glyph===run.enemy.glyph&&unit.font===run.enemy.font&&unit.rare===run.enemy.rare)next={...next,bookReward:{id:run.bookResult.id,unit:{glyph:unit.glyph,font:unit.font,rare:unit.rare===true}}};
  }
  run=next;persist();replayCollection();if(run.phase==='ended'&&run.endReason==='retired')api.collection?.abandon(run.bookActive);
 }
 function error(message){$('scout-error').textContent=message;$('scout-error').hidden=!message;}
 function pauseSound(){api.cancelInput();api.pause(true);}
 function resumeSound(){api.pause(false);}
 function animatePopover(dialog,opening){
  if(!dialog.classList.contains('scout-popover')||typeof dialog.animate!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
  const current={transform:getComputedStyle(dialog).transform,opacity:getComputedStyle(dialog).opacity};dialog.getAnimations().forEach(animation=>animation.cancel());
  const small={transform:'scale(.68)',opacity:0},full={transform:'scale(1)',opacity:1};
  const closing=[current,{offset:.78,transform:'scale(.45)',opacity:current.opacity},{transform:'scale(.2)',opacity:0}];
  return dialog.animate(opening?[small,full]:closing,{duration:opening?240:180,easing:opening?'cubic-bezier(.16,1,.3,1)':'cubic-bezier(.4,0,.6,1)',fill:opening?'none':'forwards'}).finished.catch(()=>{});
 }
 function showDialog(dialog){pauseSound();dialog.showModal();api.cue?.('popoverOpen');animatePopover(dialog,true);}
 async function closeDialog(dialog){
  if(!dialog.open)return;api.cue?.('popoverClose');await animatePopover(dialog,false);dialog.close();
  if(dialog===$('scout-pause'))$('scout-menu').setAttribute('aria-expanded','false');if(!dialogs.some(d=>d.open))resumeSound();
 }
 function confirm(title,message,action,showProgress=false){confirmation=action;$('scout-confirm').classList.toggle('is-new-run',showProgress);$('scout-confirm-yes').textContent=t(showProgress?'はじめから':'リタイア');$('scout-confirm-no').textContent=t(showProgress?'キャンセル':'つづける');$('scout-confirm-progress').hidden=!showProgress;if(showProgress)renderEntryProgress(true,$('scout-confirm-progress'));$('scout-confirm-title').textContent=t(title);$('scout-confirm-message').textContent=t(message);showDialog($('scout-confirm'));$('scout-confirm-no').focus({preventScroll:true});}
 function button(label,action,primary=false){const b=document.createElement('button');b.type='button';b.textContent=t(label);if(primary)b.className='primary';b.onclick=()=>guard(action);return b;}
 async function guard(action){if(working)return;working=true;renderButtons();try{error('');await action();}catch(cause){error(t(cause.message||'スカウトを再開できませんでした。'));}finally{working=false;renderButtons();}}
 function renderButtons(){for(const b of root.querySelectorAll('button'))if(!b.dataset.unavailable)b.disabled=working;if(!working&&$('scout-confirm').open&&document.activeElement===$('scout-confirm'))$('scout-confirm-no').focus({preventScroll:true});}
 async function warmPartyShapes(){if(!run||run.phase==='starter'||run.phase==='ended'||run.party.filter(Boolean).length!==3)return;await prepareScoutRadicals(run.party);for(const member of run.party)await prepareGlyphSymmetry(api.libs().get(member.font).measure(member.glyph,'mixed'));}
 function partyBonuses(){return scoutPartyBonus(run?.party,member=>api.libs().get(member.font)?.measure(member.glyph,'mixed'));}
 function memberBonus(member){return run?.phase!=='starter'&&run?.party.some(m=>m?.id===member.id)?Math.round((partyBonuses().amount+scoutBenchBonus(member))*100)/100:0;}
 function metrics(member){return scoutStats(api.libs().get(member.font).measure(member.glyph,'mixed'),member.rare,memberBonus(member));}
 function renderBonuses(){
  const bonus=partyBonuses(),active=api.active()&&!leaving&&run?.phase!=='ended'&&run?.phase!=='starter'&&bonus.amount>0,labels=[];
  if(bonus.font)labels.push(t('{font}統一 ＋5%').replace('{font}',fontName(bonus.font)));
  if(bonus.category){const names={kanji:'漢字',hiragana:'ひらがな',katakana:'カタカナ',alphanumeric:'英数字',symbol:'記号',emoji:'絵文字',other:'その他'};labels.push(t(bonus.category==='kanji'?'{category}統一 ＋5%':'{category}統一 ＋10%').replace('{category}',t(names[bonus.category])));}
  if(bonus.radical)labels.push(t('「{radical}」統一 ＋10%').replace('{radical}',scoutRadicalSymbol(bonus.radical)));
  if(bonus.rare)labels.push(t('レア文字統一 ＋10%'));
  if(bonus.symmetry.line)labels.push(t('線対称統一 ＋5%'));
  if(bonus.symmetry.point)labels.push(t('点対称統一 ＋5%'));
  if(bonus.victoryTier)labels.push(t('{n}勝以上統一 ＋{bonus}%').replace('{n}',bonus.victoryTier).replace('{bonus}',Math.round(SCOUT_PARTY_BONUS.wins[bonus.victoryTier]*100)));
  for(const [key,label] of Object.entries({speed:'スピード↑統一 ＋5%',power:'パワー↑統一 ＋5%',balance:'バランス↑統一 ＋5%'}))if(bonus.stats[key])labels.push(t(label));
  const panel=$('scout-bonuses');panel.hidden=!active;
  const nodes=()=>labels.map(label=>{const node=document.createElement('span');node.textContent=label;return node;});
  panel.replaceChildren(...nodes());panel.setAttribute('aria-label',t('編成ボーナス')+' '+labels.join(' / '));
 }

 function rareStar(){const star=document.createElement('span');star.className='scout-rare-star';star.textContent='★';star.setAttribute('aria-label',t('レア'));return star;}
 function card(member,index,interactive=false){
  const b=document.createElement(interactive?'button':'div');b.className='scout-slot';if(interactive)b.type='button';
  if(!member){b.classList.add('is-empty');b.textContent=t('空き');if(interactive){b.disabled=true;b.dataset.unavailable='true';}return b;}
  b.dataset.memberId=member.id;b.classList.toggle('is-rare',member.rare===true);b.classList.toggle('is-buffed',memberBonus(member)>0);const glyph=document.createElement('strong');glyph.className='scout-glyph';glyph.style.fontFamily=family(member.font);glyph.textContent=member.glyph;applyGlyphFinish(glyph,api.rewards,member.glyph,index>=0);
  if(index>=0){applySkinVariables(b,api.rewards?.selected?.());b.classList.add('has-win-count');if(member.battleWins>0){const wins=document.createElement('span');wins.className='scout-member-wins';wins.textContent=t('{n}勝中').replace('{n}',String(member.battleWins));b.append(wins);}}
  const name=document.createElement('span');name.className='scout-font';name.textContent=fontName(member.font);const portrait=document.createElement('span');portrait.className='scout-glyph-wrap';portrait.append(glyph);if(member.rare)portrait.append(rareStar());b.append(portrait,name);
  const partyBonus=memberBonus(member),stats=metrics(member),labels={speed:'スピード',power:'パワー',balance:'バランス'};
  for(const key of ['speed','power','balance']){
   const row=document.createElement('div');row.className='scout-stat';const label=document.createElement('span');label.textContent=t(labels[key]);
   const wrap=document.createElement('span');wrap.className='scout-meter-wrap';wrap.setAttribute('role','meter');wrap.setAttribute('aria-label',t(labels[key]));wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax',String(100+(SCOUT_RARE.bonus+SCOUT_PARTY_BONUS.max)*100));wrap.setAttribute('aria-valuenow',String(Math.round(stats[key]*100)));wrap.setAttribute('aria-valuetext',`${Math.round(stats[key]*100)}%`);
   const meter=document.createElement('meter');meter.min=0;meter.max=1;meter.value=stats[key]-(member.rare?SCOUT_RARE.bonus:0)-partyBonus;meter.setAttribute('aria-hidden','true');wrap.append(meter);
   if(member.rare){const bonus=document.createElement('span');bonus.className='scout-stat-bonus';bonus.style.left=`${meter.value*100}%`;bonus.style.width=`${SCOUT_RARE.bonus*100}%`;bonus.setAttribute('aria-hidden','true');wrap.append(bonus);}
   if(partyBonus){const bonus=document.createElement('span');bonus.className='scout-party-stat-bonus';bonus.style.left=`${(meter.value+(member.rare?SCOUT_RARE.bonus:0))*100}%`;bonus.style.width=`${partyBonus*100}%`;bonus.setAttribute('aria-hidden','true');wrap.append(bonus);}
   row.append(label,wrap);b.append(row);
  }
  if(index>=0&&scoutBenchBonus(member)){const bench=document.createElement('span');bench.className='scout-bench-bonus';bench.textContent=t('ベンチウォーマー+5%');b.append(bench);}
  if(interactive){b.setAttribute('aria-label',`${member.rare?t('レア')+' ':''}${member.glyph} ${fontName(member.font)}`);b.onclick=()=>guard(async()=>{
   if(run.phase==='starter'){commit(chooseScoutStarter(run,index));api.cue?.('recruit');await slidePartyAway();await prepare();}
   else if(run.phase==='select'){commit(selectScoutMember(run,index));await slidePartyAway();await prepare();}
   else if(run.phase==='replace'){commit(scoutRecruitChoice(run,true,index));await recruited();await nextEncounter();}
  });}return b;
 }
 function sync(){
  renderBonuses();
  const active=api.active()&&!leaving;$('scout-menu').hidden=!active||run?.phase==='ended';$('scout-reselect').hidden=!active||!run?.started||run?.phase!=='aim'||api.phase()!=='ready';
  document.body.dataset.scoutPhase=active?run.phase:'';if(active){$('phase-label').textContent=t('スカウトチャレンジ');if(run.enemy)$('opponent-label').textContent='CPU';}
  if(active&&['starter','select'].includes(run.phase))api.hidePlayer(true);
 }
 function victoryBanner(){
  $('result').hidden=false;const title=$('result-title');title.textContent=`${run.last.glyph} WIN!`;applyGlyphFinish(title,null,'',false);title.style.color='#2869dc';title.style.setProperty('--winner-font',family(run.last.font));
  for(const id of ['result-opponent-row','result-stage','result-best','result-actions'])$(id).hidden=true;
  $('result-ranking-status').textContent='';
 }
 function render(){
  sync();const active=api.active(),phase=run?.phase;const show=active&&['starter','select','recruit','replace'].includes(phase);
  const panel=$('scout-panel'),wasHidden=panel.hidden;panel.hidden=!show;const slide=show&&(wasHidden||phase==='select'&&lastPanelPhase!=='select');lastPanelPhase=phase;if(!show)return;
  if(slide)api.cue?.('panelOpen');
  if(slide&&typeof panel.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const final=getComputedStyle(panel).transform;panel.getAnimations().forEach(animation=>animation.cancel());panel.animate([{transform:`${final==='none'?'':final} translateY(${innerHeight-panel.getBoundingClientRect().top+24}px)`,opacity:1},{transform:final,opacity:1}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});}
  $('scout-choice-heading').hidden=!['starter','select'].includes(phase);$('scout-choice-prompt').textContent=t('どれで挑む？');$('scout-choice-label').textContent=t(phase==='starter'?'最初の文字':'パーティ');root.querySelector('.scout-panel-heading').hidden=true;$('scout-reward-row').hidden=!['recruit','replace'].includes(phase);$('scout-message').hidden=['starter','select'].includes(phase);$('scout-party').setAttribute('aria-label',t(phase==='starter'?'最初の仲間の候補':phase==='replace'?'入れ替える仲間を選ぶ':'出場する仲間を選ぶ'));
  const runningScore=t('{n}連勝中').replace('{n}',String(run.wins));$('scout-count').textContent=runningScore;$('scout-choice-count').textContent=phase==='starter'?'':runningScore;$('scout-message').textContent='';$('scout-candidate').classList.remove('is-recruited');$('scout-candidate').hidden=!['recruit','replace'].includes(phase);
  $('scout-party').replaceChildren(...(phase==='starter'?run.starters:run.party).map((m,i)=>card(m,i,['starter','select','replace'].includes(phase))));
  const actions=$('scout-actions');actions.replaceChildren();
  if(phase==='select'){$('scout-heading').textContent=t('出場する仲間を選ぶ');$('scout-message').textContent=t('敵を見て、手持ちから1体選んでください。');}
  if(phase==='recruit'||phase==='replace'){
   $('scout-heading').textContent=t(phase==='replace'?'入れ替える仲間を選ぶ':'仲間にしますか？');$('scout-message').hidden=true;victoryBanner();$('scout-candidate').replaceChildren(card(run.enemy,-1));
   if(phase==='recruit'){actions.append(button('見送る',async()=>{commit(scoutRecruitChoice(run,false));await dismissed();await nextEncounter();}),button('仲間にする',async()=>{commit(scoutRecruitChoice(run,true));if(run.phase==='replace'){api.showPhase('scout-recruit');render();}else{await recruited();await nextEncounter();}},true));}
   else{const label=document.createElement('strong');label.className='scout-replace-label';label.textContent=t('入れ替える仲間を選ぶ');actions.append(label,button('キャンセル',()=>{commit({...run,phase:'recruit'});render();}));}
  }

  renderButtons();
 }
 async function slidePartyAway(){
  const panel=$('scout-panel');if(!panel.hidden)api.cue?.('panelClose');
  if(!panel.hidden&&typeof panel.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const current=getComputedStyle(panel).transform;panel.getAnimations().forEach(animation=>animation.cancel());
   const final=getComputedStyle(panel).transform;
   await panel.animate([{transform:current},{transform:`${final==='none'?'':final} translateY(${innerHeight-panel.getBoundingClientRect().top+24}px)`}],{duration:220,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished.catch(()=>{});
  }
  panel.hidden=true;panel.getAnimations?.().forEach(animation=>animation.cancel());
 }
 async function prepare(){
  await warmPartyShapes();
  const announce=['starter','select'].includes(run.phase)||shownEnemyId!==run.enemy.id;const initial=chooseInitialScoutMember(run);if(initial!==run)commit(initial);
  const member=run.party.find(m=>m?.id===run.selected)||run.party.find(Boolean)||run.last||run.starters[0];
  if(!run.enemy.launch){run.enemy.launch=createComLaunch(run.enemy.difficulty);persist();}
  const appearance={player:run.phase==='aim',enemy:shownEnemyId!==run.enemy.id};
  await api.prepare(member,run.enemy,run.stage,appearance,memberBonus(member));shownEnemyId=run.enemy.id;
  api.showPhase(run.phase==='aim'?'ready':run.phase==='starter'?'scout-starter':'scout-select');api.hidePlayer(run.phase!=='aim');
  if(appearance.enemy&&run.enemy.rare||appearance.player&&member.rare)api.cue?.('rareAppear');
  $('phase-label').textContent=t('スカウトチャレンジ');render();if(announce)showScoutIntro();
  if(run.phase==='aim'){
   if(!run.bookId)commit({...run,bookId:encyclopediaMatchId(),bookRound:0});
   const id=`${run.bookId}:${run.bookRound||0}`;
   if(run.bookActive!==id)commit({...run,bookActive:id});
   api.collection?.prepare({id,mode:'scout',player:member,enemy:run.enemy});
  }
  if(run.phase==='aim')api.analytics('prepared',{stage_id:run.stage,p1_glyph:member.glyph,p1_font:member.font,p2_glyph:run.enemy.glyph,p2_font:run.enemy.font,p1_random:false,p2_random:true,cpu_difficulty:run.enemy.difficulty});
 }
 async function dismissed(){
  const source=$('scout-candidate').querySelector('.scout-slot');
  if(!source||typeof source.animate!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches){api.cue?.('dismiss');return;}
  const departure=api.depart([1]);api.cue?.('dismiss');
  await Promise.all([
   source.animate([{filter:'grayscale(0)',opacity:1},{offset:.3,filter:'grayscale(1)',opacity:1},{filter:'grayscale(1)',opacity:0}],{duration:320,easing:'linear',fill:'forwards'}).finished.catch(()=>{}),
   departure
  ]);
 }
 async function recruited(){
  await warmPartyShapes();
  const candidate=$('scout-candidate'),source=candidate.querySelector('.scout-slot'),party=$('scout-party');
  const index=run.party.findIndex((member,i)=>member&&party.children[i]?.dataset.memberId!==member.id),target=party.children[index];
  candidate.classList.add('is-recruited');api.cue?.('recruit');if(index<0||!target||!source)return;
  const fresh=card(run.party[index],index),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||typeof source.animate!=='function'){target.replaceWith(fresh);api.cue?.('land');return;}
  const timing={duration:180,easing:'linear',fill:'forwards'},colours=[
   [source.querySelector('.scout-glyph'),api.rewards?.selected?.().color||'#2869dc'],[source.querySelector('.scout-font'),'#273546'],
   ...[...source.querySelectorAll('.scout-stat')].map(node=>[node,'#536578']),
   ...[...source.querySelectorAll('.scout-meter-wrap')].map(node=>[node,'#427be0'])
  ];
  await Promise.all([
   ...colours.map(([node,color])=>node.animate([{color:'#e04c3d'},{color}],timing).finished),
   source.animate([{borderColor:'#cc796c',backgroundColor:'#fff4f1'},{borderColor:'#2869dc',backgroundColor:'#eaf2ff'}],timing).finished
  ]);
  applySkinVariables(source,api.rewards?.selected?.());applyGlyphFinish(source.querySelector('.scout-glyph'),api.rewards,run.party[index].glyph);
  const from=source.getBoundingClientRect(),to=target.getBoundingClientRect(),flight=source.cloneNode(true);flight.classList.add('scout-join-flight');flight.setAttribute('aria-hidden','true');
  Object.assign(flight.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});document.body.append(flight);source.style.visibility='hidden';target.classList.add('scout-join-target');
  const dx=to.left-from.left,dy=to.top-from.top;
  try{
   await flight.animate([{transform:'translate(0,0)'},{offset:.4,transform:`translate(${dx*.4}px,${dy*.4-18}px)`},{transform:`translate(${dx}px,${dy}px)`}],{duration:300,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'}).finished;
   target.replaceWith(fresh);flight.remove();api.cue?.('land');
   await fresh.animate([{transform:'scale(.94)',background:'#cfe2ff'},{offset:.3,transform:'scale(1.035)',background:'#eaf2ff'},{offset:.65,transform:'scale(1)',background:'#fff'},{transform:'scale(1)',background:'#fff'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'}).finished;
   await slidePartyAway();
  }finally{flight.remove();target.classList.remove('scout-join-target');}
 }
 function clearScoutIntro(){const intro=$('round-intro');intro.getAnimations?.().forEach(animation=>animation.cancel());intro.classList.remove('is-visible');intro.textContent='';}
 function showScoutIntro(){
  clearScoutIntro();api.cue?.('round');const intro=$('round-intro'),label=document.createElement('span'),enemy=document.createElement('strong');label.textContent=t('{n}戦目').replace('{n}',String(run.wins+1))+'　';enemy.textContent=run.enemy.glyph;enemy.className=run.enemy.rare?'scout-intro-enemy-rare':'';intro.append(label,enemy);
  if(typeof intro.animate==='function')intro.animate([{opacity:0,offset:0},{opacity:1,offset:1/12},{opacity:1,offset:11/12},{opacity:0,offset:1}],{duration:2400,easing:'linear'});
 }
 async function nextEncounter(){
  if(!run.enemy)commit(await prepareScoutEnemy(run,api.libs(),Math.random,{forceRare:api.forceRare?.()===true}));
  if(run.phase==='ended'){ended();return;}await prepare();
 }
 async function restore(){
  await warmPartyShapes();
  if(run.phase==='starter'){shownEnemyId=null;commit(await prepareScoutStarterEnemy(run,api.libs(),Math.random,{forceRare:api.forceRare?.()===true}));api.enter();await prepare();return;}
  replayCollection();shownEnemyId=null;if(run.phase==='loss')commit(reselectScoutMember(run));api.enter();if(run.last)api.analytics('select',{stage_id:run.stage,p1_glyph:run.last.glyph,p1_font:run.last.font});if(run.phase==='select'){await nextEncounter();return;}
  if(['recruit','replace','loss','ended'].includes(run.phase)){
   if(run.enemy)await api.prepare(run.last||run.starters[0],run.enemy,run.stage,run.last?undefined:{player:false,enemy:true});
   if(run.phase==='ended'){ended();return;}api.showPhase(run.phase==='loss'?'scout-loss':'scout-recruit');render();
  }
 }
 function renderEntryProgress(canResume,box=$('scout-entry-progress')){
  box.replaceChildren();
  if(!canResume){box.textContent=t('中断データなし');box.classList.add('is-empty');return;}
  box.classList.remove('is-empty');const title=document.createElement('p');title.className='scout-entry-caption';title.textContent=t(run.phase==='starter'?'最初の仲間を選択中':'継続中');
  const units=document.createElement('div');units.className='scout-entry-members';
  for(const member of run.phase==='starter'?run.starters:run.party){const unit=document.createElement('div');if(member){const glyph=document.createElement('strong');glyph.textContent=member.glyph;applyGlyphFinish(glyph,api.rewards,member.glyph);glyph.style.fontFamily=family(member.font);const font=document.createElement('small');font.textContent=fontName(member.font);const portrait=document.createElement('span');portrait.className='scout-glyph-wrap';portrait.append(glyph);if(member.rare)portrait.append(rareStar());unit.append(portrait,font);}else{unit.textContent='—';unit.className='is-empty';}units.append(unit);}
  const score=document.createElement('p');score.className='scout-entry-score';score.textContent=t('{n}連勝中').replace('{n}',String(run.wins));
  const stage=document.createElement('p');stage.className='scout-entry-stage';stage.textContent=t(getStage(run.stage).name);box.append(title,units,score,stage);
 }
 // Measure the inner block, not the native dialog's intrinsic/grid height.
 function sizePopover(dialog){
  const content=dialog.querySelector('.scout-popover-content'),style=getComputedStyle(dialog);
  const frame=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(style[key])||0),0);
  dialog.style.height=`${Math.ceil(content.offsetHeight+frame)}px`;
 }
 function positionEntry(){
  sizePopover($('scout-entry'));
  const anchor=$('scout-start').getBoundingClientRect(),dialog=$('scout-entry'),width=dialog.offsetWidth,height=dialog.offsetHeight;
  const left=Math.max(8,Math.min(innerWidth-width-8,anchor.left+anchor.width/2-width/2));
  dialog.style.left=`${left}px`;dialog.style.top=`${Math.max(8,anchor.top-height-12)}px`;
  dialog.style.setProperty('--scout-entry-tip',`${Math.max(16,Math.min(width-16,anchor.left+anchor.width/2-left))}px`);
 }
 function entry(){
  if(working||!api.ready())return;if(api.active()&&run?.phase==='ended'){guard(startNew);return;}run=loadScoutRun(storage());
  const canResume=Boolean(run&&run.phase!=='ended'),resume=$('scout-resume');resume.disabled=!canResume;
  if(canResume)delete resume.dataset.unavailable;else resume.dataset.unavailable='true';
  renderEntryProgress(canResume);showDialog($('scout-entry'));positionEntry();
 }
 function positionMenu(){
  sizePopover($('scout-pause'));
  const anchor=$('scout-menu').getBoundingClientRect(),dialog=$('scout-pause'),width=dialog.offsetWidth;
  const left=Math.max(8,Math.min(innerWidth-width-8,anchor.right-width));
  dialog.style.left=`${left}px`;dialog.style.top=`${anchor.bottom+12}px`;
  dialog.style.setProperty('--scout-entry-tip',`${Math.max(16,Math.min(width-16,anchor.left+anchor.width/2-left))}px`);
 }
 function reposition(){if($('scout-entry').open)positionEntry();if($('scout-pause').open)positionMenu();}
 window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
 for(const dialog of [$('scout-entry'),$('scout-pause')])dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(event.currentTarget);});
 async function startNew(){await closeDialog($('scout-entry'));const setup=$('setup');setup.inert=true;try{const next=await prepareScoutStart(api.stage(),api.libs(),Math.random,{forceRare:api.forceRare?.()===true});api.collection?.abandon(run?.bookActive);if(api.active())await leave();commit(next);await restore();}finally{setup.inert=false;}}
 async function leave(){leaving=true;clearScoutIntro();dialogs.forEach(d=>{if(d.open)d.close();});$('scout-panel').hidden=true;$('scout-menu').hidden=true;$('scout-reselect').hidden=true;error('');try{await api.depart([0,1]);await api.exit();}finally{leaving=false;resumeSound();}}
 function ended(){
  clearScoutIntro();api.stop();api.showPhase('result');$('scout-panel').hidden=true;sync();
  applyGlyphFinish($('result-title'),null,'',false);$('result-title').textContent=score();$('result-title').style.color='#cc4735';$('result-title').style.setProperty('--winner-font','system-ui');
  $('result-stage').textContent=`${t('スカウトチャレンジ')} · ${t(getStage(run.stage).name)}`;$('result-stage').hidden=false;
  $('result-best').textContent=`${t('自己ベスト')} ${score(readScoutBests(storage())[run.stage]||0)}`;$('result-best').hidden=false;
  $('result-ranking-status').textContent='';
  $('result-opponent-row').hidden=true;$('copy-opponent-result').hidden=true;
  $('result-actions').hidden=false;$('result-actions').classList.add('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('replay').disabled=false;$('replay').textContent=t('再挑戦');$('edit-character').disabled=false;$('save-result').hidden=false;$('share-result').hidden=false;
 }
 function openMenu(){if(!api.active()||run?.phase==='ended'||working||$('scout-pause').open)return;showDialog($('scout-pause'));$('scout-menu').setAttribute('aria-expanded','true');positionMenu();}
 $('scout-start').onclick=entry;
 $('scout-resume').onclick=()=>{if(run&&run.phase!=='ended')guard(async()=>{await closeDialog($('scout-entry'));await restore();});};
 $('scout-new').onclick=()=>guard(()=>{if(run&&run.phase!=='ended'){confirm('新しく始めますか？','中断している挑戦は破棄されます。',startNew,true);}else return startNew();});
 $('scout-suspend').onclick=()=>guard(async()=>{commit(suspendScoutRun(run));api.analytics('exit','suspend');await closeDialog($('scout-pause'));await leave();});
 $('scout-retire').onclick=()=>confirm('リタイアしますか？','今回の挑戦を終了します。',async()=>{commit(retireScoutRun(run));rememberScoutBest(run,storage());api.analytics('exit','retired');await closeDialog($('scout-pause'));ended();api.cue?.('end');});
 $('scout-confirm-no').onclick=async()=>{const continuing=!$('scout-confirm').classList.contains('is-new-run');confirmation=null;await closeDialog($('scout-confirm'));if(continuing)await closeDialog($('scout-pause'));};
 $('scout-confirm-yes').onclick=()=>{const action=confirmation;confirmation=null;closeDialog($('scout-confirm'));guard(()=>action?.());};
 $('scout-menu').onclick=openMenu;
 $('scout-reselect').onclick=()=>guard(async()=>{api.cancelInput();await api.depart([0]);commit(reselectScoutMember(run));await prepare();});
 for(const dialog of dialogs){dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});}
 window.addEventListener('pagehide',()=>{if(api.active()&&run)persist();});
 new MutationObserver(()=>{if(api.active()){if(run.phase==='ended')ended();else render();}if($('scout-entry').open)renderEntryProgress(Boolean(run&&run.phase!=='ended'));if($('scout-confirm').open&&!$('scout-confirm-progress').hidden)renderEntryProgress(true,$('scout-confirm-progress'));reposition();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 function intent(url){const star=scoutStarLabel(run),highlight=star?' '+t('「{glyph}」が大活躍！').replace('{glyph}',star):'';const text=`${t('文字ブレード')} ${t('スカウトチャレンジ')} ${t('{stage}ステージ').replace('{stage}',t(getStage(run.stage).name))} ${score()}！${highlight} #文字ブレード`;return 'https://x.com/intent/post?'+new URLSearchParams({text,url});}
 return {entry,openMenu,leave,sync,render,ended,intent,testWin:()=>{if(!api.winForTest||working||dialogs.some(d=>d.open)||!['select','aim','battle'].includes(run?.phase))return;return guard(async()=>{if(run.phase==='select'){commit(selectScoutMember(run,run.party.findIndex(Boolean)));await slidePartyAway();await prepare();}api.winForTest();});},get canChangeStage(){return api.active()&&!run.started&&run.wins===0&&['select','aim'].includes(run.phase);},changeStage(stage){if(!this.canChangeStage)return false;api.restage(stage);commit({...run,stage});api.showPhase(run.phase==='select'?'scout-select':'ready');render();api.analytics('stage',{stage_id:stage});return true;},get run(){return run;},get leaving(){return leaving;},get paused(){return dialogs.some(d=>d.open)&&api.active();},get filename(){return `moji-blade-scout-${run.stage}-${run.wins}.png`;},launch(){commit(beginScoutBattle(run));api.collection?.start(run.bookActive);api.missionStart?.({id:run.bookActive,glyph:run.last?.glyph||run.party[run.active]?.glyph||''});sync();},settle(result){if(run.phase!=='battle')return;pendingBest=result.winner===0&&run.wins+1>(readScoutBests(storage())[run.stage]||0);const next=settleScoutBattle(run,result.winner);if(run.bookActive){next.bookResult={id:run.bookActive,player:run.last,enemy:run.enemy,winner:result.winner};next.bookRound=(run.bookRound||0)+1;next.bookActive=null;}commit(next);if(!rememberScoutBest(run,storage()))error(t('自己ベストを保存できませんでした。'));},outcome(){api.result(run.phase==='recruit');if(pendingBest){api.cue?.('best');pendingBest=false;}if(['loss','ended'].includes(run.phase))api.cue?.('lost');if(run.phase==='loss'){guard(async()=>{commit(reselectScoutMember(run));await prepare();});return;}api.showPhase(run.phase==='ended'?'result':run.phase==='loss'?'scout-loss':'scout-recruit');if(run.phase==='ended'){ended();api.cue?.('end');}else render();}};
}
