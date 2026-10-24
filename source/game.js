import { createResultSharing, createResultActions } from './app-sharing.js';
const appAnalytics={common:()=>({}),share:()=>{}};
import {createPhysicsWarmup} from './app-physics-warmup.js';
const warmAppPhysics=createPhysicsWarmup(Battle);
import {createHaptics} from './app-haptics.js';
const appHaptics=createHaptics();
import {makePullState,updatePullGesture,PULL_CANCEL_RADIUS} from './pull-gesture.js';
import {initHalloweenMissions} from './halloween-missions.js';
import {createHalloweenProgress} from './halloween-progress.js';
import {createSkinStore} from './skin-store.js';
import {createSkinPicker} from './skins.js';
import {applySkinVariables,skinById} from './skin-catalog.js';
import {initHomeNotices} from './home-notices.js';
import {acquireGameSession} from './game-session.js';
import {createEncyclopediaSupport} from './encyclopedia-support.js';
import {createEncyclopediaRewards,applyGlyphFinish} from './encyclopedia-rewards.js';
import {buildEncyclopediaCatalog} from './encyclopedia-catalog.js';
import {openEncyclopediaPersistence} from './encyclopedia-persistence.js';
import {createEncyclopediaStore,encyclopediaMatchId} from './encyclopedia-store.js';
import {createEncyclopedia} from './encyclopedia.js';

import {scoutGlyph} from './scout-variant.js';
import {drawChallengeEnemy} from './challenge-random.js';
import {readScoutBests as readScoutBestsForMenu} from './scout-run.js';
import {createScoutController} from './scout-controller.js';
import { GlyphLibrary, isRankedCharacter } from './glyph.js?v=1.1.9';
import { FONTS, validFont } from './fonts.js';
import { EVENT_ID, EVENT_TITLE, isEventCharacter } from './events.js';
import { Battle, initPhysics, outcomeForWinner, launchAngleFromPull, canonicalRankedActions } from './physics.js';
import { randomCharacter, validateCharacter, firstCharacter, createComLaunch, statGauges, shuffled, COM_LEVELS, CONFIG, PHYSICS_VERSION } from './config.js';
import { ArenaView } from './render.js';
import { RenderRecovery } from './render-recovery.js';
import { getStage, stageForMode } from './stages.js';
import { createStageSelection, readSelectedStage, writeSelectedStage } from './stage-selection.js';
import { canChooseChallengeStage, readChallengeRecords, rememberChallengeBest } from './challenge-stages.js';
import { Sound } from './audio.js?v=ring-1';
import { initLanguageSwitcher, translate } from './i18n.js?v=1.2.5';
const BUDGET_PAUSED=true;
const $=id=>document.getElementById(id),KEY='tsukuruum.moji-blade.v2',RANKED_KEY='tsukuruum.moji-blade.ranked.v1',RANKING_CACHE_KEY='tsukuruum.moji-blade.rankings.maintenance.20261004',PENDING_CHALLENGE_KEY='tsukuruum.moji-blade.pending-challenge.v1',RANKING_CLIENT_CACHE_MS=120000;
const ui={character:$('character'),opponent:$('opponent'),name:$('player-name'),error:$('input-error')};
let settings={character:'文',opponent:'字',name:'',font:'gothic',comFont:'gothic',difficulty:'normal',sound:true,bgm:true,rankingEnabled:true,spinDirection:1,comSpinDirection:1};
try{
 const value=JSON.parse(localStorage.getItem(KEY)||'null');
 if(value&&typeof value==='object')settings={character:typeof value.character==='string'?value.character:'文',opponent:typeof value.opponent==='string'?value.opponent:'字',name:typeof value.name==='string'&&value.name!=='ゲスト'?value.name:'',font:validFont(value.font),comFont:validFont(value.comFont??value.font),difficulty:Object.hasOwn(COM_LEVELS,value.difficulty)?value.difficulty:'normal',sound:value.sound!==false,bgm:value.bgm!==false,rankingEnabled:value.rankingEnabled!==false,spinDirection:value.spinDirection===-1?-1:1,comSpinDirection:value.comSpinDirection===-1?-1:1};
 else {const old=JSON.parse(localStorage.getItem('tsukuruum.moji-blade.v1')||'null');if(old)settings.sound=old.sound!==false;}
}catch{$('storage-note').hidden=false;}
ui.character.value=settings.character;ui.opponent.value=settings.opponent;ui.name.value=settings.name||'';
const regulation='mixed';
let fontId=settings.font,comFontId=settings.comFont,standardComFontId=settings.comFont,difficulty=settings.difficulty;
const sound=new Sound(settings.sound,settings.bgm),fontLibraries=new Map();let library,comLibrary,view,battle,phase='loading',angle=0,power=.8,aimVisible=false,last=null,drag=null,selectedPlayer=null,selectedCom=null,busy=false,metricTimer,finishElapsed=0,mode='standard',streak=0;
let encyclopediaUI,encyclopediaError=null,encyclopediaTrial=null,encyclopediaTrialMode=null;
const encyclopediaOptions={onError:kind=>{encyclopediaError=kind;encyclopediaUI?.saveError(kind);}};

initLanguageSwitcher();
const homeNotices=initHomeNotices();let halloweenMissions={phase(){}},halloweenChallengeId=null,halloweenBoss=null;
function startupNotice(message,retry){
 $('loading').hidden=false;$('loading').querySelector('p').textContent=translate(message);$('loading').querySelector('.loader').hidden=true;
 const button=$('retry-load');button.textContent=translate('再試行');button.hidden=false;button.onclick=retry;
}
function sessionLost(){sound.pause();last=null;startupNotice('別の画面で起動されました。この画面は停止しています。',()=>location.reload());}
let gameSession;
while(!gameSession?.active){
 gameSession=await acquireGameSession({name:encyclopediaOptions.namespace||'main',storage:encyclopediaOptions.storage,onLost:sessionLost});
 if(!gameSession.active)await new Promise(resolve=>startupNotice(gameSession.reason==='busy'?'別の画面で起動中です。その画面を閉じてから再試行してください。':'保存先を利用できません。設定を確認して再試行してください。',resolve));
}
encyclopediaOptions.guard=()=>gameSession.assert();encyclopediaOptions.strictRead=true;
async function restoreEncyclopedia(){
 for(;;){
  try{encyclopediaError=null;const persistence=await openEncyclopediaPersistence(encyclopediaOptions);if(!gameSession.assert())throw Error('Session ended');return persistence;}
  catch(error){
   if(!gameSession.assert()){sessionLost();await new Promise(()=>{});}
   await new Promise(resolve=>startupNotice(error.code==='newer-version'?'この図鑑データは新しいバージョンで保存されています。ゲームを更新して再試行してください。':'図鑑の保存データを読み込めません。データは初期化せず再試行します。',resolve));
  }
 }
}
const encyclopediaPersistenceReady=restoreEncyclopedia();
// Start the same four fonts while local records are restored, rather than waiting twice.
for(const id of Object.keys(FONTS))void GlyphLibrary.load(id).catch(()=>{});
const encyclopediaPersistence=await encyclopediaPersistenceReady;
$('retry-load').onclick=null;$('retry-load').hidden=true;$('loading').querySelector('.loader').hidden=false;
const encyclopediaStore=createEncyclopediaStore({...encyclopediaOptions,...encyclopediaPersistence});
const encyclopediaSupport=createEncyclopediaSupport({libraries:()=>fontLibraries});
const encyclopediaRewards=createEncyclopediaRewards({availability:encyclopediaSupport,store:encyclopediaStore,catalog:()=>buildEncyclopediaCatalog(fontLibraries),storage:encyclopediaOptions.storage,onError:encyclopediaOptions.onError});
const skins=createSkinStore({rewards:encyclopediaRewards,storage:encyclopediaOptions.storage,onError:()=>{const note=$('storage-note');note.textContent=translate('スキンを保存できません。もう一度お試しください。');note.hidden=false;}});
const halloweenProgress=createHalloweenProgress({storage:encyclopediaOptions.storage,guard:encyclopediaOptions.guard,onError:()=>{$('storage-note').textContent=translate('ミッションの進捗を保存できません。');$('storage-note').hidden=false;}});
halloweenMissions=initHalloweenMissions({progress:halloweenProgress,skins,libraries:()=>fontLibraries,onSkinReceived:()=>sound.scout('recruit'),onBossStart:beginHalloweenBoss});
const skinPickers=[createSkinPicker({skins,ready:()=>phase==='setup'&&!busy&&Boolean(library)}),createSkinPicker({skins,side:1,ready:()=>phase==='setup'&&!busy&&Boolean(comLibrary)})];
const skinPicker={phase:next=>skinPickers.forEach(picker=>picker.phase(next))};
const collectionSkinFor=(top,index,localIndex)=>['standard','local'].includes(mode)?skins.skinFor(top.glyph.char,index):['challenge','scout'].includes(mode)&&index===localIndex?skins.skinFor(top.glyph.char):null;
const collectionGoldFor=(...args)=>collectionSkinFor(...args)?.id==='gold';
const collectionRainbowFor=(...args)=>collectionSkinFor(...args)?.id==='rainbow';
sound.preloadButton();
sound.preloadRope();

let challengeFontBag=[],rankingSession=null,rankingBusy=false,rankingSetupMessage='',rankingPending=null,spinDirection=settings.spinDirection===-1?-1:1,comSpinDirection=settings.comSpinDirection===-1?-1:1;
let localActions=[null,null],localAim=[{angle:0,power:.8,visible:false},{angle:0,power:.8,visible:false}];
const localDrags=new Map(),pullCancelZones=[];
let selectedStageId=readSelectedStage(),challengeStageId=selectedStageId,challengeStarted=false;
const challengeRecords=readChallengeRecords();
let ranked=null,rankedPollTimer=0,rankedActionTimer=0,pendingRankedResult=null,pendingRankedLeave=null,rankingView='streak',rankingPeriod='current',recoveryAttempted=false,currentRating=1500;
let rankedIntroTimer=0,rankedIntroResolve=null,ratingFrame=0,ratingRevision=0,rankingRequestRevision=0,rankingRetryTimer=0;
let opponentCopyTimer=0;
const RANKED_INTRO_MS=2500,RANKED_INPUT_MS=15000,RATING_ANIMATION_MS=700;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const ROULETTE_CHARS=[...'文字刀火水木金月日山川空風雷光闇星花夢心力王龍猫犬愛和春夏秋冬天海森石雨雪剣盾鳥あいうえおかきくけこさしすせそたちつてとアイウエオカキクケコサシスセソタチツテトABCDE12345○△□☆◇＋×？！％'];
let rouletteOrder=shuffled(ROULETTE_CHARS),rouletteTimer=0,rouletteIndex=0;
function updateSelectionPreviews(){
 const player=firstCharacter(ui.character.value),opponent=firstCharacter(ui.opponent.value);
 $('glyph-preview').textContent=player||rouletteOrder[rouletteIndex];
 $('com-glyph-preview').textContent=opponent||rouletteOrder[(rouletteIndex+50)%rouletteOrder.length];
 applyGlyphFinish($('glyph-preview'),skins,player,Boolean(player));applyGlyphFinish($('com-glyph-preview'),skins,opponent,Boolean(opponent),1);applyGlyphFinish(document.querySelector('#opponent-highlight .active-character'),null,'',false);
 applySkinVariables(document.querySelector('.player-setup'),skins.selected());applyGlyphFinish(document.querySelector('#character-highlight .active-character'),null,'',false);
 $('glyph-preview').classList.toggle('is-random',!player);
 $('com-glyph-preview').classList.toggle('is-random',!opponent);
}
function syncSelectionRoulette(){
 const active=phase==='setup'&&!document.hidden&&!reducedMotion.matches&&(!firstCharacter(ui.character.value)||!firstCharacter(ui.opponent.value));
 if(active&&!rouletteTimer)rouletteTimer=setInterval(()=>{rouletteIndex=(rouletteIndex+1)%rouletteOrder.length;if(!rouletteIndex)rouletteOrder=shuffled(ROULETTE_CHARS);updateSelectionPreviews();},120);
 else if(!active&&rouletteTimer){clearInterval(rouletteTimer);rouletteTimer=0;}
}
async function beginHalloweenBoss(){
 if(busy||phase!=='setup'||!library||!halloweenProgress.active())return;
 let glyph;try{glyph=library.get(choosePlayer(),regulation);}catch(error){ui.error.textContent=error.message;return;}
 busy=true;let entry;
 try{const [{createHalloweenBoss},{createHalloweenEntry}]=await Promise.all([import('./halloween-boss.js'),import('./halloween-entry.js')]);entry=createHalloweenEntry();await entry.cover();
  mode='halloween-boss';document.body.dataset.mode=mode;showPhase('halloween-boss');document.querySelector('.arena-section').hidden=true;
  halloweenBoss ||=createHalloweenBoss({libraries:()=>fontLibraries,progress:halloweenProgress,skins,sound,guard:()=>gameSession.assert(),onExit:()=>{busy=false;void backToSetup();},onMissions:()=>queueMicrotask(()=>halloweenMissions.open())});
  const started=await halloweenBoss.start({glyph,font:fontId,skin:skins.skinFor(glyph.char)},{entry});if(!started&&!halloweenBoss.active)await backToSetup();
 }catch(error){await backToSetup();ui.error.textContent=error.message;}finally{entry?.dispose();busy=false;}
}
function choosePlayer(){return firstCharacter(ui.character.value)?validateCharacter(ui.character.value,regulation,library.supports):randomCharacter(regulation,library.randomPools);}
function isNetworkMatch(){return (mode==='ranked'||mode==='room')&&!ranked?.practice;}
function activeBattleLocalIndex(){return isNetworkMatch()?Number(ranked?.localIndex)||0:0;}
function cleanedName(){const value=ui.name.value.normalize('NFC').replace(/[\p{White_Space}\p{Cc}\p{Cf}]/gu,''),parts=[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(value)].map(part=>part.segment),empty=parts.length===0;return {name:empty?'ゲスト':parts.join(''),storedName:empty?'':parts.join(''),empty,valid:parts.length<=8};}
function save(){settings={character:ui.character.value,opponent:ui.opponent.value,name:cleanedName().storedName,font:fontId,comFont:standardComFontId,difficulty,sound:sound.enabled,bgm:sound.bgmEnabled,rankingEnabled:settings.rankingEnabled,spinDirection,comSpinDirection};try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{$('storage-note').hidden=false;}}
function soundLabel(){const label=sound.enabled?'音をオフにする':'音をオンにする';$('sound').setAttribute('aria-label',label);$('sound').title=label;$('sound').setAttribute('aria-pressed',String(sound.enabled));$('sound').classList.toggle('is-muted',!sound.enabled);}soundLabel();
function bgmLabel(){const label=sound.bgmEnabled?'BGMをオフにする':'BGMをオンにする';const button=$('bgm');button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(sound.bgmEnabled));button.classList.toggle('is-muted',!sound.bgmEnabled);}bgmLabel();
function rankingToggleLabel(){const checkbox=$('ranking-opt-in');checkbox.checked=!BUDGET_PAUSED&&settings.rankingEnabled;checkbox.setAttribute('aria-label',BUDGET_PAUSED?'ランキング登録はメンテナンス中':settings.rankingEnabled?'ランキング登録中':'ランキングに登録する');}rankingToggleLabel();
function updateChoices(){document.querySelectorAll('[data-font]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.font===fontId)));document.querySelectorAll('[data-com-font]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.comFont===comFontId)));document.querySelectorAll('[data-difficulty]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.difficulty===difficulty)));}updateChoices();
function showPhase(next){
 if(next!=='ready')sound.stopRopes();
 if(['loading','setup','generating','ready'].includes(next)&&!(next==='ready'&&phase==='ready'&&isNetworkMatch()))sound.reset();
 if(['matchmaking','battle','finishing','result'].includes(next))sound.stopCue();
 for(const [index,id] of ['player-char','com-char'].entries())$(id).dataset.rare=String(mode==='scout'&&battle?.tops?.[index]?.glyph.rare===true);
 applyGlyphFinish($('player-char'),skins,$('player-char').textContent,['standard','challenge','scout','local'].includes(mode));applyGlyphFinish($('com-char'),skins,$('com-char').textContent,['standard','local'].includes(mode),1);
 recordEncyclopediaPhase(next);
 if(next==='battle'&&phase!==next)last=null;phase=next;document.body.dataset.phase=next;homeNotices.phase(next);halloweenMissions.phase(next);skinPicker.phase(next);applySkinVariables($('player-spin'),['standard','challenge','scout','local'].includes(mode)?skins.selected():null);updatePullCancelZones();const setup=['loading','setup','generating'].includes(next);
 $('setup').hidden=!setup;document.querySelector('.arena-section').hidden=setup;
 document.querySelector('.controls').hidden=!setup;document.querySelector('.guide').hidden=!setup;document.querySelector('.release-notes').hidden=!setup;document.querySelector('.game-footer').hidden=!setup;$('result').hidden=next!=='result';
 $('phase-label').textContent=mode==='local'&&next==='ready'?localActions[0]?'2P の発射待ち':localActions[1]?'1P の発射待ち':'1P・2P 発射準備':mode==='local'&&next==='battle'?'VS 2P':mode==='challenge'&&['ready','battle','finishing'].includes(next)?`連戦 ${streak}勝`:mode==='room'&&ranked?.practice?'ルーム待機中':mode==='ranked'&&ranked?.practice?'お試し対戦':isNetworkMatch()&&next==='ready'?'発射入力':isNetworkMatch()&&next==='ranked-wait'?'発射待ち':isNetworkMatch()&&next==='ranked-intro'?'対戦相手決定':mode==='room'&&next==='battle'?'ルームマッチ':mode==='ranked'&&next==='battle'?(ranked?.eventId?EVENT_TITLE:'ランクマッチ'):({ready:'発射準備',battle:'対戦中',finishing:'決着',result:'決着',matchmaking:'対戦検索中','ranked-wait':'発射待ち'})[next]||'';
 const keepAim=next==='ready'||(isNetworkMatch()&&next==='ranked-wait');if(!keepAim)aimVisible=false;if(view){if(mode==='local')localAim.forEach((aim,index)=>view.aim(aim.angle,aim.power,next==='ready'&&aim.visible,index));else{view.aim(angle,power,keepAim&&aimVisible,0);view.aim(0,0,false,1);}if(!(mode==='scout'&&next==='result'))view.groups.forEach(group=>{group.visible=!setup;});if(!setup)view.resize();}
 $('arena').dataset.phase=next;$('arena').setAttribute('aria-label',mode==='local'?'3D競技場。1Pと2Pの文字をそれぞれ引っ張って離すと入力が確定します。両方が確定すると対戦開始。':'3D競技場。発射準備後、青い文字を引っ張って離すと発射。矢印キーで方向と強さ、Enterで発射。');$('com-back').hidden=!['standard','local','challenge'].includes(mode)||!['ready','battle','finishing'].includes(next);updateSpinDirectionButton();syncSelectionRoulette();window.mojiBladeApp?.phase(next,mode);scout.sync();
}
function updateSpinDirectionButton(){
 const button=$('spin-direction'),submitted=isNetworkMatch()&&Boolean(ranked?.action);
 button.hidden=!battle||!(phase==='ready'||phase==='ranked-wait'&&submitted)||mode==='local'&&Boolean(localActions[0]);
 button.disabled=phase!=='ready'||submitted||mode==='local'&&Boolean(localActions[0]);
 button.classList.toggle('is-clockwise',spinDirection===-1);
 button.setAttribute('aria-pressed',String(spinDirection===-1));
 button.setAttribute('aria-label',`${mode==='local'?'1Pの':''}回転方向：${spinDirection===1?'左回転（反時計回り）':'右回転（時計回り）'}。押すと切り替え`);
 $('spin-direction-label').textContent=spinDirection===1?'左':'右';
 const comButton=$('com-spin-direction');
 comButton.hidden=!battle||!['standard','local'].includes(mode)||phase!=='ready'||mode==='local'&&Boolean(localActions[1]);
 comButton.classList.toggle('is-opponent-facing',mode==='local');
 comButton.classList.toggle('is-clockwise',comSpinDirection===-1);
 comButton.setAttribute('aria-pressed',String(comSpinDirection===-1));
 comButton.setAttribute('aria-label',`${mode==='local'?'2P':'COM'}の回転方向：${comSpinDirection===1?'左回転（反時計回り）':'右回転（時計回り）'}。押すと切り替え`);
 $('com-spin-direction-label').textContent=comSpinDirection===1?'左':'右';
 $('stage-dialog-note').textContent=mode==='scout'?'最初の発射まで選択できます。挑戦中は同じステージで固定されます。':mode==='challenge'?'1戦目だけ選択できます。連勝中は同じステージで固定されます。':'変更すると、両方の発射準備をやり直します。';
 stageSelection.update(mode,phase,busy||renderRecovery.blocked,mode==='scout'?scout.canChangeStage:canChooseChallengeStage(streak,challengeStarted),mode==='scout'?scout.run.stage:mode==='challenge'?challengeStageId:selectedStageId);
}
function toggleComSpinDirection(){
 if(!['standard','local'].includes(mode)||phase!=='ready'||busy||!battle||$('stage-dialog').open||renderRecovery.blocked||mode==='local'&&localActions[1])return;
 comSpinDirection*=-1;
 if(mode==='standard')battle.comLaunch.spinDirection=comSpinDirection;
 updateSpinDirectionButton();save();
}
function toggleSpinDirection(){
 if(phase!=='ready'||busy||!battle||$('stage-dialog').open||renderRecovery.blocked||isNetworkMatch()&&ranked?.action||mode==='local'&&localActions[0])return;
 spinDirection*=-1;updateSpinDirectionButton();save();
}
const gaugeKeys=['speed','power','balance'],gaugeMotion=matchMedia('(prefers-reduced-motion: reduce)');
const gaugeFrames={stat:0,'com-stat':0};
function setGauges(metrics,prefix='stat'){
 const values=metrics?statGauges(metrics):{speed:0,power:0,balance:0};
 cancelAnimationFrame(gaugeFrames[prefix]);
 const from=gaugeKeys.map(key=>$(prefix+'-'+key).value),started=performance.now();
 function update(now){
  const progress=gaugeMotion.matches?1:Math.max(0,Math.min(1,(now-started)/320)),ease=1-(1-progress)**3;
  gaugeKeys.forEach((key,i)=>{$(prefix+'-'+key).value=from[i]+(values[key]-from[i])*ease;});
  gaugeFrames[prefix]=progress<1?requestAnimationFrame(update):0;
 }
 update(started);
}
function highlightInput(input){
 const mirror=$(input.id+'-highlight'),raw=input.value,leading=raw.length-raw.trimStart().length;
 const first=new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(raw.slice(leading))[Symbol.iterator]().next().value?.segment||'';
 const active=document.createElement('span');active.className='active-character';active.textContent=first;
 mirror.replaceChildren(document.createTextNode(raw.slice(0,leading)),active,document.createTextNode(raw.slice(leading+first.length)+'\u200b'));
 mirror.scrollTop=input.scrollTop;mirror.scrollLeft=input.scrollLeft;
}
function refreshInput(){
 highlightInput(ui.character);highlightInput(ui.opponent);
 clearTimeout(metricTimer);updateSelectionPreviews();syncSelectionRoulette();if(['loading','setup','generating'].includes(phase))$('com-char').textContent=firstCharacter(ui.opponent.value)||'？';
 let error='',playerError='';try{if(library&&firstCharacter(ui.character.value))validateCharacter(ui.character.value,regulation,library.supports);}catch(e){playerError=e.message;error=e.message;}
 let comError='';if(comLibrary&&ui.opponent.value.trim())try{validateCharacter(ui.opponent.value,regulation,comLibrary.supports);}catch(e){comError=e.message;if(!error)error=comError;}
 const nameState=cleanedName();if(settings.rankingEnabled&&!BUDGET_PAUSED&&!nameState.valid)$('ranking-note').textContent='ランキング名は空白を除いて8文字以内にしてください。';else if(!rankingBusy)$('ranking-note').textContent=settings.rankingEnabled?rankingSetupMessage:'ランキング登録はOFFです。';
 const rankChar=firstCharacter(ui.character.value),rankShapeEligible=isRankedCharacter(rankChar),rankEligible=Boolean(library&&rankChar&&rankShapeEligible&&library.hasBundledOutline(rankChar)),showRankNotice=Boolean(library&&rankChar&&!playerError&&!rankEligible);
 const eventEligible=rankEligible&&isEventCharacter(rankChar,fontId);
 $('event-start').disabled=busy||rankingBusy||Boolean(playerError)||!eventEligible||!nameState.valid;
 $('event-start').title=eventEligible?'ひらがな限定・イベント専用レートで対戦':'選んだ書体のひらがな1文字で参加できます。';
 $('event-eligibility-note').textContent=eventEligible?'ひらがな1文字限定':'ひらがなを選んでください';
 $('event-eligibility-note').classList.toggle('is-ineligible',Boolean(library&&!eventEligible));
 $('ranked-eligibility-note').hidden=!showRankNotice;
 const rankReason=rankShapeEligible?'選んだ書体に収録された文字を使用してください。':'装飾文字や端末依存系の文字は使用できません。';$('ranked-eligibility-note').querySelector('span:last-child').textContent=rankReason;
 ui.error.textContent=error;$('prepare').disabled=busy||!library||!comLibrary||Boolean(error);$('local-start').disabled=busy||!library||!comLibrary||Boolean(error);$('challenge-start').disabled=busy||rankingBusy||!library||!comLibrary||Boolean(playerError)||(settings.rankingEnabled&&!BUDGET_PAUSED&&!nameState.valid);$('ranked-start').disabled=busy||rankingBusy||!library||Boolean(playerError)||!rankEligible||!nameState.valid;$('room-start').disabled=busy||rankingBusy||!library||!rankChar||Boolean(playerError)||!nameState.valid;$('ranked-start').title=rankEligible?'':rankReason;$('room-start').title=playerError;$('glyph-preview').classList.toggle('invalid',Boolean(playerError));$('com-glyph-preview').classList.toggle('invalid',Boolean(comError));
 for(const id of ['free-start','room-start','ranked-start','event-start']){$(id).disabled=true;$(id).title='メンテナンス中';}
 $('scout-start').disabled=busy||!library||!comLibrary;$('scout-start').title='';
 $('ranking-opt-in').disabled=true;$('ranking-opt-in').checked=false;$('ranking-opt-in').setAttribute('aria-label','ランキング登録はメンテナンス中');
 $('ranking-note').textContent='オンライン機能・ランキング更新はメンテナンス中です。連戦チャレンジは記録なしで遊べます。';
 $('ranked-rating').textContent='メンテナンス中';
 $('ranked-eligibility-note').hidden=true;$('event-eligibility-note').hidden=true;
 const measurePlayer=Boolean(library&&!playerError&&firstCharacter(ui.character.value)),measureCom=Boolean(comLibrary&&!comError&&ui.opponent.value.trim());
 if(!measurePlayer)setGauges(null);
 if(!measureCom)setGauges(null,'com-stat');
 if(!measurePlayer&&!measureCom)return;
 // Metrics use only the 2D outline. Meshes and physics colliders are built on Start.
 metricTimer=setTimeout(()=>{
  if(measurePlayer)try{setGauges(library.measure(ui.character.value,regulation));}catch(e){setGauges(null);ui.error.textContent=e.message;$('prepare').disabled=true;}
  if(measureCom)try{setGauges(comLibrary.measure(ui.opponent.value,regulation),'com-stat');}catch(e){setGauges(null,'com-stat');ui.error.textContent=e.message;$('prepare').disabled=true;}
 },100);
}
function chooseCOM(forceRandom=false,eventId=null){
 if(eventId===EVENT_ID){
  const available=comLibrary.randomPools.hiragana.filter(char=>isEventCharacter(char,comFontId));
  const different=available.filter(char=>char!==selectedCom),pool=different.length?different:available;
  if(!pool.length)throw new Error('この書体にはイベントで使えるひらがながありません。');
  return pool[Math.floor(Math.random()*pool.length)];
 }
 if(!forceRandom&&ui.opponent.value.trim())return validateCharacter(ui.opponent.value,regulation,comLibrary.supports);
 let next=randomCharacter(regulation,comLibrary.randomPools);
 if(forceRandom&&next===selectedCom){
  const alternatives=comLibrary.randomPools.all.filter(char=>char!==selectedCom);
  if(alternatives.length)next=alternatives[Math.floor(Math.random()*alternatives.length)];
 }
 return next;
}
function nextChallengeFont(){if(!challengeFontBag.length)challengeFontBag=shuffled(Object.keys(FONTS));return challengeFontBag.pop();}
function useComFont(id){comFontId=id;comLibrary=fontLibraries.get(id);document.body.style.setProperty('--com-glyph-font',`${FONTS[id].family},${FONTS[id].fallback}`);updateChoices();}
function cancelStageDrags(){
 sound.stopRopes();
 for(const id of [drag?.id,...localDrags.keys()])if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
 drag=null;localDrags.clear();updatePullCancelZones();
}
function changeStage(stageId){
 if(mode==='scout')return scout.changeStage(getStage(stageId).id);
 if(!(['standard','local'].includes(mode)||mode==='challenge'&&canChooseChallengeStage(streak,challengeStarted))||phase!=='ready'||busy||!battle||renderRecovery.blocked)return false;
 if(getStage(stageId).id===battle.stage.id)return true;
 const previous=battle,glyphs=previous.tops.map(top=>top.glyph),next=new Battle(glyphs,{...previous.comLaunch},{stageId});
 if(mode==='local')next.faceOpponent();
 try{view.setBattle(next);}catch(error){next.dispose();view.setBattle(previous);throw error;}
 cancelStageDrags();battle=next;previous.dispose();selectedStageId=next.stage.id;
 if(mode==='challenge')challengeStageId=next.stage.id;
 if(!writeSelectedStage(selectedStageId))$('storage-note').hidden=false;
 angle=0;power=.8;aimVisible=false;localActions=[null,null];localAim=[{angle:0,power:.8,visible:false},{angle:0,power:.8,visible:false}];
 $('player-label').textContent=mode==='local'?'1P':'あなた';$('opponent-label').textContent=mode==='challenge'?'CPU':mode==='local'?'2P':'COM';
 $('clock').textContent='00.0';$('player-spin').value=1;$('com-spin').value=1;last=null;updateAim();showPhase('ready');
 return true;
}
async function generate(reuse=false,seamless=false){
 if(busy||!library||!comLibrary)return;
 try{validateCharacter(selectedPlayer,regulation,library.supports);if(mode!=='challenge'&&ui.opponent.value.trim())validateCharacter(ui.opponent.value,regulation,comLibrary.supports);}catch{refreshInput();return;}
 busy=true;clearTimeout(metricTimer);ui.error.textContent='';$('setup-fields').disabled=true;$('prepare').disabled=true;$('local-start').disabled=true;$('challenge-start').disabled=true;if(!seamless)showPhase('generating');document.documentElement.dataset.appPreparing='true';$('loading').hidden=seamless;if(!seamless)$('loading').querySelector('p').textContent='文字を立体にしています…';$('retry-load').hidden=true;
 try{
  if(mode==='challenge')useComFont(nextChallengeFont());else useComFont(standardComFontId);
  const char=validateCharacter(selectedPlayer,regulation,library.supports),enemy=mode!=='challenge'&&reuse&&selectedCom?validateCharacter(selectedCom,regulation,comLibrary.supports):mode==='challenge'?(await drawChallengeEnemy([[comFontId,comLibrary]],{previous:selectedCom})).glyph:chooseCOM();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const glyphs=[library.get(char,regulation),comLibrary.get(enemy,regulation)];view ||= new ArenaView($('arena'),renderRecovery.quality,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});
  const comLaunch=createComLaunch(mode==='challenge'?'strong':difficulty);
  if(mode==='standard')comLaunch.spinDirection=comSpinDirection;
  await warmAppPhysics(glyphs);const next=new Battle(glyphs,comLaunch,{stageId:stageForMode(mode==='challenge'?challengeStageId:selectedStageId,mode).id});if(mode==='local')next.faceOpponent();view.clearEffects();battle?.dispose();battle=next;selectedCom=enemy;view.setBattle(battle);
  $('player-char').textContent=char;$('com-char').textContent=enemy;$('com-char').dataset.font=comFontId;
  $('player-label').textContent=mode==='local'?'1P':'あなた';$('opponent-label').textContent=mode==='challenge'?'CPU':mode==='local'?'2P':'COM';
  setGauges(glyphs[0]);$('clock').textContent='00.0';$('player-spin').value=1;$('com-spin').value=1;angle=0;power=.8;aimVisible=false;localActions=[null,null];localAim=[{angle:0,power:.8,visible:false},{angle:0,power:.8,visible:false}];localDrags.clear();updateAim();save();showPhase('ready');if(!seamless)showRoundIntro();window.scrollTo({top:0,behavior:'instant'});$('arena').focus({preventScroll:true});
  $('loading').hidden=true;last=null;sound.scout('appear');const arrival=view.animateTops([0,1]);view.draw(battle,1,0);await arrival;
 }catch(error){showPhase('setup');ui.error.textContent=error.message||'文字を生成できませんでした。別の文字を試してください。';}
 finally{document.documentElement.dataset.appPreparing='false';busy=false;$('setup-fields').disabled=false;refreshInput();$('loading').hidden=!renderRecovery.blocked;}
 updateSpinDirectionButton();
}
function updateAim(){updatePullCancelZones();if(mode==='local')localAim.forEach((aim,index)=>view?.aim(aim.angle,aim.power,phase==='ready'&&aim.visible,index));else{view?.aim(angle,power,phase==='ready'&&aimVisible,0);view?.aim(0,0,false,1);}}
function showRoundIntro(){const intro=$('round-intro'),enemy=['ranked','room'].includes(mode)?ranked?.players?.[1-(ranked.localIndex||0)]?.glyph:battle?.tops[1]?.glyph.char||selectedCom||'？';intro.textContent=mode==='challenge'?`${streak+1}戦目 ${enemy}`:mode==='local'?'1P VS 2P':['ranked','room'].includes(mode)?`${enemy||'？'}  VS`:'試合開始';intro.classList.remove('is-visible');void intro.offsetWidth;intro.classList.add('is-visible');}
let budgetRankingsPromise;
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
let matchIdentityReady=false;
async function api(path,options={}){
 if(BUDGET_PAUSED){
  const url=new URL(path,'https://local.invalid/');
  if((options.method||'GET')==='GET'&&(url.pathname==='/rankings'||url.pathname==='/rankings/rating')){
   budgetRankingsPromise??=fetch('./budget-rankings.json',{cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error('読み込み中...');return response.json();}).catch(error=>{budgetRankingsPromise=null;throw error;});
   const snapshots=await budgetRankingsPromise,period=url.searchParams.get('period')||'current',type=url.pathname==='/rankings'?'streak':url.searchParams.has('event')?'event':'rating';
   const data=snapshots.rankings[`${period}:${type}`];
   if(data)return structuredClone(data);
  }
  const error=new Error('オンライン機能はメンテナンス中です。');error.status=410;throw error;
 }

 const {timeoutMs=25000,...fetchOptions}=options;
 const response=await fetch(`/api/moji-blade/${path}`,{credentials:'same-origin',signal:AbortSignal.timeout(timeoutMs),...fetchOptions,headers:{'content-type':'application/json',...(fetchOptions.headers||{})}});
 let data={};try{data=await response.json();}catch{}
 if(!response.ok){const error=new Error(data.error||'ランキングに接続できませんでした。');error.status=response.status;error.retryAfterMs=Math.min(10000,Math.max(0,Number(response.headers.get('retry-after'))*1000||0));throw error;}return data;
}
const transientApiError=error=>!error?.status||error.status===429||error.status>=500;
async function connectMatch(path,body,isActive=()=>true,maxAttempts=5){
 const check=()=>{if(!isActive())throw new DOMException('接続をキャンセルしました。','AbortError');};
 check();if(!matchIdentityReady){await api('identity',{timeoutMs:8000,headers:{}});matchIdentityReady=true;}
 let lastError;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  check();try{return await api(path,{method:'POST',body:JSON.stringify(body),timeoutMs:8000});}
  catch(error){lastError=error;if(!transientApiError(error)||attempt===maxAttempts-1)break;await wait(Math.max(error.retryAfterMs||0,1500*(attempt+1)));}
 }
 throw lastError;
}
function cacheRankings(type,data,period='current'){try{const cache=JSON.parse(localStorage.getItem(RANKING_CACHE_KEY)||'{}');cache[`${period}:${type}`]={savedAt:Date.now(),data};localStorage.setItem(RANKING_CACHE_KEY,JSON.stringify(cache));}catch{}}
function cachedRankings(type,period='current'){try{const value=JSON.parse(localStorage.getItem(RANKING_CACHE_KEY)||'{}')?.[`${period}:${type}`];return value?.data&&Array.isArray(value.data.rankings)?value:null;}catch{return null;}}
function invalidateRankings(type){try{const cache=JSON.parse(localStorage.getItem(RANKING_CACHE_KEY)||'{}');if(cache[`current:${type}`])cache[`current:${type}`].savedAt=0;localStorage.setItem(RANKING_CACHE_KEY,JSON.stringify(cache));}catch{}}
function queueChallengeResult(payload){try{localStorage.setItem(PENDING_CHALLENGE_KEY,JSON.stringify(payload));}catch{}}
function clearQueuedChallengeResult(){try{localStorage.removeItem(PENDING_CHALLENGE_KEY);}catch{}}
async function retryQueuedChallengeResult(){if(BUDGET_PAUSED)return;
 let payload;try{payload=JSON.parse(localStorage.getItem(PENDING_CHALLENGE_KEY)||'null');}catch{return;}
 if(!payload?.sessionId)return;
 try{await api('challenge/finish',{method:'POST',body:JSON.stringify(payload),keepalive:true});clearQueuedChallengeResult();invalidateRankings('streak');}
 catch(error){if([400,401,404,409].includes(error.status))clearQueuedChallengeResult();}
}
const requestId=prefix=>`${prefix}:${crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}`;
const quantizeAngle=value=>Math.round((((value+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI)*10000);
const quantizePower=value=>Math.round(Math.max(.15,Math.min(1,value))*1000);
const decodeAction=value=>({angle:value.angleQ/10000,power:value.powerQ/1000,spinDirection:value.spinDirection===-1?-1:1});
function updateRankedButtonRating(value,eventId=null){if(eventId)return;ratingRevision++;currentRating=Number.isFinite(Number(value))?Number(value):1500;$('ranked-rating').textContent=`レート ${currentRating}`;}
async function loadCurrentRating(){if(BUDGET_PAUSED)return;const revision=ratingRevision;try{const data=await api('rankings/me',{headers:{}});if(revision===ratingRevision)updateRankedButtonRating(data.rating??1500);}catch{}}
function saveRanked(value){try{if(value)localStorage.setItem(RANKED_KEY,JSON.stringify(value));else localStorage.removeItem(RANKED_KEY);}catch{$('storage-note').hidden=false;}}
function rankedOverlay({kind='waiting',title='',detail='',deadline=0,cancel=true}={}){
 const overlay=$('ranked-overlay'),host=$(['preparing','aim','submitted'].includes(kind)?'battle-hud':'viewport');if(overlay.parentElement!==host)host.append(overlay);overlay.hidden=false;overlay.classList.toggle('is-preparing',kind==='preparing');overlay.classList.toggle('is-aiming',kind==='aim');overlay.classList.toggle('is-submitted',kind==='submitted');overlay.classList.toggle('is-practice',kind==='practice');overlay.classList.toggle('is-failed',kind==='failed');$('ranked-spinner').hidden=['aim','submitted','preparing','failed'].includes(kind);$('ranked-status').textContent=title;$('ranked-detail').textContent=detail;$('ranked-cancel').hidden=!cancel;$('ranked-cancel').textContent=kind==='failed'?'戻る':'キャンセル';$('ranked-retry').hidden=kind!=='failed';$('ranked-practice-label').hidden=kind!=='practice';overlay.dataset.deadline=deadline||'';updateRankedCountdown();
}
function hideRankedOverlay(){$('ranked-practice-label').hidden=true;$('ranked-overlay').hidden=true;$('ranked-overlay').classList.remove('is-aiming','is-submitted','is-preparing','is-practice','is-failed');$('ranked-overlay').dataset.deadline='';$('ranked-retry').hidden=true;$('ranked-cancel').textContent='キャンセル';}
function cancelRankedVersus(){
 clearTimeout(rankedIntroTimer);rankedIntroTimer=0;const overlay=$('ranked-versus');overlay.classList.remove('is-visible');overlay.hidden=true;
 sound.stopCue('versus');
 if(rankedIntroResolve){const resolve=rankedIntroResolve;rankedIntroResolve=null;resolve(false);}
}
function playRankedVersus(data){
 cancelRankedVersus();const local=data.players[data.localIndex],opponent=data.players[1-data.localIndex],overlay=$('ranked-versus');
 sound.preloadMatchCue('countdown');
 $('versus-opponent-name').textContent=opponent.name;$('versus-opponent-glyph').textContent=opponent.glyph;$('versus-opponent-glyph').style.fontFamily=`${FONTS[opponent.font].family},${FONTS[opponent.font].fallback}`;$('versus-opponent-rating').textContent=mode==='ranked'?`レート ${opponent.rating}`:'';
 $('versus-local-name').textContent=local.name;$('versus-local-glyph').textContent=local.glyph;$('versus-local-glyph').style.fontFamily=`${FONTS[local.font].family},${FONTS[local.font].fallback}`;$('versus-local-rating').textContent=mode==='ranked'?`レート ${local.rating}`:'';
 hideRankedOverlay();showPhase('ranked-intro');overlay.hidden=false;void overlay.offsetWidth;overlay.classList.add('is-visible');sound.versus();
 return new Promise(resolve=>{rankedIntroResolve=resolve;rankedIntroTimer=setTimeout(()=>{rankedIntroTimer=0;rankedIntroResolve=null;overlay.classList.remove('is-visible');overlay.hidden=true;sound.stopCue('versus');resolve(true);},RANKED_INTRO_MS);});
}
function resetResultRating(message=''){
 cancelAnimationFrame(ratingFrame);ratingFrame=0;const output=$('result-ranking-status');output.className='result-ranking-status';output.textContent=message;
}
function showRatingPending(message='レート集計中...'){resetResultRating(message);$('result-ranking-status').classList.add('is-pending');}
function showRankedRating(result,animate=true){
 const rating=Number(result?.rating),delta=Number(result?.delta);if(!Number.isFinite(rating)||!Number.isFinite(delta)){resetResultRating('結果を確認できませんでした。');return;}
 const previous=rating-delta,output=$('result-ranking-status'),tone=delta>0?'positive':delta<0?'negative':'neutral',key=`${rating}:${delta}`;
 if(ranked?.ratingAnimationKey===key)animate=false;else if(ranked)ranked.ratingAnimationKey=key;
 cancelAnimationFrame(ratingFrame);output.className=`result-ranking-status rating-change is-${tone}`;output.replaceChildren();
 const flow=document.createElement('span'),before=document.createElement('span'),arrow=document.createElement('span'),after=document.createElement('strong'),change=document.createElement('b');flow.className='rating-flow';before.textContent=`レート ${previous}`;arrow.className='rating-arrow';arrow.textContent='→';after.textContent=String(animate?previous:rating);change.className='rating-delta';change.textContent=`${delta>=0?'+':''}${delta}`;flow.append(before,arrow,after);output.append(flow,change);
 if(!animate||reducedMotion.matches){after.textContent=String(rating);output.classList.add('is-complete');return;}
 const started=performance.now();function update(now){const progress=Math.min(1,(now-started)/RATING_ANIMATION_MS),ease=1-(1-progress)**3;after.textContent=String(Math.round(previous+(rating-previous)*ease));if(progress<1)ratingFrame=requestAnimationFrame(update);else{ratingFrame=0;output.classList.add('is-complete');}}ratingFrame=requestAnimationFrame(update);
}
function setRatingSaveNote(message){
 const output=$('result-ranking-status');let note=output.querySelector('.rating-save-note');
 if(!message){note?.remove();return;}
 if(!note){note=document.createElement('small');note.className='rating-save-note';output.append(note);}note.textContent=message;
}
function syncRankedResultActions(current=ranked){
 if(mode!=='ranked'||phase!=='result'||ranked!==current)return;
 $('edit-character').disabled=false;
 $('replay').disabled=Boolean(current?.resultUnavailable);
 $('replay').textContent='次のバトル';
}
function showLocalRankedRating(current,outcome=current?.pendingResult?.outcome){
 const local=current?.players?.[current.localIndex],opponent=current?.players?.[1-current.localIndex];
 if(!local||!opponent){showRatingPending();return;}
 const before=Number(local.rating),expected=1/(1+10**((Number(opponent.rating)-before)/400));
 const rounded=Math.round(32*((outcome==='win'?1:0)-expected));
 const delta=outcome==='draw'?0:outcome==='win'?Math.max(1,rounded):Math.min(-1,rounded),rating=Math.max(0,before+delta);
 showRankedRating({rating,delta:rating-before});setRatingSaveNote('保存中...');
}
function expireRankedWait(){
 if(mode!=='ranked'||!ranked||ranked.matchId||ranked.expired)return;
 ranked.expired=true;clearTimeout(rankedPollTimer);drag=null;aimVisible=false;updateAim();sound.pause();
 if(battle)battle.running=false;showPhase('matchmaking');
 rankedOverlay({kind:'failed',title:'対戦相手と\nマッチしませんでした',cancel:true});
 // One final lookup accepts a match made just before expiry. Never hide the
 // buttons while waiting for it, and never automatically create another queue.
 if(ranked.ticketId&&!ranked.polling)pollRanked();
}
async function closeExpiredRankedWait(current){
 if(current.waitClosed||!/^m[23][kt]:/.test(current.ticketId||''))return;current.waitClosed=true;
 try{
  const data=await api('ranked/leave',{method:'POST',body:JSON.stringify({ticketId:current.ticketId,waitingOnly:true}),timeoutMs:8000,keepalive:true});
  if(data.matchId)await handleRankedStatus(data,current);
 }catch{ /* The server expires the ticket even if this final cleanup fails. */ }
}
function updateRankedCountdown(){
 if(ranked?.preparingUntil&&Date.now()>ranked.preparingUntil+2000&&!ranked.inputStarted&&!ranked.expired){
  ranked.expired=true;clearTimeout(rankedPollTimer);clearRankedActionTimer();if(battle)battle.running=false;showPhase('matchmaking');
  rankedOverlay({kind:'failed',title:'対戦の準備が\n間に合いませんでした',cancel:true});return;
 }
 const overlay=$('ranked-overlay');if(overlay.hidden)return;
 const deadline=Number(overlay.dataset.deadline||0),output=$('ranked-countdown'),remaining=Math.max(0,(deadline-Date.now())/1000);
 output.textContent=deadline?(overlay.classList.contains('is-practice')?String(Math.ceil(remaining)):remaining.toFixed(1)):'';
 if(deadline&&remaining===0&&overlay.classList.contains('is-practice'))expireRankedWait();
}
function clearRankedActionTimer(){clearTimeout(rankedActionTimer);rankedActionTimer=0;}
function beginRankedInputTimer(serverDeadline){
 if(ranked?.inputDeadline)return ranked.inputDeadline;
 const localDeadline=Date.now()+RANKED_INPUT_MS;ranked.inputDeadline=Math.min(Number(serverDeadline)||localDeadline,localDeadline);clearRankedActionTimer();
 rankedActionTimer=setTimeout(()=>{rankedActionTimer=0;if(isNetworkMatch()&&phase==='ready'&&ranked?.matchId)submitRankedAction(true);},Math.max(0,ranked.inputDeadline-Date.now()));return ranked.inputDeadline;
}
async function submitRankedReady(){
 const current=ranked;if(!current?.matchId||current.readySending)return;current.readySending=true;
 showPhase('ranked-wait');rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});
 try{await handleRankedStatus(await api('ranked/ready',{method:'POST',body:JSON.stringify({matchId:current.matchId}),timeoutMs:8000}),current);}
 catch(error){if(ranked===current&&!current.completed&&!['battle','finishing','result','ranked-intro'].includes(phase)){if(!current.inputDeadline&&!current.waitDeadline)rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});scheduleRankedPoll(2000);}}
 finally{current.readySending=false;}
}
function scheduleRankedPoll(delay=1500){
 clearTimeout(rankedPollTimer);const current=ranked;if(!current||current.completed||current.expired)return;
 rankedPollTimer=setTimeout(()=>{if(ranked===current)pollRanked();},globalThis.document?.hidden?Math.max(delay,5000):delay);
}
async function pollRanked(){
 const current=ranked;if(!current||current.polling||current.completed)return;current.polling=true;
 try{
  const path=current.kind==='room'?`room/status?code=${encodeURIComponent(current.roomCode)}`:`ranked/status?ticket=${encodeURIComponent(current.ticketId)}${current.matchId?'&match='+encodeURIComponent(current.matchId):''}`;
  await handleRankedStatus(await api(path,{headers:{},timeoutMs:8000}),current);
 }catch(error){
  if(ranked!==current||current.expired||current.completed||['battle','finishing','result','ranked-intro'].includes(phase))return;
  if(!current.matchId)rankedOverlay({kind:'practice',title:'マッチング中...',detail:'通信を再試行しています',deadline:current.deadline||0,cancel:true});
  else if(!current.inputDeadline&&!current.waitDeadline)rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});
  scheduleRankedPoll(error?.status===429||error?.status>=500?6000:3000);
 }finally{current.polling=false;}
}
function startRankedPractice(){
 if(!ranked||ranked.matchId)return;const char=validateCharacter(ui.character.value,regulation,library.supports),enemy=chooseCOM(true,ranked.eventId),glyphs=[library.get(char,regulation),comLibrary.get(enemy,regulation)];
 battle?.dispose();battle=new Battle(glyphs,createComLaunch('normal'));ranked.practice=true;ranked.localIndex=0;selectedCom=enemy;drag=null;view ||= new ArenaView($('arena'),renderRecovery.quality,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});view.clearEffects();view.setBattle(battle,0);
 document.body.style.setProperty('--glyph-font',`${FONTS[fontId].family},${FONTS[fontId].fallback}`);document.body.style.setProperty('--com-glyph-font',`${FONTS[comFontId].family},${FONTS[comFontId].fallback}`);
 $('player-label').textContent='あなた';$('opponent-label').textContent='お試しCPU';$('player-char').textContent=char;$('com-char').textContent=enemy;$('player-spin').value=1;$('com-spin').value=1;$('clock').textContent='00.0';angle=0;power=.8;aimVisible=false;showPhase('ready');rankedOverlay({kind:'practice',title:mode==='room'?`ルーム ${ranked.roomCode}・待機中`:'マッチング中...',deadline:mode==='room'?0:ranked.deadline||0,cancel:true});$('arena').focus({preventScroll:true});
}
async function prepareRankedBattle(data){
 if(battle&&ranked?.matchId===data.matchId)return;
 busy=true;$('loading').hidden=false;$('loading').querySelector('p').textContent='対戦する文字を立体にしています…';
 try{
  const local=data.players[data.localIndex],opponent=data.players[1-data.localIndex];if(mode==='ranked')updateRankedButtonRating(local.rating,ranked.eventId);document.body.style.setProperty('--glyph-font',`${FONTS[local.font].family},${FONTS[local.font].fallback}`);document.body.style.setProperty('--com-glyph-font',`${FONTS[opponent.font].family},${FONTS[opponent.font].fallback}`);
  const glyphs=data.players.map(player=>{const lib=fontLibraries.get(player.font);if(!lib||(mode!=='room'&&!lib.hasBundledOutline(player.glyph)))throw new Error('対戦文字のデータを読み込めません。');return lib.get(player.glyph,regulation);});
  battle?.dispose();battle=new Battle(glyphs);battle.faceOpponent();ranked.practice=false;ranked.matchId=data.matchId;ranked.localIndex=data.localIndex;ranked.players=data.players;ranked.deadline=data.serverNow&&data.actionDeadline?Date.now()+Math.max(0,data.actionDeadline-data.serverNow):data.actionDeadline;drag=null;
  view ||= new ArenaView($('arena'),renderRecovery.quality,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});view.clearEffects();view.setBattle(battle,data.localIndex);
  $('player-label').textContent=mode==='ranked'?`あなた\nレート ${local.rating}`:'あなた';$('opponent-label').textContent=mode==='ranked'?`${opponent.name}\nレート ${opponent.rating}`:opponent.name;$('player-char').textContent=local.glyph;$('com-char').textContent=opponent.glyph;$('player-spin').value=1;$('com-spin').value=1;$('clock').textContent='00.0';angle=0;power=.8;aimVisible=false;if(mode==='ranked')saveRanked({ticketId:ranked.ticketId,eventId:ranked.eventId,...(ranked.pendingResult?{pendingResult:ranked.pendingResult}:{})});
 }finally{busy=false;$('loading').hidden=true;}
}
function rankedResultView(data){
 clearTimeout(rankedPollTimer);cancelRankedVersus();ranked.completed=Boolean(data.result);ranked.serverResult=data.result||null;if(data.result&&pendingRankedResult===ranked)pendingRankedResult=null;hideRankedOverlay();showPhase('result');
 const outcome=data.result?.outcome||ranked.pendingResult?.outcome||'loss',local=data.players[data.localIndex],opponent=data.players[1-data.localIndex],winner=outcome==='win'?local:outcome==='loss'?opponent:null,title=$('result-title');
 resetOpponentResultMessage();showOpponentResultMessage(opponent.glyph,outcome==='draw'?null:outcome==='win');
 title.textContent=winner?`${winner.glyph} WIN!`:'DRAW!';title.style.color=outcome==='win'?'#2869dc':outcome==='loss'?'#cc4735':'#405269';title.style.setProperty('--winner-font',winner?outcome==='win'?'var(--glyph-font)':'var(--com-glyph-font)':'system-ui');
 $('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('save-result').hidden=true;$('share-result').hidden=true;
 if(data.result){updateRankedButtonRating(data.result.rating,ranked.eventId);showRankedRating(data.result);saveRanked(null);}
 else if(ranked.pendingResult){showLocalRankedRating(ranked,outcome);reportRankedResult(outcome).catch(()=>{});}
 else{ranked.resultUnavailable=true;resetResultRating('結果を確認できませんでした。文字選びに戻ってください。');saveRanked(null);}
 syncRankedResultActions();sound.result(outcome==='win');title.focus({preventScroll:true});
}
async function handleRankedStatus(data,current=ranked){
 if(!current||ranked!==current||current.completed)return;
 if(data.ticketId&&current.ticketId&&data.ticketId!==current.ticketId)return;
 if(current.matchId&&data.matchId&&current.matchId!==data.matchId)return;
 if(Object.hasOwn(data,'eventId'))current.eventId=data.eventId;
 // Delayed polls must not rewind an active battle or overwrite its result.
 if(!current.practice&&['battle','finishing','result','ranked-intro'].includes(phase))return;
 if(current.matchId&&!current.recovering&&['waiting','matching','expired'].includes(data.state))return;
 if(data.state==='waiting'||data.state==='matching'){if(current.expired){closeExpiredRankedWait(current);return;}ranked.deadline=Math.min(Number(data.expiresAt)||Infinity,ranked.deadline||Infinity);if(!ranked.practice)startRankedPractice();rankedOverlay({kind:'practice',title:mode==='room'?`ルーム ${ranked.roomCode}・待機中`:'マッチング中...',deadline:mode==='room'?0:ranked.deadline,cancel:true});scheduleRankedPoll(2500);return;}
 if(data.state==='expired'){clearRankedActionTimer();clearTimeout(rankedPollTimer);if(mode==='ranked'){expireRankedWait();return;}ranked.expired=true;if(battle)battle.running=false;showPhase('matchmaking');rankedOverlay({kind:'failed',title:'ルームの有効期限が\n切れました',cancel:true});return;}
 if(['aim','playing','finished'].includes(data.state)){
  clearTimeout(rankedPollTimer);current.expired=false;
  if(data.state==='aim'&&!data.inputStarted&&!current.preparingUntil)current.preparingUntil=Date.now()+Math.max(0,Number(data.prepareDeadline||Date.now()+60000)-Number(data.serverNow||Date.now()));
  if(data.inputStarted||data.state!=='aim')current.preparingUntil=0;
  if(current.practice||!current.matchId){drag=null;showPhase('ranked-wait');rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});}
  try{await prepareRankedBattle(data);}catch(error){if(ranked!==current)return;current.expired=true;if(battle)battle.running=false;showPhase('matchmaking');rankedOverlay({kind:'failed',title:'対戦する文字を\n生成できませんでした',detail:error.message,cancel:true});return;}if(ranked!==current)return;
  if(data.ownResolved&&data.result){rankedResultView(data);return;}
  if(data.state==='finished'){rankedResultView(data);return;}
  const shouldIntroduce=['aim','playing'].includes(data.state)&&!data.submitted&&!ranked.recovering&&ranked.introMatchId!==data.matchId;
  if(ranked.recovering)ranked.introMatchId=data.matchId;
  ranked.recovering=false;
  if(shouldIntroduce){ranked.introMatchId=data.matchId;const completed=await playRankedVersus(data);if(!completed||ranked!==current||ranked.matchId!==data.matchId)return;if(data.state==='aim'){await submitRankedReady();return;}}
  if(data.state==='aim'){
   if(current.inputStarted&&!data.inputStarted){scheduleRankedPoll(current.action?900:1500);return;}
   if(current.readyAccepted&&!data.ready){scheduleRankedPoll(1500);return;}
   current.readyAccepted||=data.ready;current.inputStarted||=data.inputStarted;
   if(!data.ready){showPhase('ranked-wait');rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});submitRankedReady();return;}
   if(!data.inputStarted){showPhase(current.rematch&&!current.action?'ready':'ranked-wait');rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});scheduleRankedPoll(1500);return;}
   ranked.deadline=data.serverNow&&data.actionDeadline?Date.now()+Math.max(0,data.actionDeadline-data.serverNow):data.actionDeadline;
   if(current.action&&!data.submitted){sound.countdown();if(!current.actionSending)sendRankedAction(current);scheduleRankedPoll(2000);return;}
   if(data.submitted){clearRankedActionTimer();ranked.waitDeadline||=Math.min(Number(ranked.deadline)||Infinity,Date.now()+RANKED_INPUT_MS);showPhase('ranked-wait');sound.countdown();rankedOverlay({kind:'submitted',deadline:ranked.waitDeadline,cancel:false});scheduleRankedPoll(900);}
   else{showPhase('ready');sound.countdown();rankedOverlay({kind:'aim',title:'発射まで',deadline:beginRankedInputTimer(ranked.deadline),cancel:false});$('arena').focus({preventScroll:true});scheduleRankedPoll(1500);}
   return;
  }
  if(data.state==='playing'&&data.descriptor){
   clearRankedActionTimer();if(data.descriptor.physicsVersion!==PHYSICS_VERSION)throw new Error('物理バージョンが一致しません。再読み込みしてください。');
   const actions=canonicalRankedActions(data.descriptor.actions.map(decodeAction));
   clearTimeout(rankedPollTimer);hideRankedOverlay();if(!battle.running&&!battle.result)battle.launchPair(actions);showPhase('battle');sound.launch();return;
  }
 }
 if(['cancelled','closed','none'].includes(data.state)){clearRankedActionTimer();clearTimeout(rankedPollTimer);cancelRankedVersus();ranked.expired=true;if(battle)battle.running=false;saveRanked(null);showPhase('matchmaking');rankedOverlay({kind:'failed',title:data.cancelReason==='preparation-timeout'?'対戦の準備が\n間に合いませんでした':mode==='room'?'ルームが\n終了しました':'マッチング接続が\n切れました',detail:'戻るか、もう一度接続してください。',cancel:true});return;}
 scheduleRankedPoll(1500);
}
async function beginRanked(eventId=null){
 if(busy||rankingBusy||ranked)return;sound.unlock();const char=validateCharacter(ui.character.value,regulation,library.supports),name=cleanedName();
 if(!isRankedCharacter(char)){ui.error.textContent='ランクマッチでは装飾文字や端末依存系の文字は使用できません。';return;}if(!library.hasBundledOutline(char)){ui.error.textContent='ランクマッチでは、選んだ書体に収録された文字を使ってください。';return;}if(!name.valid){ui.error.textContent='名前は8文字以内にしてください。';return;}
 if(eventId&&(eventId!==EVENT_ID||!isEventCharacter(char,fontId))){ui.error.textContent='ひらがな1文字を選んでください。';return;}
 sound.preloadMatchCue('versus');mode='ranked';window.scrollTo({top:0,behavior:'instant'});view ||= new ArenaView($('arena'),undefined,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});ranked={ticketId:'',eventId,completed:false,localIndex:0,practice:false,introMatchId:null,recovering:false,ratingAnimationKey:null,deadline:0};showPhase('matchmaking');startRankedPractice();
 const current=ranked;
 try{if(pendingRankedLeave)await pendingRankedLeave;if(pendingRankedResult&&!pendingRankedResult.completed){rankedOverlay({kind:'practice',title:'読み込み中...',cancel:true});await waitForRankedResult(pendingRankedResult);}if(ranked!==current||current.expired)return;current.deadline=Date.now()+30000;rankedOverlay({kind:'practice',title:'マッチング中...',deadline:current.deadline,cancel:true});const data=await connectMatch('ranked/join',{name:name.name,glyph:char,font:fontId,physicsVersion:PHYSICS_VERSION,listed:settings.rankingEnabled,eventId},()=>ranked===current&&!current.expired);if(ranked!==current){if(data.ticketId)api('ranked/leave',{method:'POST',body:JSON.stringify({ticketId:data.ticketId}),keepalive:true}).catch(()=>{});return;}ranked.ticketId=data.ticketId;saveRanked({ticketId:data.ticketId,eventId});await handleRankedStatus(data,current);}
 catch(error){if(ranked!==current||current.expired)return;if(!pendingRankedResult)saveRanked(null);if(ranked){ranked.expired=true;if(battle)battle.running=false;showPhase('matchmaking');rankedOverlay({kind:'failed',title:'マッチングに\n接続できませんでした',detail:error.message,cancel:true});}else{showPhase('setup');ui.error.textContent=error.message;refreshInput();}}
}
async function beginRoom(kind,code=''){
 saveRoomCode();
 if(busy||rankingBusy||ranked)return;sound.unlock();const char=validateCharacter(ui.character.value,regulation,library.supports),name=cleanedName();
 if(!name.valid){ui.error.textContent='名前は8文字以内にしてください。';return;}
 sound.preloadMatchCue('versus');
 $('room-error').textContent='';$('room-create').disabled=true;$('room-join').disabled=true;
 try{
  const data=await connectMatch(`room/${kind}`,{code,name:name.name,glyph:char,font:fontId,physicsVersion:PHYSICS_VERSION});
  $('room-dialog').close();mode='room';window.scrollTo({top:0,behavior:'instant'});view ||= new ArenaView($('arena'),undefined,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});ranked={kind:'room',roomCode:data.roomCode,completed:false,localIndex:0,practice:false,introMatchId:null,recovering:false,ratingAnimationKey:null,deadline:Number(data.expiresAt)||Date.now()+300000};showPhase('matchmaking');startRankedPractice();await handleRankedStatus(data);
 }catch(error){$('room-error').textContent=error.message;}
 finally{$('room-create').disabled=false;$('room-join').disabled=false;}
}
async function rematchRoom(){
 const previous=ranked;if(mode!=='room'||!previous?.matchId||previous.rematchSending)return;
 previous.rematchSending=true;$('replay').disabled=true;
 try{
  const data=await api('room/rematch',{method:'POST',body:JSON.stringify({code:previous.roomCode,matchId:previous.matchId}),timeoutMs:8000});
  if(ranked!==previous)return;
  ranked={kind:'room',roomCode:previous.roomCode,completed:false,practice:false,localIndex:previous.localIndex,recovering:true,rematch:true};
  showPhase('ranked-wait');await handleRankedStatus(data);
 }catch(error){if(ranked===previous){$('result-ranking-status').textContent=`再戦に接続できませんでした：${error.message}`;$('replay').disabled=false;}}
 finally{previous.rematchSending=false;}
}
async function retryRanked(){
 if(!ranked?.expired||busy)return;if(mode==='room'){backToSetup().then(()=>$('room-dialog').showModal());return;}const eventId=ranked.eventId||null;await leaveRanked();beginRanked(eventId);
}
async function submitRankedAction(useZeroPower=false){
 if(!isNetworkMatch()||phase!=='ready'||!ranked?.matchId)return;
 const current=ranked;clearRankedActionTimer();ranked.inputDeadline=0;const body={matchId:ranked.matchId,requestId:requestId('action'),angleQ:useZeroPower?0:quantizeAngle(angle),powerQ:useZeroPower?0:quantizePower(power),spinDirection};ranked.action=body;showPhase('ranked-wait');
 if(!current.inputStarted){rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});scheduleRankedPoll(1500);return;}
 ranked.waitDeadline=Math.min(Number(ranked.deadline)||Infinity,Date.now()+RANKED_INPUT_MS);rankedOverlay({kind:'submitted',deadline:ranked.waitDeadline,cancel:false});
 await sendRankedAction(current);
}
async function sendRankedAction(current){
 if(ranked!==current||current.actionSending||current.completed)return;current.actionSending=true;
 try{await handleRankedStatus(await api('ranked/action',{method:'POST',body:JSON.stringify(current.action),timeoutMs:8000}),current);}
 catch(error){if(ranked===current&&!['battle','finishing','result'].includes(phase))scheduleRankedPoll(2000);}
 finally{current.actionSending=false;}
}
function waitForRankedResult(current){
 if(current.completed)return Promise.resolve(current.serverResult);
 if(current.resultUnavailable)return Promise.reject(current.resultError||new Error('前の対戦結果を保存できませんでした。'));
 if(current.resultAttempts>=5&&current.resultPromise&&!current.resultRetryTimer)return current.resultPromise.catch(()=>waitForRankedResult(current));
 if(current.resultAttempts>=5&&!current.resultPromise&&!current.resultRetryTimer)current.resultSettlement=null;
 if(!current.resultSettlement){
  current.resultSettlement=new Promise((resolve,reject)=>{current.resolveResultSettlement=resolve;current.rejectResultSettlement=reject;});
  if(!current.resultPromise&&!current.resultRetryTimer){current.resultAttempts=0;reportRankedResult(current.pendingResult.outcome,current).catch(()=>{});}
 }
 return current.resultSettlement;
}
async function reportRankedResult(outcome,current=ranked){
 if(!current?.matchId)return;if(current.resultUnavailable)return;if(current.completed)return current.serverResult;if(current.resultPromise)return current.resultPromise;
 clearTimeout(current.resultRetryTimer);current.resultRetryTimer=0;
 const body=current.pendingResult||{matchId:current.matchId,requestId:requestId('result'),outcome,stateHash:battle?.stateHash?.()||''};
 current.pendingResult=body;current.resultSubmitted=true;pendingRankedResult=current;saveRanked({ticketId:current.ticketId,eventId:current.eventId,pendingResult:body});
 const task=api('ranked/result',{method:'POST',body:JSON.stringify(body),keepalive:true,timeoutMs:8000}).then(result=>{
  invalidateRankings(current.eventId?'event':'rating');current.serverResult=result;current.completed=true;current.resultError=null;
  if(pendingRankedResult===current)pendingRankedResult=null;
  updateRankedButtonRating(result.rating,current.eventId);if(!ranked||ranked===current||!ranked.ticketId)saveRanked(null);
  if(ranked===current&&phase==='result'){showRankedRating(result);setRatingSaveNote('');syncRankedResultActions(current);}
  current.resolveResultSettlement?.(result);
  return result;
 }).catch(error=>{
  current.resultSubmitted=false;current.resultError=error;current.resultAttempts=(current.resultAttempts||0)+1;
  const retry=(transientApiError(error)||error.status===409)&&current.resultAttempts<5;
  if([400,401,403,404,410].includes(error.status)){
   current.resultUnavailable=true;if(pendingRankedResult===current)pendingRankedResult=null;
   if(!ranked||ranked===current)saveRanked(null);
  }
  if(ranked===current&&phase==='result'){
   if(current.resultUnavailable)resetResultRating('結果を保存できませんでした。文字選びに戻ってください。');
   else{showLocalRankedRating(current);setRatingSaveNote(retry?'保存を再試行中...':'未保存：通信を確認して保存を再試行してください。');}
  }
  if(retry)current.resultRetryTimer=setTimeout(()=>reportRankedResult(outcome,current).catch(()=>{}),Math.max(error.retryAfterMs||0,Math.min(15000,2000*2**(current.resultAttempts-1))));
  else current.rejectResultSettlement?.(error);
  throw error;
 }).finally(()=>{if(current.resultPromise===task)current.resultPromise=null;syncRankedResultActions(current);});
 current.resultPromise=task;syncRankedResultActions(current);return task;
}
async function nextRankedBattle(){
 if(!ranked||ranked.resultUnavailable)return;
 // Enter practice now; beginRanked saves the pending result before queueing.
 const eventId=ranked.eventId||null;await leaveRanked();beginRanked(eventId);
}
async function leaveRanked(){
 clearTimeout(rankedPollTimer);clearRankedActionTimer();cancelRankedVersus();cancelAnimationFrame(ratingFrame);ratingFrame=0;if(!ranked)return;const current=ranked;ranked=null;if(!pendingRankedResult)saveRanked(null);hideRankedOverlay();
 if(current.kind==='room'&&current.roomCode)api('room/leave',{method:'POST',body:JSON.stringify({code:current.roomCode}),keepalive:true}).catch(()=>{});
 else if(current.ticketId&&!current.pendingResult&&!current.completed){
  const task=api('ranked/leave',{method:'POST',body:JSON.stringify({ticketId:current.ticketId}),keepalive:true,timeoutMs:8000}).catch(()=>{}).finally(()=>{if(pendingRankedLeave===task)pendingRankedLeave=null;});
  pendingRankedLeave=task;
 }
}
async function recoverRanked(){if(BUDGET_PAUSED)return;
 if(recoveryAttempted)return;recoveryAttempted=true;let saved=null;try{saved=JSON.parse(localStorage.getItem(RANKED_KEY)||'null');}catch{}if(!saved?.ticketId)return;
 ranked={ticketId:saved.ticketId,eventId:saved.eventId||null,completed:false,localIndex:0,pendingResult:saved.pendingResult||null,resultRequestId:saved.pendingResult?.requestId||null,introMatchId:null,recovering:true,ratingAnimationKey:null};mode='ranked';const current=ranked;
 showPhase('ranked-wait');rankedOverlay({kind:'preparing',title:'待機中...',cancel:false});
 if(saved.pendingResult){
  current.matchId=saved.pendingResult.matchId;pendingRankedResult=current;
  try{await api('ranked/result',{method:'POST',body:JSON.stringify(saved.pendingResult),keepalive:true,timeoutMs:8000});if(pendingRankedResult===current)pendingRankedResult=null;}catch{}
 }
 try{await handleRankedStatus(await api(`ranked/status?ticket=${encodeURIComponent(saved.ticketId)}`,{headers:{},timeoutMs:8000}),current);}catch(error){if(ranked!==current)return;console.error('ランクマッチを復元できませんでした。',error);ranked=null;ui.error.textContent=`ランクマッチを復元できませんでした: ${error.message}`;showPhase('setup');}
}
async function beginRankingSession(){
 rankingBusy=true;rankingSession=null;$('setup-fields').disabled=true;$('ranking-note').textContent='ランキングへ接続中…';refreshInput();
 try{
  const data=await connectMatch('challenge/start',{requestId:requestId('challenge'),name:cleanedName().name,glyph:selectedPlayer,font:fontId,physicsVersion:PHYSICS_VERSION},()=>mode==='challenge',3);
  rankingSession={sessionId:data.sessionId,roundId:data.roundId,wins:Number(data.wins)||0};rankingSetupMessage='ランキングに参加中です。COMの強さは「強」で固定されます。';
 }catch(error){rankingSetupMessage=`ランキングへの接続に失敗しました：${error.message} 連勝チャレンジを押して再試行してください。`;}
 finally{rankingBusy=false;$('setup-fields').disabled=false;save();refreshInput();}
}
async function reportChallengeWin(){
 if(!rankingSession)return null;
 const current=rankingSession,data=await api('challenge/win',{method:'POST',body:JSON.stringify({sessionId:current.sessionId,roundId:current.roundId,expectedWins:streak}),keepalive:true});
 if(rankingSession===current){current.roundId=data.roundId;current.wins=Number(data.wins);invalidateRankings('streak');}
 return data;
}
function syncChallengeWin(){
 const task=(async()=>{for(let attempt=0;;attempt++){
  try{return await reportChallengeWin();}
  catch(error){if(attempt>=2||(error.status&&error.status<500&&error.status!==429))throw error;await wait([2000,5000][attempt]);}
 }})();
 rankingPending=task;task.then(()=>{if(rankingPending===task)rankingPending=null;},()=>{if(rankingPending===task)rankingPending=null;});return task;
}
async function reportChallengeResult(result){
 if(!rankingSession)return null;
 if(streak<=0){rankingSession=null;return {wins:0,self:null};}
 try{
  const data=await api('challenge/result',{method:'POST',body:JSON.stringify({sessionId:rankingSession.sessionId,result}),keepalive:true});
  clearQueuedChallengeResult();invalidateRankings('streak');rankingSession=null;
  return data;
 }catch(error){queueChallengeResult({sessionId:rankingSession.sessionId});rankingSession=null;throw error;}
}
function syncChallengeResult(result){
 const task=reportChallengeResult(result);rankingPending=task;task.then(()=>{if(rankingPending===task)rankingPending=null;},()=>{if(rankingPending===task)rankingPending=null;});return task;
}
async function finalizeChallenge(){
 if(mode!=='challenge')return;
 if(rankingPending)try{await rankingPending;}catch{}
 if(!rankingSession)return;if(streak<=0){rankingSession=null;return {wins:0,self:null};}const payload={sessionId:rankingSession.sessionId};
 try{const data=await api('challenge/finish',{method:'POST',body:JSON.stringify(payload),keepalive:true});clearQueuedChallengeResult();invalidateRankings('streak');return data;}
 catch(error){queueChallengeResult(payload);throw error;}
 finally{rankingSession=null;}
}
function rankingRowClass(element,entry){if(entry.rank<=3)element.classList.add(`ranking-rank-${entry.rank}`);if(entry.isSelf)element.classList.add('ranking-own');}
function renderRankings(data){
 if(!data.type||data.type==='streak')if(data.self&&!rememberChallengeBest(challengeRecords,'standard',data.self))$('storage-note').hidden=false;
 const rows=$('ranking-rows');rows.replaceChildren();
 const rating=data.type==='rating'||data.type==='event';$('ranking-table').classList.toggle('rating-mode',rating);$('my-ranking').classList.toggle('rating-mode',rating);$('ranking-kicker').textContent=data.type==='event'?EVENT_TITLE:rating?'ランクマッチ':'連戦チャレンジ';
 $('ranking-columns').innerHTML=rating?'<col class="rank-col"><col class="name-col"><col class="rating-col">':'<col class="rank-col"><col class="name-col"><col class="glyph-col"><col class="font-col"><col class="wins-col">';
 $('ranking-head').innerHTML=rating?'<tr><th scope="col">順位</th><th scope="col">名前</th><th scope="col">レート</th></tr>':'<tr><th scope="col">順位</th><th scope="col">名前</th><th scope="col">文字</th><th scope="col">書体</th><th scope="col">連勝</th></tr>';
 for(const entry of data.rankings){
  const tr=document.createElement('tr');rankingRowClass(tr,entry);
  for(const value of [entry.rank,entry.name]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  if(rating){const value=document.createElement('td');value.textContent=entry.rating;tr.append(value);rows.append(tr);continue;}
  const glyph=document.createElement('td');glyph.className='ranking-glyph';glyph.textContent=entry.glyph;const spec=FONTS[entry.font];if(spec)glyph.style.fontFamily=`${spec.family},${spec.fallback}`;tr.append(glyph);
  const font=document.createElement('td');font.className='ranking-font';font.textContent=spec?.label||entry.font;tr.append(font);
  const wins=document.createElement('td');wins.textContent=`${entry.wins}勝`;tr.append(wins);rows.append(tr);
 }
 $('ranking-empty').hidden=data.rankings.length>0;
 const mine=$('my-ranking');mine.replaceChildren();mine.classList.remove('ranking-rank-1','ranking-rank-2','ranking-rank-3');
 if(data.self){
  if(data.self.rank<=3)mine.classList.add(`ranking-rank-${data.self.rank}`);
  const values=[data.self.rank,data.self.name],spec=FONTS[data.self.font];for(const value of values){const span=document.createElement('span');span.textContent=value;mine.append(span);}
  if(rating){const value=document.createElement('span');value.className='ranking-wins';value.textContent=data.self.rating;mine.append(value);}
  else{
  const glyph=document.createElement('span');glyph.className='ranking-glyph';glyph.textContent=data.self.glyph;if(spec)glyph.style.fontFamily=`${spec.family},${spec.fallback}`;mine.append(glyph);
  const font=document.createElement('span');font.className='ranking-font';font.textContent=spec?.label||data.self.font;mine.append(font);
  const wins=document.createElement('span');wins.className='ranking-wins';wins.textContent=`${data.self.wins}勝`;mine.append(wins);
  }
 }else{const empty=document.createElement('span');empty.className='my-ranking-empty';empty.textContent=BUDGET_PAUSED?'停止時点のランキングです。記録更新はメンテナンス中です。':rating?'登録ONで対戦を終えると掲載されます。':'あなたの記録はまだありません。1勝以上で登録されます。';mine.append(empty);}
}
async function loadRankings(type=rankingView,period=rankingPeriod){
 clearTimeout(rankingRetryTimer);rankingRetryTimer=0;
 const revision=++rankingRequestRevision;
 rankingView=type;rankingPeriod=period;$('ranking-period').value=period;$('ranking-period').hidden=type==='event';$('event-ranking-tab').setAttribute('aria-selected',String(type==='event'));$('streak-ranking-tab').setAttribute('aria-selected',String(type==='streak'));$('rating-ranking-tab').setAttribute('aria-selected',String(type==='rating'));$('ranking-loading').textContent='読み込み中...';$('ranking-loading').hidden=false;$('ranking-content').hidden=true;
 const requestedPeriod=type==='event'?'current':period,cached=cachedRankings(type,requestedPeriod);
 if(cached){renderRankings(cached.data);$('ranking-loading').hidden=true;$('ranking-content').hidden=false;if(Date.now()-cached.savedAt<RANKING_CLIENT_CACHE_MS)return;}
 try{const path=type==='event'?`rankings/rating?event=${EVENT_ID}&period=current`:type==='rating'?`rankings/rating?period=${period}`:`rankings?period=${period}`;const data=await api(path,{headers:{},timeoutMs:12000});cacheRankings(type,data,requestedPeriod);if(revision!==rankingRequestRevision)return;renderRankings(data);$('ranking-loading').hidden=true;$('ranking-content').hidden=false;}
 catch(error){if(revision!==rankingRequestRevision)return;if(!cached)$('ranking-loading').textContent='読み込み中...';if($('ranking-dialog').open)rankingRetryTimer=setTimeout(()=>{if($('ranking-dialog').open&&revision===rankingRequestRevision)loadRankings(type,period);},Math.max(20000,error.retryAfterMs||0));}
}
async function openRankings(){
 const dialog=$('ranking-dialog');dialog.showModal();$('ranking-loading').textContent='読み込み中...';$('ranking-loading').hidden=false;$('ranking-content').hidden=true;
 await loadRankings();
}
async function nextChallengeBattle(){
 if(mode!=='challenge'||phase!=='result'||busy)return;
 if(rankingSession&&rankingSession.wins<streak){
  $('next-battle').disabled=true;$('result-ranking-status').textContent='勝利を再送中…';
  try{const data=await syncChallengeWin();$('result-ranking-status').textContent=`${data.wins}連勝を記録しました。`;$('next-battle').textContent='次のバトル';}
  catch(error){$('result-ranking-status').textContent=`記録できませんでした: ${error.message}`;$('next-battle').textContent='記録を再試行';}
  finally{$('next-battle').disabled=false;}
  return;
 }
 const arenaSection=document.querySelector('.arena-section');
 view?.clearEffects();
 view?.groups.forEach(group=>{group.visible=false;});
 arenaSection.classList.add('is-changing');
 await wait(reducedMotion.matches?0:260);
 let nextReady=false;
 try{
  await generate(false,true);
  nextReady=mode==='challenge'&&phase==='ready';
  if(nextReady)view?.groups.forEach(group=>{group.visible=false;});
 }
 finally{
  arenaSection.classList.remove('is-changing');
  await wait(reducedMotion.matches?0:320);
  if(nextReady){view?.groups.forEach(group=>{group.visible=true;});showRoundIntro();}
 }
}
function fire(){if(scout.paused||phase!=='ready'||busy||!battle||$('stage-dialog').open||renderRecovery.blocked||mode==='local')return;sound.unlock();drag=null;if(isNetworkMatch()){submitRankedAction();return;}if(!battle.launch(angle,power,spinDirection))return;sound.launch();if(mode==='challenge')challengeStarted=true;if(mode==='scout')scout.launch();showPhase('battle');}
function lockLocalAction(index){
 if(mode!=='local'||phase!=='ready'||busy||!battle||$('stage-dialog').open||renderRecovery.blocked||localActions[index])return;
 const aim=localAim[index];localActions[index]={angle:aim.angle,power:aim.power,spinDirection:index===0?spinDirection:comSpinDirection};aim.visible=true;updateAim();updateSpinDirectionButton();
 $('player-label').textContent=localActions[0]?'1P ✓':'1P';$('opponent-label').textContent=localActions[1]?'2P ✓':'2P';
 if(localActions.every(Boolean)){
  if(!battle.launchPair(localActions))return;
  $('player-label').textContent='1P';$('opponent-label').textContent='2P';sound.launch();showPhase('battle');
 }else $('phase-label').textContent=localActions[0]?'2P の発射待ち':'1P の発射待ち';
}

function finishBattle(){if(phase!=='battle')return;if(mode==='scout')scout.settle(battle.result);view.draw(battle,1,0);if(view.finish(battle))sound.shatter();finishElapsed=0;showPhase('finishing');if(mode==='ranked'&&!ranked?.practice)reportRankedResult(outcomeForWinner(battle.result.winner,ranked.localIndex)).catch(()=>{});}
function elementFont(element){const style=getComputedStyle(element);return `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;}
function resultScreenshot(){
 view.draw(battle,1,0);const width=innerWidth,height=innerHeight,scale=Math.min(devicePixelRatio||1,2),canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);context.scale(scale,scale);context.drawImage($('arena'),0,0,width,height);
 context.textAlign='center';context.textBaseline='middle';context.strokeStyle='#fff';context.lineJoin='round';
 function drawText(element){const rect=element.getBoundingClientRect(),style=getComputedStyle(element),text=element.textContent.trim(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;context.fillStyle=style.color;if(element.dataset?.skin||element.dataset?.glyphFinish){const selected=skinById(element.dataset?.skin);const colors=selected?.colors||(selected?[selected.color,selected.color]:element.dataset.glyphFinish==='rainbow'?['#dc4350','#e99b20','#4a9c57','#358bd1','#8b5ccb']:['#b77916','#ffd364','#d99a27']);const gradient=context.createLinearGradient(rect.x,0,rect.x+rect.width,0);colors.forEach((color,index)=>gradient.addColorStop(index/(colors.length-1),color));context.fillStyle=gradient;}context.font=elementFont(element);context.lineWidth=Math.max(2,Math.min(4,parseFloat(style.fontSize)*.08));context.strokeText(text,x,y);context.fillText(text,x,y);}
 drawText($('result-title'));
 const opponentMessage=$('result-opponent');if(!$('result-opponent-row').hidden&&!opponentMessage.hidden)drawText(opponentMessage);
 for(const id of ['result-stage','result-best'])if(!$(id).hidden)drawText($(id));
 return canvas;
}
const PRODUCTION_URL='https://tsukuruum.pages.dev/games/moji-blade/';
function resultFilename(){if(mode==='scout')return scout.filename;return `moji-blade-${challengeStageId}-${battle.tops[0].glyph.char}-${streak}wins.png`;}
function screenshotDataUrl(){return resultScreenshot().toDataURL('image/png');}
function dataUrlBlob(url){const [header,data]=url.split(','),bytes=atob(data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type:header.match(/data:([^;]+)/)?.[1]||'image/png'});}
function downloadResultImage(imageUrl=screenshotDataUrl()){const objectUrl=URL.createObjectURL(dataUrlBlob(imageUrl)),link=document.createElement('a');link.href=objectUrl;link.download=resultFilename();document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),10000);}
function updateChallengeRecord(){
 const glyph=battle.tops[0].glyph;
 if(!rememberChallengeBest(challengeRecords,challengeStageId,{wins:streak,glyph:glyph.char,font:fontId}))$('storage-note').hidden=false;
 $('result-stage').textContent=`ステージ：${getStage(challengeStageId).name}`;$('result-stage').hidden=false;
 $('result-best').textContent=`自己ベスト ${challengeRecords[challengeStageId]?.wins||0}連勝`;$('result-best').hidden=false;
}
let resultFeedbackTimer;
function showResultActionFeedback(button,message){
 const feedback=$('app-result-feedback'),actions=$('result-actions');clearTimeout(resultFeedbackTimer);feedback.textContent=message;
 feedback.style.left=(button.offsetLeft+button.offsetWidth/2)+'px';feedback.style.bottom=(actions.clientHeight-button.offsetTop+6)+'px';
 feedback.classList.remove('is-visible');void feedback.offsetWidth;feedback.classList.add('is-visible');
 resultFeedbackTimer=setTimeout(()=>{feedback.classList.remove('is-visible');feedback.textContent='';},1600);
}
const resultSharing=createResultSharing();
window.mojiBladeApp.readImageChunk=resultSharing.readImageChunk;
window.mojiBladeApp.completeShare=result=>resultSharing.complete(result.id,result.status,result.code);
const resultActions=createResultActions({sharing:resultSharing,analytics:appAnalytics,capture:screenshotDataUrl,filename:resultFilename,
 context:()=>({token:phase==='result'?battle:null,button:action=>$(action==='save_image'?'save-result':'share-result'),intent:()=>{
  if(mode==='scout')return scout.intent(window.mojiBladeApp?.platform==='ios'?'https://tsukuruum.pages.dev/games/moji-blade/':PRODUCTION_URL);
  const char=battle?.tops[0]?.glyph.char||firstCharacter(ui.character.value),text=translate(`文字ブレード「${char}」で${streak}連勝！（${getStage(challengeStageId).name}ステージ）`)+ ' #文字ブレード';
  return 'https://x.com/intent/post?'+new URLSearchParams({text,url:window.mojiBladeApp?.platform==='ios'?'https://tsukuruum.pages.dev/games/moji-blade/':PRODUCTION_URL});
 }}),feedback:showResultActionFeedback});
function saveChallengeImage(){return resultActions.save();}
function shareChallengeResult(){return resultActions.share();}
function resetOpponentResultMessage(){
 $('result-opponent').hidden=true;$('result-opponent-row').hidden=true;
 clearTimeout(opponentCopyTimer);$('opponent-copy-feedback').textContent='';$('opponent-copy-feedback').classList.remove('is-visible');
}
function showOpponentResultMessage(glyph,won=false){
 $('result-opponent').textContent=won===null?`${glyph}と引き分け`:`${glyph} に${won?'勝った':'負けた'}`;$('result-opponent').dataset.glyph=glyph;$('result-opponent').hidden=false;$('result-opponent-row').hidden=false;$('result-opponent-row').dataset.outcome=won===null?'draw':won?'win':'loss';
}
function showOpponentCopyFeedback(message){
 const feedback=$('opponent-copy-feedback');clearTimeout(opponentCopyTimer);feedback.textContent=message;
 feedback.classList.remove('is-visible');void feedback.offsetWidth;feedback.classList.add('is-visible');
 opponentCopyTimer=setTimeout(()=>{feedback.classList.remove('is-visible');feedback.textContent='';},1600);
}
async function copyOpponentResultMessage(){
 if($('result-opponent-row').hidden)return;
 const value=$('result-opponent').dataset.glyph;
 try{
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
  await navigator.clipboard.writeText(value);
 }catch{
  const field=document.createElement('textarea'),previousFocus=document.activeElement;field.value=value;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();
  let copied=false;try{copied=document.execCommand('copy');}catch{}field.remove();previousFocus?.focus?.({preventScroll:true});
  if(!copied){showOpponentCopyFeedback('コピーできませんでした');return;}
 }
 if(!$('result-opponent-row').hidden&&$('result-opponent').dataset.glyph===value)showOpponentCopyFeedback('コピーしました');
}
function end(){
 if(mode==='scout'){scout.outcome();return;}
 if(['ranked','room'].includes(mode)&&ranked?.practice){startRankedPractice();return;}
 showPhase('result');const winner=battle.result.winner,win=winner===0,title=$('result-title');applyGlyphFinish(title,null,'',false);resetOpponentResultMessage();resetResultRating();$('result-stage').hidden=true;$('result-best').hidden=true;
 if(mode==='ranked'){
  const local=ranked.players[ranked.localIndex],opponent=ranked.players[1-ranked.localIndex],outcome=outcomeForWinner(winner,ranked.localIndex),winnerPlayer=winner===null?null:ranked.players[winner];
  showOpponentResultMessage(opponent.glyph,outcome==='draw'?null:outcome==='win');
 title.textContent=winnerPlayer?`${winnerPlayer.glyph} WIN!`:'DRAW!';title.style.color=outcome==='win'?'#2869dc':outcome==='loss'?'#cc4735':'#405269';title.style.setProperty('--winner-font',winner===null?'system-ui':winner===ranked.localIndex?'var(--glyph-font)':'var(--com-glyph-font)');
  $('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('save-result').hidden=true;$('share-result').hidden=true;
  if(ranked.serverResult)showRankedRating(ranked.serverResult);
  else if(ranked.resultUnavailable)resetResultRating('結果を保存できませんでした。文字選びに戻ってください。');
  else{showLocalRankedRating(ranked,outcome);reportRankedResult(outcome).catch(()=>{});}
  syncRankedResultActions();sound.result(outcome==='win');title.focus({preventScroll:true});return;
 }
 if(mode==='room'){
  const outcome=outcomeForWinner(winner,ranked.localIndex),winnerPlayer=winner===null?null:ranked.players[winner];
  showOpponentResultMessage(ranked.players[1-ranked.localIndex].glyph,outcome==='draw'?null:outcome==='win');
  title.textContent=winnerPlayer?`${winnerPlayer.glyph} WIN!`:'DRAW!';title.style.color=outcome==='win'?'#2869dc':outcome==='loss'?'#cc4735':'#405269';title.style.setProperty('--winner-font',winner===null?'system-ui':winner===ranked.localIndex?'var(--glyph-font)':'var(--com-glyph-font)');
  $('result-ranking-status').textContent='レート変動なし';$('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('replay').disabled=false;$('edit-character').disabled=false;$('replay').textContent='再戦';$('save-result').hidden=true;$('share-result').hidden=true;sound.result(outcome==='win');title.focus({preventScroll:true});return;
 }
 if(mode==='local'){
  if(winner===null)showOpponentResultMessage(battle.tops[1].glyph.char,null);
  title.textContent=winner===null?'DRAW!':`${battle.tops[winner].glyph.char} WIN!`;title.style.color=win?'#2869dc':winner===1?'#cc4735':'#405269';title.style.setProperty('--winner-font',winner===null?'system-ui':win?'var(--glyph-font)':'var(--com-glyph-font)');
  $('result-ranking-status').textContent=winner===null?'引き分け':`${winner+1}P の勝ち`;$('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('replay').disabled=false;$('edit-character').disabled=false;$('replay').textContent='再戦';$('save-result').hidden=true;$('share-result').hidden=true;sound.result(win);title.focus({preventScroll:true});return;
 }
 if(mode==='challenge'){
  if(win)streak++;
  updateChallengeRecord();
  if(win){title.textContent=`${battle.tops[0].glyph.char} ${streak}連勝!`;title.style.color='#2869dc';title.style.setProperty('--winner-font','var(--glyph-font)');showOpponentResultMessage(battle.tops[1].glyph.char,true);$('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=false;$('replay').hidden=true;$('save-result').hidden=true;$('share-result').hidden=true;sound.result(true);title.focus({preventScroll:true});
   $('next-battle').textContent='次のバトル';
   if(rankingSession){$('next-battle').disabled=true;$('result-ranking-status').textContent='勝利を記録中…';syncChallengeWin().then(data=>{$('result-ranking-status').textContent=`${data.wins}連勝を記録しました。`;$('next-battle').disabled=false;}).catch(error=>{$('result-ranking-status').textContent=`記録できませんでした: ${error.message}`;$('next-battle').textContent='記録を再試行';$('next-battle').disabled=false;});}
   else{$('next-battle').disabled=false;$('result-ranking-status').textContent=BUDGET_PAUSED?'':settings.rankingEnabled?'ランキング未参加':'ランキング登録 OFF';}return;}
  title.textContent=`${battle.tops[0].glyph.char} ${streak}連勝`;title.style.color='#cc4735';title.style.setProperty('--winner-font','var(--glyph-font)');showOpponentResultMessage(battle.tops[1].glyph.char,winner===null?null:false);$('result-actions').hidden=false;$('result-actions').classList.add('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('replay').disabled=Boolean(rankingSession);$('save-result').hidden=false;$('share-result').hidden=false;$('replay').textContent='再挑戦';$('result-ranking-status').textContent=rankingSession?'ランキングへ登録中…':BUDGET_PAUSED?'':settings.rankingEnabled?'ランキング未参加':'ランキング登録 OFF';sound.result(false);title.focus({preventScroll:true});
  if(rankingSession)syncChallengeResult('loss').then(data=>{$('result-ranking-status').textContent=data.self?`自己ベスト ${data.self.wins}連勝${data.self.rank?`・${data.self.rank}位`:''}`:'1勝するとランキングに登録されます。';$('replay').disabled=false;}).catch(error=>{$('result-ranking-status').textContent=`記録できませんでした: ${error.message}`;$('replay').disabled=false;});return;
 }
 if(winner===null)showOpponentResultMessage(battle.tops[1].glyph.char,null);
 $('result-ranking-status').textContent='';
 $('result-actions').hidden=false;$('result-actions').classList.remove('challenge-ended');$('next-battle').hidden=true;$('replay').hidden=false;$('save-result').hidden=true;$('share-result').hidden=true;$('replay').textContent='再戦';
 title.textContent=winner===null?'DRAW!':`${battle.tops[winner].glyph.char} WIN!`;
 title.style.color=win?'#2869dc':winner===1?'#cc4735':'#405269';
 title.style.setProperty('--winner-font',winner===null?'system-ui':winner===1?'var(--com-glyph-font)':'var(--glyph-font)');
 sound.result(win);title.focus({preventScroll:true});
}
async function backToSetup(){if(mode==='scout'&&!scout.leaving){if(scout.run.phase==='ended')return scout.leave();scout.openMenu();return;}if(busy&&!ranked?.expired&&!['ranked','room'].includes(mode))return;if(ranked?.expired||['ranked','room'].includes(mode))busy=false;await finalizeChallenge();if(['ranked','room'].includes(mode))await leaveRanked();drag=null;localDrags.clear();mode='standard';document.body.dataset.mode='';document.body.style.setProperty('--glyph-font',`${FONTS[fontId].family},${FONTS[fontId].fallback}`);$('copy-opponent-result').hidden=false;$('result-opponent').style.removeProperty('font-family');streak=0;rankingSession=null;rankingSetupMessage='';challengeFontBag=[];useComFont(standardComFontId);battle?.dispose();battle=null;showPhase('setup');refreshInput();window.scrollTo({top:0,behavior:'instant'});document.activeElement?.blur();}
async function startMatch(nextMode){if(busy||rankingBusy)return;sound.unlock();selectedPlayer=choosePlayer();mode=nextMode;streak=0;rankingSession=null;rankingSetupMessage='';if(nextMode==='challenge'){halloweenChallengeId=encyclopediaMatchId();challengeStageId=selectedStageId;challengeStarted=false;challengeFontBag=[];if(settings.rankingEnabled&&!BUDGET_PAUSED){await beginRankingSession();if(!rankingSession){mode='standard';showPhase('setup');refreshInput();return;}}}generate();}
$('challenge-start').addEventListener('click',e=>{e.preventDefault();startMatch('challenge');});
$('local-start').addEventListener('click',e=>{e.preventDefault();startMatch('local');});
$('event-start').addEventListener('click',e=>{e.preventDefault();beginRanked(EVENT_ID);});
$('ranked-start').addEventListener('click',e=>{e.preventDefault();beginRanked();});
$('spin-direction').addEventListener('click',toggleSpinDirection);
$('com-spin-direction').addEventListener('click',toggleComSpinDirection);
const ROOM_CODE_KEY='tsukuruum.moji-blade.room-code';
try{$('room-code').value=(localStorage.getItem(ROOM_CODE_KEY)||'').replace(/\D/g,'').slice(0,6);}catch{}
function saveRoomCode(){try{localStorage.setItem(ROOM_CODE_KEY,$('room-code').value);}catch{}}
$('room-start').addEventListener('click',e=>{e.preventDefault();if(BUDGET_PAUSED)return;$('room-error').textContent='';$('room-dialog').showModal();});
$('room-create').addEventListener('click',()=>beginRoom('create',$('room-code').value));
$('room-join').addEventListener('click',()=>beginRoom('join',$('room-code').value));
$('room-code').addEventListener('input',event=>{event.currentTarget.value=event.currentTarget.value.replace(/\D/g,'').slice(0,6);$('room-error').textContent='';saveRoomCode();});
$('room-code').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();beginRoom('join',event.currentTarget.value);}});
$('room-copy').addEventListener('click',async()=>{const code=$('room-code').value;if(!/^\d{6}$/.test(code)){$('room-error').textContent='コピーする6桁のルーム番号を入力してください。';return;}try{await navigator.clipboard.writeText(code);$('room-error').textContent=`${code} をコピーしました。`;}catch{$('room-code').select();document.execCommand('copy');$('room-error').textContent=`${code} をコピーしました。`;}});
$('close-room').addEventListener('click',()=>$('room-dialog').close());$('room-dialog').addEventListener('click',event=>{if(event.target===$('room-dialog'))$('room-dialog').close();});
$('ranking-opt-in').addEventListener('change',event=>{settings.rankingEnabled=event.currentTarget.checked;rankingSetupMessage='';rankingToggleLabel();save();refreshInput();});
$('prepare').addEventListener('click',e=>{e.preventDefault();startMatch('standard');});
$('setup').addEventListener('submit',e=>{e.preventDefault();startMatch('standard');});
$('bgm').addEventListener('click',()=>{sound.setBgm(!sound.bgmEnabled);bgmLabel();save();});
$('sound').addEventListener('click',()=>{sound.set(!sound.enabled);soundLabel();save();});
document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('button, #encyclopedia-star-filter'):null;if(button&&!button.disabled)queueMicrotask(()=>sound.button());},true);
for(const input of [ui.character,ui.opponent]){input.addEventListener('scroll',()=>highlightInput(input));input.addEventListener('input',e=>{highlightInput(input);if(!e.isComposing){refreshInput();save();}});input.addEventListener('compositionend',()=>{refreshInput();save();});}
ui.name.addEventListener('input',()=>{refreshInput();save();});ui.name.addEventListener('blur',()=>{const state=cleanedName();ui.name.value=state.empty?'':state.valid?state.storedName:[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(state.storedName)].slice(0,8).map(part=>part.segment).join('');refreshInput();save();});
document.querySelectorAll('[data-font]').forEach(button=>button.addEventListener('click',()=>{if(busy||button.dataset.font===fontId)return;fontId=button.dataset.font;updateChoices();boot();}));
document.querySelectorAll('[data-com-font]').forEach(button=>button.addEventListener('click',()=>{if(busy||button.dataset.comFont===standardComFontId)return;standardComFontId=button.dataset.comFont;comFontId=standardComFontId;updateChoices();boot();}));
document.querySelectorAll('[data-difficulty]').forEach(button=>button.addEventListener('click',()=>{difficulty=button.dataset.difficulty;updateChoices();save();}));
$('shuffle-player').addEventListener('click',()=>{ui.character.value=randomCharacter(regulation,library.randomPools);refreshInput();save();});
$('shuffle').addEventListener('click',()=>{ui.opponent.value=randomCharacter(regulation,comLibrary.randomPools);refreshInput();save();});
$('edit-character').addEventListener('click',backToSetup);
$('com-back').addEventListener('click',backToSetup);
$('next-battle').addEventListener('click',nextChallengeBattle);
$('replay').addEventListener('click',async()=>{if(mode==='scout'){scout.entry();return;}if(mode==='challenge')startMatch('challenge');else if(mode==='ranked')await nextRankedBattle();else if(mode==='room'){await rematchRoom();}else generate(true);});
$('ranked-cancel').addEventListener('click',backToSetup);
$('ranked-retry').addEventListener('click',retryRanked);
$('open-ranking').addEventListener('click',openRankings);$('close-ranking').addEventListener('click',()=>$('ranking-dialog').close());$('ranking-dialog').addEventListener('click',event=>{if(event.target===$('ranking-dialog'))$('ranking-dialog').close();});
$('ranking-dialog').addEventListener('close',()=>{clearTimeout(rankingRetryTimer);rankingRetryTimer=0;rankingRequestRevision++;});
$('event-ranking-tab').addEventListener('click',()=>loadRankings('event'));
$('streak-ranking-tab').addEventListener('click',()=>loadRankings('streak'));$('rating-ranking-tab').addEventListener('click',()=>loadRankings('rating'));
$('ranking-period').addEventListener('change',event=>loadRankings(rankingView,event.target.value));
document.querySelectorAll('.site-header a').forEach(link=>link.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(mode==='challenge'&&rankingSession){event.preventDefault();const href=link.href;finalizeChallenge().finally(()=>location.assign(href));}else if(['ranked','room'].includes(mode)&&ranked){event.preventDefault();const href=link.href;leaveRanked().finally(()=>location.assign(href));}}));
window.addEventListener('pagehide',()=>{
 if(BUDGET_PAUSED)return;
 if(mode==='challenge'&&rankingSession&&!rankingPending&&streak>0){const payload={...rankingSession,wins:streak};queueChallengeResult(payload);fetch('/api/moji-blade/challenge/finish',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify(payload)}).then(response=>{if(response.ok||response.status===409)clearQueuedChallengeResult();}).catch(()=>{});}
 // Keep an unfinished ranked ticket on reload. Explicit Back/Cancel sends leave;
 // a genuinely closed tab is settled by the server deadline.
 if(mode==='ranked'&&ranked?.pendingResult&&!ranked.completed)fetch('/api/moji-blade/ranked/result',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify(ranked.pendingResult)}).catch(()=>{});
});
$('save-result').addEventListener('click',saveChallengeImage);
$('share-result').addEventListener('click',shareChallengeResult);
$('copy-opponent-result').addEventListener('click',copyOpponentResultMessage);
let canvas=$('arena');
function pullState(e,point){return makePullState(e,point);}
function updatePullState(state,e){return updatePullGesture(state,e,PULL_CANCEL_RADIUS);}
function updatePullCancelZones(){
 const active=phase==='ready'&&!scout.paused&&!renderRecovery.blocked;
 const gestures=active?(mode==='local'?[...localDrags.values()]:drag?[{...drag,index:0}]:[]):[];
 for(let index=0;index<2;index++){
  const gesture=gestures.find(item=>item.index===index);let zone=pullCancelZones[index];
  if(!gesture){if(zone)zone.hidden=true;continue;}
  if(!zone){zone=document.createElement('div');zone.className='pull-cancel-zone';zone.dataset.player=String(index);zone.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=translate('キャンセル');zone.append(label);$('viewport').append(zone);pullCancelZones[index]=zone;}
  const rect=$('viewport').getBoundingClientRect(),group=view?.groups?.[index];let point=gesture.startClient;
  if(group&&view.camera){const projected=group.position.clone().project(view.camera),arena=canvas.getBoundingClientRect();point={x:arena.left+(projected.x+1)*arena.width/2,y:arena.top+(1-projected.y)*arena.height/2};}
  zone.hidden=!gesture.hasPulled||gesture.moved;
  zone.style.left=`${point.x-rect.left}px`;zone.style.top=`${point.y-rect.top}px`;
  zone.firstElementChild.textContent=translate('キャンセル');zone.firstElementChild.hidden=zone.hidden;
 }
}
function arenaPointerDown(e){
 if(busy||scout.paused||renderRecovery.blocked||$('stage-dialog').open||phase!=='ready'||e.pointerType==='mouse'&&e.button!==0)return;
 const p=view.pointFromPointer(e);if(!p)return;
 if(mode==='local'){
  const distances=[Math.hypot(p.x,p.z-CONFIG.spawnRadius),Math.hypot(p.x,p.z+CONFIG.spawnRadius)],index=distances[0]<=distances[1]?0:1;
  if(distances[index]>1.7||localActions[index]||[...localDrags.values()].some(item=>item.index===index))return;
  e.preventDefault();sound.unlock();canvas.setPointerCapture(e.pointerId);localDrags.set(e.pointerId,{...pullState(e,p),index});localAim[index].visible=false;updateAim();return;
 }
 if(!e.isPrimary||Math.hypot(p.x,p.z-CONFIG.spawnRadius)>1.7)return;
 e.preventDefault();sound.unlock();canvas.setPointerCapture(e.pointerId);drag={...pullState(e,p),id:e.pointerId};aimVisible=false;updateAim();
}
function moveDrag(e,playSound=true){
 if(scout.paused||renderRecovery.blocked||$('stage-dialog').open)return;
 const localDrag=localDrags.get(e.pointerId);
 if(localDrag){
  if(phase!=='ready')return;const p=view.pointFromPointer(e);if(!p)return;
  const x=localDrag.start.x-p.x,z=localDrag.start.z-p.z,d=Math.hypot(x,z);if(!updatePullState(localDrag,e)){sound.stopRope(e.pointerId);localDrag.lastPoint=p;localAim[localDrag.index]={angle:0,power:.8,visible:false};updateAim();return;}
  if(playSound&&Math.hypot(p.x-localDrag.lastPoint.x,p.z-localDrag.lastPoint.z)>.015){sound.rope(e.pointerId,d/2.8,localDrag.index===0?-.4:.4);localDrag.lastPoint=p;}
  localAim[localDrag.index]={angle:localDrag.index===0?launchAngleFromPull(x,z):Math.atan2(x,z),power:Math.max(.15,Math.min(1,d/2.8)),visible:true};updateAim();return;
 }
 if(!drag||e.pointerId!==drag.id||phase!=='ready')return;
 const p=view.pointFromPointer(e);if(!p)return;
 const x=drag.start.x-p.x,z=drag.start.z-p.z,d=Math.hypot(x,z);if(!updatePullState(drag,e)){sound.stopRope(e.pointerId);drag.lastPoint=p;angle=0;power=.8;aimVisible=false;updateAim();return;}
 if(playSound&&Math.hypot(p.x-drag.lastPoint.x,p.z-drag.lastPoint.z)>.015){sound.rope(e.pointerId,d/2.8);drag.lastPoint=p;}
 aimVisible=true;angle=launchAngleFromPull(x,z);power=Math.max(.15,Math.min(1,d/2.8));updateAim();
}
function releaseDrag(e){
 if(scout.paused||renderRecovery.blocked||$('stage-dialog').open)return;
 const localDrag=localDrags.get(e.pointerId);
 if(localDrag){
  moveDrag(e,false);sound.stopRope(e.pointerId);localDrags.delete(e.pointerId);
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(e.cancelable)e.preventDefault();
  if(localDrag.moved)lockLocalAction(localDrag.index);else{localAim[localDrag.index]={angle:0,power:.8,visible:false};updateAim();}
  return;
 }
 if(!drag||e.pointerId!==drag.id)return;
 moveDrag(e,false);sound.stopRope(e.pointerId);const shouldFire=drag.moved;drag=null;if(!shouldFire){angle=0;power=.8;aimVisible=false;}updateAim();
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 if(e.cancelable)e.preventDefault();if(shouldFire)fire();
}
// Capture on the canvas normally retains the pointer; window listeners also
// cover releases over the header or after the browser loses pointer capture.
window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.buttons===0&&(drag?.id===e.pointerId||localDrags.has(e.pointerId)))releaseDrag(e);else moveDrag(e);},true);
window.addEventListener('pointerup',releaseDrag,true);
window.addEventListener('pointercancel',e=>{sound.stopRope(e.pointerId);const localDrag=localDrags.get(e.pointerId);if(localDrag){localDrags.delete(e.pointerId);localAim[localDrag.index]={angle:0,power:.8,visible:false};updateAim();}if(drag?.id===e.pointerId){drag=null;angle=0;power=.8;aimVisible=false;updateAim();}},true);
function arenaKeyDown(e){if(busy||scout.paused||renderRecovery.blocked||$('stage-dialog').open||phase!=='ready'||mode==='local')return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))e.preventDefault();else return;if(e.key==='ArrowLeft'){angle-=.08;aimVisible=true;}if(e.key==='ArrowRight'){angle+=.08;aimVisible=true;}if(e.key==='ArrowUp'){power=Math.min(1,power+.05);aimVisible=true;}if(e.key==='ArrowDown'){power=Math.max(.15,power-.05);aimVisible=true;}if(e.key==='Enter'||e.key===' ')fire();updateAim();}
function bindArenaCanvas(next){
 canvas.removeEventListener('pointerdown',arenaPointerDown);canvas.removeEventListener('keydown',arenaKeyDown);canvas.removeEventListener('webglcontextlost',arenaContextLost);
 canvas=next;canvas.addEventListener('pointerdown',arenaPointerDown);canvas.addEventListener('keydown',arenaKeyDown);canvas.addEventListener('webglcontextlost',arenaContextLost);
}
function arenaContextLost(e){e.preventDefault();renderRecovery.interrupt(e.currentTarget);}
bindArenaCanvas(canvas);
document.addEventListener('visibilitychange',()=>{last=null;if(!gameSession.assert())return;drag=null;sound.stopRopes();aimVisible=false;for(const item of localDrags.values())localAim[item.index].visible=false;localDrags.clear();updateAim();$('paused').hidden=!document.hidden;if(document.hidden)sound.pause();else if(!renderRecovery.blocked&&!scout.paused)sound.resume();syncSelectionRoulette();if(isNetworkMatch()&&ranked&&(ranked.ticketId||ranked.roomCode)&&!ranked.completed&&!ranked.polling&&!['battle','finishing','result','ranked-intro'].includes(phase))scheduleRankedPoll(document.hidden?5000:0);});
function updateSpinGauges(localIndex){
 battle.tops.forEach((top,i)=>{const ratio=top.initialOmega>0?battle.state(top).spin/top.initialOmega:0;$(i===localIndex?'player-spin':'com-spin').value=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;});
}
function frame(now){requestAnimationFrame(frame);if(!gameSession.active){last=null;return;}if(halloweenBoss?.active){last=null;return;}if(scout.paused){last=null;if(!document.hidden&&!renderRecovery.blocked&&battle&&view)view.draw(battle,1,0);return;}if(document.hidden||window.mojiBladeApp?.paused){last=null;return;}if(renderRecovery.blocked){last=null;return;}const dt=last===null?0:Math.min(.1,(now-last)/1000);last=now;updateRankedCountdown();

 let alpha=1;if(phase==='battle'&&battle){alpha=battle.advance(dt);const localIndex=activeBattleLocalIndex();for(const event of battle.boostEvents?.splice(0)||[]){view.boost(event);sound.boost((localIndex?-1:1)*event.position.x/CONFIG.arenaRadius);}for(const event of battle.ropeEvents?.splice(0)||[]){view.ropeHit(event);sound.ropeHit(event.index,(localIndex?-1:1)*event.position.x/CONFIG.arenaRadius);}for(const event of battle.ropeUpdates?.values()||[])view.ropeHit(event);battle.ropeUpdates?.clear();for(const event of battle.events.splice(0)){view.hit(event);sound.hit(event.strength,(localIndex?-1:1)*event.position.x/CONFIG.arenaRadius,event.critical);appHaptics.impact(event.strength);}updateSpinGauges(localIndex);$('clock').textContent=battle.time.toFixed(1).padStart(4,'0');if(battle.result){alpha=1;finishBattle();}}
 if(phase==='finishing'||phase==='result'||mode==='scout'&&phase==='scout-recruit'){
  if(mode==='scout'&&phase==='scout-recruit'&&!battle.result)battle.aftermathTime=(battle.aftermathTime||0)+dt;else battle.advanceAftermath(dt);alpha=1;
  const localIndex=activeBattleLocalIndex();for(const event of battle.ropeEvents?.splice(0)||[]){view.ropeHit(event);sound.ropeHit(event.index,(localIndex?-1:1)*event.position.x/CONFIG.arenaRadius);}for(const event of battle.ropeUpdates?.values()||[])view.ropeHit(event);battle.ropeUpdates?.clear();
  $('clock').textContent=(battle.time+battle.aftermathTime).toFixed(1).padStart(4,'0');
  if(phase==='finishing'){finishElapsed+=dt;const delay=battle.result.reason==='場外'?CONFIG.ringOutResultDelay:CONFIG.resultDelay;if(finishElapsed>=delay)end();}
 }
 if(battle&&['battle','finishing','scout-recruit'].includes(phase)){const speeds=battle.tops.map(top=>top.body.isEnabled()?battle.state(top).spin:0);sound.updateSpin(Math.max(...speeds));}else sound.updateSpin(0);
 if(view&&!document.querySelector('.arena-section').hidden)view.draw(battle,alpha,dt,phase==='ready');
}
async function boot(){
 const fontIds=Object.keys(FONTS),allFontsReady=fontIds.every(id=>fontLibraries.has(id));
 if(allFontsReady){library=fontLibraries.get(fontId);comLibrary=fontLibraries.get(comFontId);document.body.style.setProperty('--glyph-font',`${FONTS[fontId].family},${FONTS[fontId].fallback}`);document.body.style.setProperty('--com-glyph-font',`${FONTS[comFontId].family},${FONTS[comFontId].fallback}`);save();refreshInput();recoverRanked();return;}
 if(busy)return;busy=true;clearTimeout(metricTimer);library=null;comLibrary=null;$('prepare').disabled=true;$('challenge-start').disabled=true;$('setup-fields').disabled=true;$('loading').hidden=false;$('loading').querySelector('p').textContent='フォントを読み込み中…';$('retry-load').hidden=true;
 try{const loaded=await Promise.all([...fontIds.map(id=>GlyphLibrary.load(id)),initPhysics(),renderRecovery.initializeDevice()]);fontIds.forEach((id,index)=>fontLibraries.set(id,loaded[index]));library=fontLibraries.get(fontId);comLibrary=fontLibraries.get(comFontId);document.body.style.setProperty('--glyph-font',`${FONTS[fontId].family},${FONTS[fontId].fallback}`);document.body.style.setProperty('--com-glyph-font',`${FONTS[comFontId].family},${FONTS[comFontId].fallback}`);save();$('setup-fields').disabled=false;showPhase('setup');$('loading').hidden=true;recoverRanked();}
 catch(error){console.error(error);$('loading').querySelector('p').textContent='文字データを読み込めませんでした。再試行してください。';$('retry-load').hidden=false;}
 finally{busy=false;refreshInput();}
}
const renderRecovery=new RenderRecovery({
 rebuild:quality=>view.rebuildRenderer(quality,bindArenaCanvas),
 isLost:()=>!view?.renderer||view.renderer.getContext().isContextLost(),
 pause:()=>{
  last=null;document.documentElement.dataset.renderRecovering='true';sound.stopRopes();sound.pause();stageSelection.close(false);updateSpinDirectionButton();
  for(const id of [drag?.id,...localDrags.keys()])if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  drag=null;localDrags.clear();aimVisible=false;for(const aim of localAim)aim.visible=false;updateAim();
  $('loading').hidden=false;$('retry-load').hidden=true;
 },
 progress:quality=>{$('loading').querySelector('p').textContent=quality.shadows?'3D表示を調整して再開しています…':'軽量表示に切り替えて再開しています…';},
 resume:()=>{
  last=null;document.documentElement.dataset.renderRecovering='false';$('loading').hidden=phase!=='generating';updateSpinDirectionButton();
  if(!document.hidden&&!window.mojiBladeApp?.paused&&!scout.paused){sound.resume();if(!document.querySelector('.arena-section').hidden)canvas.focus({preventScroll:true});}
 },
 failure:()=>{
  document.documentElement.dataset.renderRecovering='false';document.documentElement.dataset.renderFailed='true';$('loading').querySelector('p').textContent='3D表示を再開できませんでした。ページを再読み込みしてください。';
  $('retry-load').textContent='再読み込み';$('retry-load').hidden=false;
 }
});
function recordEncyclopediaPhase(next){
 if(!['standard','challenge','local'].includes(mode)){if(encyclopediaTrial)encyclopediaStore.abandon(encyclopediaTrial);encyclopediaTrial=null;encyclopediaTrialMode=null;return;}
 if(next==='ready'&&battle){
  if(!encyclopediaTrial||encyclopediaTrialMode!==mode||!Object.hasOwn(encyclopediaStore.pending,encyclopediaTrial)||encyclopediaStore.pending[encyclopediaTrial]?.started){
   if(encyclopediaTrial)encyclopediaStore.abandon(encyclopediaTrial);
   encyclopediaTrial=encyclopediaMatchId();encyclopediaTrialMode=mode;
  }
  encyclopediaStore.prepare({id:encyclopediaTrial,mode,player:{glyph:battle.tops[0].glyph.char,font:fontId},enemy:{glyph:battle.tops[1].glyph.char,font:comFontId}});
 }
 if(next==='battle'&&encyclopediaTrial){encyclopediaStore.start(encyclopediaTrial);halloweenProgress.start({id:encyclopediaTrial,mode,glyph:battle.tops[0].glyph.char,run:mode==='challenge'?halloweenChallengeId||'':''});}
 if(next==='finishing'&&encyclopediaTrial&&battle?.result){encyclopediaStore.settle({id:encyclopediaTrial,winner:battle.result.winner});halloweenProgress.settle({id:encyclopediaTrial,winner:battle.result.winner});}
}
encyclopediaUI=createEncyclopedia({availability:encyclopediaSupport,rewards:encyclopediaRewards,skins,store:encyclopediaStore,libraries:()=>fontLibraries,onSkinReceived:()=>sound.scout('recruit'),ready:()=>phase==='setup'&&!busy&&Boolean(library&&comLibrary),onClose:updateSelectionPreviews});
if(encyclopediaError)encyclopediaUI?.saveError(encyclopediaError);
skins.subscribe(()=>{updateSelectionPreviews();});
const scout=createScoutController({
 rewards:skins,collection:encyclopediaStore,
 missionStart:trial=>halloweenProgress.start({...trial,mode:'scout'}),missionResult:result=>halloweenProgress.settle(result),

 libs:()=>fontLibraries,ready:()=>!busy&&Boolean(library&&comLibrary),stage:()=>selectedStageId,active:()=>mode==='scout',phase:()=>phase,
 enter:()=>{mode='scout';document.body.dataset.mode='scout';spinDirection=1;comSpinDirection=1;cancelStageDrags();},
 showPhase,restage:stage=>{const previous=battle,next=new Battle(previous.tops.map(top=>top.glyph),{...previous.comLaunch},{stageId:stage});view.setBattle(next);battle=next;previous.dispose();cancelStageDrags();angle=0;power=.8;aimVisible=false;last=null;updateAim();},hidePlayer:hidden=>{if(view?.groups[0])view.groups[0].visible=!hidden;},cancelInput:cancelStageDrags,
 pause:paused=>{last=null;if(mode==='scout')window.dispatchEvent(new CustomEvent('moji-scout-analytics',{detail:{action:'pause',data:paused}}));if(paused){if(view)view.shake=0;sound.reset();sound.pause();}else if(!document.hidden&&!window.mojiBladeApp?.paused&&!renderRecovery.blocked)sound.resume();},
 cue:name=>sound.scout(name),result:win=>{sound.reset();sound.result(win);},stop:()=>{if(battle)battle.running=false;cancelStageDrags();},exit:backToSetup,
 analytics:(action,data)=>window.dispatchEvent(new CustomEvent('moji-scout-analytics',{detail:{action,data}})),
 depart:async indices=>{if(!view||!battle)return;cancelStageDrags();sound.reset();showPhase('scout-departing');await view.animateTops(indices,'exit');},
 prepare:async(member,enemy,stage,appearance={player:true,enemy:true},partyBonus=0)=>{
  showPhase('scout-arriving');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const glyphs=[scoutGlyph(fontLibraries.get(member.font).get(member.glyph,regulation),member,partyBonus),scoutGlyph(fontLibraries.get(enemy.font).get(enemy.glyph,regulation),enemy)];
  view ||= new ArenaView($('arena'),renderRecovery.quality,{goldFor:collectionGoldFor,rainbowFor:collectionRainbowFor,skinFor:collectionSkinFor});
  const next=new Battle(glyphs,{...enemy.launch},{stageId:stage});view.clearEffects();battle?.dispose();battle=next;view.setBattle(battle);
  document.body.style.setProperty('--glyph-font',`${FONTS[member.font].family},${FONTS[member.font].fallback}`);
  document.body.style.setProperty('--com-glyph-font',`${FONTS[enemy.font].family},${FONTS[enemy.font].fallback}`);
  $('player-label').textContent='あなた';$('opponent-label').textContent='CPU';$('player-char').textContent=member.glyph;$('com-char').textContent=enemy.glyph;
  $('clock').textContent='00.0';$('player-spin').value=1;$('com-spin').value=1;angle=0;power=.8;aimVisible=false;last=null;cancelStageDrags();
  view.groups[0].visible=appearance.player;if(appearance.player||appearance.enemy)sound.scout('appear');const motion=view.animateTops([...(appearance.player?[0]:[]),...(appearance.enemy?[1]:[])]);view.draw(battle,1,0);await motion;
 }
});
const stageSelection=createStageSelection({button:$('stage-select'),dialog:$('stage-dialog'),selectedStage:selectedStageId,onApply:changeStage,onOpen:cancelStageDrags,bestWins:(id,selectedMode)=>selectedMode==='scout'?readScoutBestsForMenu((()=>{try{return localStorage;}catch{return null;}})())[id]||0:challengeRecords[id]?.wins||0});
window.addEventListener('pagehide',save);
window.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
window.addEventListener('moji-app-lifecycle',event=>{if(event.detail.paused)save();last=null;drag=null;localDrags.clear();sound.stopRopes();if(event.detail.paused)sound.pause();else if(!renderRecovery.blocked&&!scout.paused)sound.resume();$('paused').hidden=!event.detail.paused;});
window.addEventListener('moji-app-back',()=>{if($('stage-dialog').open){stageSelection.close();return;}if(!['loading','setup','generating'].includes(phase))backToSetup();});
$('retry-load').addEventListener('click',()=>renderRecovery.failed?location.reload():boot());
retryQueuedChallengeResult();boot();loadCurrentRating();requestAnimationFrame(frame);


