import {trackFeature} from './feature-telemetry.js';
import {createBossCutin} from './halloween-boss-cutin.js';
import {applyGlyphFinish} from './encyclopedia-rewards.js';
import {CONFIG} from './config.js';
import {translate as t} from './i18n.js?v=1.2.5';
import {initPhysics,launchAngleFromPull} from './physics.js';
import {makePullState,updatePullGesture} from './pull-gesture.js';
import {HalloweenBattle} from './halloween-boss-physics.js';
import {createBossRun,bossEnemyGlyph,bossBoardAim,HALLOWEEN_BATTLES} from './halloween-boss-model.js';
import {ArenaView,disposeTopVisual} from './render.js';
import {disposeRewardEnvironment} from './reward-surface.js';
import {applySkinVariables} from './skin-catalog.js';
import {RENDER_QUALITIES} from './render-recovery.js';
const backArt='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';
const spinArt='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11.5 11.5A17.5 17.5 0 1 1 6.5 24"/><path d="M11.5 4.5v7h7"/></svg><span></span>';
export function createHalloweenBoss({libraries,progress,skins,sound,guard=()=>true,onExit=()=>{},onMissions=()=>{},battleFactory=(glyphs,index)=>new HalloweenBattle(glyphs,index)}){
 const dialog=document.createElement('dialog');dialog.id='halloween-battle';dialog.className='halloween-battle';dialog.setAttribute('aria-labelledby','halloween-battle-title');dialog.dataset.keyboardFocus='false';
 dialog.innerHTML=`<div class="halloween-battle-frame"><canvas tabindex="0"></canvas><div class="round-intro boss-round-intro" role="status" aria-live="polite" data-no-i18n></div><div class="scoreboard boss-hud"><div class="score player"><span class="boss-player-label"></span><strong class="boss-player" data-no-i18n></strong><meter class="boss-player-spin" min="0" max="1" value="1"></meter></div><div class="clock"><h2 id="halloween-battle-title"></h2><ol class="boss-route" data-no-i18n></ol></div><div class="score opponent"><span>CPU</span><strong class="boss-enemies" data-no-i18n></strong><meter class="boss-enemy-spin" min="0" max="1" value="1"></meter></div></div><button type="button" class="com-back boss-menu">${backArt}</button><p class="boss-hint" role="status"></p><div class="boss-controls"><button class="spin-direction boss-spin" type="button" aria-pressed="false">${spinArt}</button></div><section class="boss-message" hidden><div class="result-heading"><h2 tabindex="-1"></h2><p></p></div><div class="result-bottom"><div class="result-actions"><button type="button" class="primary boss-next"></button><button type="button" class="boss-home"></button></div></div></section></div>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),canvas=$('canvas'),title=$('h2'),route=$('.boss-route'),intro=$('.boss-round-intro'),hint=$('.boss-hint'),message=$('.boss-message'),next=$('.boss-next'),home=$('.boss-home');
 let cutin=null;
 let active=false,entering=false,run=null,selection=null,battle=null,view=null,raf=0,last=null,paused=false,loading=false,angle=0,power=.8,spin=1,drag=null,settled=false,finishTime=0,token=0,missionTrial=null,variants=[],hiddenLosses=new Set(),error=false,expired=false;
 $('.boss-menu').setAttribute('aria-label',t('HOMEへ戻る'));
 $('.boss-player-label').textContent=t('あなた');$('.boss-player-spin').setAttribute('aria-label',t('あなたの回転の残り具合'));$('.boss-enemy-spin').setAttribute('aria-label',t('相手の回転の残り具合'));
 function updateRoute(){
  title.textContent=t('ハロウィンボスバトル');
  route.replaceChildren(...['🎃','🕷️','👻','🍬','🌝'].map((char,index)=>{const item=document.createElement('li'),icon=document.createElement('span'),state=run.status==='clear'||index<run.index||run.status==='won'&&index===run.index?'cleared':index===run.index?'current':'unreached';item.className=`boss-route-step is-${state}`;item.setAttribute('aria-label',`${index+1}: ${t(HALLOWEEN_BATTLES[index].name)}`);if(state==='current')item.setAttribute('aria-current','step');icon.className='boss-route-icon';icon.textContent=char;icon.setAttribute('aria-hidden','true');item.append(icon);if(state==='cleared'){const check=document.createElementNS('http://www.w3.org/2000/svg','svg');check.setAttribute('class','boss-route-check');check.setAttribute('viewBox','0 0 20 20');check.setAttribute('aria-hidden','true');check.innerHTML='<path d="m3 10 4 4 10-10" fill="none" stroke="#201327" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="m3 10 4 4 10-10" fill="none" stroke="#60dc69" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';item.append(check);}return item;}));
 }
 function updateSpin(){const button=$('.boss-spin');button.classList.toggle('is-clockwise',spin===-1);button.setAttribute('aria-pressed',String(spin===-1));button.setAttribute('aria-label',t(spin===1?'回転方向：左回転（反時計回り）。押すと切り替え':'回転方向：右回転（時計回り）。押すと切り替え'));button.querySelector('span').textContent=t(spin===1?'左':'右');}
 function updateGauges(){for(const [selector,tops] of [['.boss-player-spin',battle.tops.slice(0,1)],['.boss-enemy-spin',battle.tops.slice(1)]]){const ratio=tops.reduce((sum,top)=>sum+(top.loss?0:top.initialOmega>0?Math.max(0,Math.min(1,battle.state(top).spin/top.initialOmega)):1),0)/tops.length;$(selector).value=ratio;}}

 function showRoundIntro(){intro.textContent=t(`${run.index+1}戦目 ${run.battle.enemies.map(enemy=>enemy.char).join(' ')}`);intro.classList.remove('is-visible');intro.style.removeProperty('font-size');const available=Math.max(1,dialog.clientWidth-24),width=intro.scrollWidth;if(width>available)intro.style.fontSize=`${parseFloat(getComputedStyle(intro).fontSize)*available/width}px`;void intro.offsetWidth;intro.classList.add('is-visible');}
 const model=()=>({index:run?.index,status:run?.status});
 function cancelPull(){if(drag)sound.stopRope(drag.id);if(drag)try{canvas.releasePointerCapture(drag.id);}catch{}drag=null;view?.aim(angle,power,false);}
 function releaseStage(){intro.classList.remove('is-visible');cancelPull();if(view){view.clearEffects();for(const g of view.groups){view.scene.remove(g);disposeTopVisual(g);}view.groups=[];view.stageBowl?.dispose();view.stageBowl=null;view.stageId=null;}battle?.dispose();battle=null;for(const glyph of variants)glyph.geometry.dispose();variants=[];}
 function disposeView(){if(!view)return;releaseStage();view.observer.disconnect();view.topPresence?.clear();view.stageBoards?.dispose();view.rotatingFloor?.dispose();view.renderResources?.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();view.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}if(o.shadow)o.shadow.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const texture of textures)texture.dispose();disposeRewardEnvironment(view.renderer);view.renderer.dispose();view=null;}
 function close(reason='home_button'){if(!active)return;trackFeature('boss_exit',{exit_reason:typeof reason==='string'?reason:'home_button'});++token;active=false;cutin?.dispose();cutin=null;cancelAnimationFrame(raf);raf=0;disposeView();if(dialog.open)dialog.close();sound.reset();onExit();}
 function showMessage(kind){
  intro.classList.remove('is-visible');cancelPull();message.dataset.kind=kind;message.className='boss-message '+(['won','lost','clear'].includes(kind)?'result':'boss-pause');message.hidden=false;$('.boss-controls').hidden=true;const heading=$('.boss-message h2');heading.textContent=kind==='won'?`${selection.glyph.char} WIN!`:t(kind==='pause'?'一時停止':kind==='clear'?'トリック オア トリート！':kind==='error'?'読み込みに失敗しました':kind==='expired'?'開催期間は終了しました。':'チャレンジ失敗');heading.style.setProperty('--winner-font','MojiTitlePopFull');
  const description=$('.boss-message p');description.textContent=['won','lost'].includes(kind)?'':t(kind==='pause'?'最初に選んだ文字で最後まで挑戦。':kind==='clear'?'ミッションから報酬を受け取れます':kind==='error'?'HOMEへ戻って、もう一度お試しください。':kind==='expired'?'獲得したスキンは期間終了後も使えます。':'');description.hidden=!description.textContent;
  next.hidden=['error','expired'].includes(kind);next.textContent=t(kind==='pause'?'続ける':kind==='clear'?'報酬を確認':kind==='won'?'次のバトル':'最初から再挑戦');home.textContent=t('HOMEへ戻る');$('.boss-message h2').focus({preventScroll:true});
 }
 function pause(){if(!active||loading||settled||error||paused)return;trackFeature('boss_pause');paused=true;last=null;cancelPull();if(view)view.shake=0;sound.stopVoices();sound.pause();showMessage('pause');}
 function syncRoster(){
  $('.boss-player').textContent=selection.glyph.char;applySkinVariables($('.boss-player'),selection.skin);
  applyGlyphFinish($('.boss-player'),skins,selection.glyph.char,true);
  $('.boss-enemies').replaceChildren(...battle.tops.slice(1).map(top=>{const span=document.createElement('span');span.textContent=top.glyph.char;span.className=top.loss?'is-defeated':'';return span;}));
 }
 async function prepare(){
  const revision=++token;loading=true;error=false;expired=false;settled=false;finishTime=0;paused=false;last=null;hiddenLosses.clear();missionTrial=null;message.hidden=true;$('.boss-controls').hidden=true;hint.textContent=t('読み込み中...');
  trackFeature('boss_loading',{index:run.index});releaseStage();sound.stopWeb();sound.preloadBoss(run.battle.stage);updateRoute();
  try{
   await Promise.all([initPhysics(),run.index===4?sound.preloadBossCutin():null]);if(!active||revision!==token)return;
   const lib=libraries().get('gothic');if(!lib)throw Error('font');const glyphs=[selection.glyph];
   for(const enemy of run.battle.enemies){await new Promise(requestAnimationFrame);if(!active||revision!==token)return;const g=bossEnemyGlyph(lib.get(enemy.char),enemy);if(g.bossOwned)variants.push(g);glyphs.push(g);}
   battle=battleFactory(glyphs,run.index);view ||=new ArenaView(canvas,RENDER_QUALITIES[0],{skinFor:(_,index)=>index===0?selection.skin:null});view.setBattle(battle);syncRoster();
   if(run.index===4){view.draw(battle,1,0,true);cutin=createBossCutin({parent:dialog,onStart:()=>sound.bossCutin()});await cutin.finished;cutin=null;if(!active||revision!==token)return;}
   loading=false;angle=bossBoardAim(battle.stage,battle.tops[0].body.translation(),true)??0;power=.8;spin=1;updateSpin();updateGauges();hint.textContent='';$('.boss-controls').hidden=false;canvas.dataset.phase='ready';canvas.setAttribute('aria-label',t('引っ張って離すと発射'));view.aim(angle,power,false);view.draw(battle,1,0,true);trackFeature('boss_ready');if(!entering)showRoundIntro();
  }catch{cutin?.dispose();cutin=null;if(active&&revision===token){loading=false;error=true;trackFeature('boss_error',{error_code:'stage_loading_failed'});hint.textContent='';showMessage('error');}}
 }
 function fire(){if(!active||entering||paused||loading||settled||error||run.status!=='ready'||!progress.active()||!guard())return;cancelPull();sound.unlock();if(!battle.launch(angle,power,spin)||!run.launch())return;trackFeature('boss_launch',{angle,power,spin});missionTrial=`halloween-boss:${globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}`;progress.start({id:missionTrial,mode:'boss',glyph:selection.glyph.char});sound.startBossMusic();sound.launch();canvas.dataset.phase='battle';hint.textContent='';$('.boss-controls').hidden=true;}
 function draw(now){if(!active)return;raf=requestAnimationFrame(draw);if(!guard()){close('session_lost');return;}if(document.hidden||globalThis.mojiBladeApp?.paused){last=null;return;}if(!progress.active()){if(!expired){expired=true;paused=true;trackFeature('boss_exit',{exit_reason:'expired'});sound.reset();showMessage('expired');}last=null;return;}
  const dt=last==null?0:Math.min(.05,(now-last)/1000);last=now;if(!view||loading){if(!paused)sound.updateBossMusic();return;}let alpha=1;
  if(!paused){
   sound.updateBossMusic();
   if(run.status==='battle'){trackFeature('boss_frame',{now});alpha=battle.advance(dt);}else if(battle.result)battle.advanceAftermath(dt);
   for(const event of battle.events.splice(0)){trackFeature('boss_impact',{player:event.criticalAttackers?.includes(0),enemies:event.criticalAttackers?.filter(i=>i>0).length||0});view.hit(event);sound.hit(event.strength,event.position.x/CONFIG.arenaRadius,event.critical);}
   for(const event of battle.propEvents.splice(0)){const pan=event.position.x/CONFIG.arenaRadius;if(event.kind==='pumpkin')sound.pumpkinHit(event.strength,pan);else sound.stoneBreak(pan);}
   for(const event of battle.boostEvents.splice(0))sound.boost(event.position.x/CONFIG.arenaRadius);
   for(const top of battle.tops)if(top.loss&&!hiddenLosses.has(top.index)){hiddenLosses.add(top.index);if(run.index===4&&top.index===1)sound.bossClear();if(top.loss!=='場外'){view.shatter(top,view.groups[top.index],battle);sound.shatter();}else view.groups[top.index].visible=false;syncRoster();}
   if(battle.result&&!settled){trackFeature('boss_result',{...battle.result,defeated:battle.tops.slice(1).filter(top=>top.loss).length});run.settle(battle.result);updateRoute();if(missionTrial)progress.settle({id:missionTrial,winner:battle.result.winner});settled=true;finishTime=0;sound.updateSpin(0);sound.result(battle.result.winner===0);if(run.status==='clear')progress.bossVictory({cleared:5});}
   if(settled){finishTime+=dt;if(finishTime>=.9&&message.hidden)showMessage(run.status);}
   sound.webFooting(run.status==='battle'&&!settled&&Boolean(battle.tops[0].onWeb),battle.tops[0].body.translation().x/CONFIG.arenaRadius);
   updateGauges();if(run.status==='battle')sound.updateSpin(Math.max(...battle.tops.map(top=>top.loss?0:battle.state(top).spin)));
  }
  view.draw(battle,alpha,paused?0:dt,run.status==='ready');
 }
 function bossPointerDown(e){
  if(!active||run?.status!=='ready'||paused||loading||error||settled||e.isPrimary===false||e.pointerType==='mouse'&&e.button!==0)return;
  const p=view.pointFromPointer(e),origin=battle.tops[0].body.translation();if(!p||Math.hypot(p.x-origin.x,p.z-origin.z)>1.7)return;
  dialog.dataset.keyboardFocus='false';e.preventDefault();sound.unlock();sound.startBossMusic();drag={...makePullState(e,p),id:e.pointerId};canvas.setPointerCapture(e.pointerId);
 }
 function moveBossDrag(e,playSound=true){
  if(!active||!drag||drag.id!==e.pointerId||run?.status!=='ready'||paused||loading||error||settled)return;
  const p=view.pointFromPointer(e);if(!p)return;const x=drag.start.x-p.x,z=drag.start.z-p.z,d=Math.hypot(x,z);
  if(!updatePullGesture(drag,e)){sound.stopRope(e.pointerId);drag.lastPoint=p;angle=0;power=.8;view.aim(angle,power,false);return;}
  if(playSound&&Math.hypot(p.x-drag.lastPoint.x,p.z-drag.lastPoint.z)>.015){sound.rope(e.pointerId,d/2.8);drag.lastPoint=p;}
  angle=launchAngleFromPull(x,z);power=Math.max(.15,Math.min(1,d/2.8));view.aim(angle,power,true);
 }
 function releaseBossDrag(e){
  if(!active||!drag||drag.id!==e.pointerId||paused||loading||error||settled)return;
  moveBossDrag(e,false);const shouldFire=drag.moved;cancelPull();if(e.cancelable)e.preventDefault();if(shouldFire)fire();else{angle=0;power=.8;view.aim(angle,power,false);}
 }
 canvas.addEventListener('pointerdown',bossPointerDown);
 // Match ordinary play: retain the gesture after capture loss, and handle
 // release over HUD/outside the board through window capture listeners.
 window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.buttons===0&&drag?.id===e.pointerId)releaseBossDrag(e);else moveBossDrag(e);},true);
 window.addEventListener('pointerup',releaseBossDrag,true);
 window.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId)cancelPull();},true);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;error=true;trackFeature('boss_error',{error_code:'webgl_context_lost'});sound.reset();showMessage('error');});
 dialog.addEventListener('keydown',e=>{if(e.key==='Tab')dialog.dataset.keyboardFocus='true';if(e.target!==canvas||run?.status!=='ready'||paused)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')angle-=.08;if(e.key==='ArrowRight')angle+=.08;if(e.key==='ArrowUp')power=Math.min(1,power+.05);if(e.key==='ArrowDown')power=Math.max(.15,power-.05);view?.aim(angle,power,true);if(e.key==='Enter'||e.key===' ')fire();});
 dialog.addEventListener('pointerdown',()=>{dialog.dataset.keyboardFocus='false';});dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('.boss-menu').onclick=close;$('.boss-home').onclick=close;$('.boss-spin').onclick=()=>{spin*=-1;updateSpin();};
 next.onclick=()=>{if(paused&&!settled){trackFeature('boss_resume');paused=false;last=null;message.hidden=true;$('.boss-controls').hidden=run.status!=='ready';sound.resume();return;}if(run.status==='clear'){if(!progress.achieved('boss')&&!progress.bossVictory({cleared:5})){hint.textContent=t('ミッションの進捗を保存できません。');return;}close();onMissions();return;}if(run.status==='won'){trackFeature('boss_next');run.next();}else if(run.status==='lost'){trackFeature('boss_retry');run.retry();}void prepare();};
 window.addEventListener('moji-halloween-back',()=>{if(active)close('android_back');});
 document.addEventListener('visibilitychange',()=>{last=null;if(!active)return;if(document.hidden){sound.pause();pause();}else if(!paused)sound.resume();else sound.pause();});window.addEventListener('moji-app-lifecycle',()=>{if(active){if(globalThis.mojiBladeApp?.paused){sound.pause();pause();}else if(!paused)sound.resume();else sound.pause();}last=null;});
 return {get active(){return active;},get state(){return model();},async start(value,{entry=null}={}){if(active||!progress.active()||!guard())return false;selection=value;trackFeature('boss_begin',{p1_glyph:value.glyph.char,p1_font:value.font,skin_id:value.skin?.id||'original'});active=true;entering=Boolean(entry);run=createBossRun();sound.startBossMusic();dialog.showModal();entry?.attach(dialog);raf=requestAnimationFrame(draw);await prepare();await entry?.reveal();entering=false;if(entry&&active&&!error)showRoundIntro();return !error;},close};
}
