/** R9 STORY: Rapier V2 rigid-body simulation + versioned V3 HP rule layer.
 * Browser entry is a local-only playable build, not a cloud/leaderboard proof.
 */
import {createArcadeBattle,ARCADE_RULESET,DASH_COOLDOWN_FRAMES} from './engine/r10-arcade-battle.mjs';
import {NATIVE_HP_RULESET,NATIVE_HP_PHYSICS} from './engine/native-hp-rules.mjs';
import {loadArcadeSave,commitArcadeResult} from './engine/r10-arcade-save.mjs';
import {LEVEL_CATALOG,LEVEL_ORDER,isUnlocked} from './engine/level-catalog.mjs';
import {getStageMission} from './engine/r15-stage-board.mjs';
import {ArenaView} from './legacy-v2/render.js';
import {pullAim,swipeDash,shouldCaptureGameplayKey,compactOutcome} from './engine/r11-input.mjs';
import {BattlePresentation} from './engine/r12-feedback.mjs';
import {assessPull,hitTarget} from './engine/r12-touch.mjs';
import {QUALITY_PRESETS,defaultQuality,viewportClass,FrameQualityController,renderDue} from './engine/r13-quality.mjs';
import {targetRadius} from './engine/r13-mobile.mjs';
import {battlePhaseView,dashStatusView,healthStatusView,pauseActionsCopy} from './engine/r18-battle-hud.mjs';
import {feedbackDecision,resultMotion} from './engine/r13-feedback-policy.mjs';
import {buildStoryReport,storyResultHTML,readBattleJournal,writeBattleJournal} from './engine/r19-result-report.mjs';
import {RENDER_QUALITIES} from './legacy-v2/render-recovery.js';
import {CONFIG} from './legacy-v2/config.js';
import * as THREE from './legacy-v2/vendor/three.js';
const root=document.getElementById('battle-root');
function setStoryDocumentMeta(title,description){document.title=title;const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=description;}
const loc={
 ja:{heading:'文字ブレードの文字バトル',back:'戻る',ready:'文字を引いて離すか、照準を調節して発射しよう。',fire:'発射！',retry:'再挑戦',stages:'ステージ選択',next:'次のステージ',angle:'方向',power:'力',spin:'回転方向',left:'左回転',right:'右回転',draw:'引き分け',win:'勝利！',loss:'敗北',loading:'コマを準備中…',pause:'一時停止',resume:'再開',reason:'決着理由',save:'端末に保存しました',unsaved:'端末に保存できませんでした',mission:'ミッション',cleared:'ミッション達成',failed:'ミッション未達成',export:'ローカル記録を保存',noRank:'練習バトル',notice:'',needFont:'原版フォントの読み込みに失敗しました'},
 zh:{heading:'文字竞技场',back:'返回',ready:'拖动蓝色文字松开发射，或使用下面的精确瞄准。',fire:'发射！',retry:'再战一次',stages:'返回关卡',next:'下一关',angle:'方向',power:'力度',spin:'旋转方向',left:'左旋',right:'右旋',draw:'平局',win:'胜利！',loss:'失败',loading:'正在准备陀螺…',pause:'暂停',resume:'继续',reason:'结束原因',save:'已保存到本机',unsaved:'本地存档失败',mission:'任务',cleared:'任务完成',failed:'任务未完成',export:'导出本地战斗记录',noRank:'练习战斗',notice:'',needFont:'原版字体加载失败'},
 en:{heading:'Moji Arena',back:'Back',ready:'Pull and release the blue glyph, or fine-tune aim below.',fire:'Launch!',retry:'Rematch',stages:'Stage select',next:'Next stage',angle:'Aim',power:'Power',spin:'Rotation',left:'CCW',right:'CW',draw:'Draw',win:'Victory!',loss:'Defeat',loading:'Preparing your top…',pause:'Pause',resume:'Resume',reason:'Finish',save:'Saved on this device',unsaved:'Unable to save locally',mission:'Mission',cleared:'Mission complete',failed:'Mission not met',export:'Export local trace',noRank:'Practice match',notice:'',needFont:'Original font unavailable'},
 ko:{heading:'문자 배틀',back:'뒤로',ready:'글자를 당겨 발사하거나 조준을 조정하세요.',fire:'발사!',retry:'재도전',stages:'스테이지',next:'다음 스테이지',angle:'방향',power:'파워',spin:'회전',left:'왼쪽',right:'오른쪽',draw:'무승부',win:'승리!',loss:'패배',loading:'팽이를 준비 중…',pause:'일시 정지',resume:'재개',reason:'종료',save:'로컬 저장됨',unsaved:'로컬 저장 실패',mission:'미션',cleared:'미션 완료',failed:'미션 실패',export:'로컬 기록 내보내기',noRank:'연습 배틀',notice:'',needFont:'원본 글꼴 로딩 실패'}
};
const escape=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageTitles={'01-01':['はじめての発射','First Launch','初次发射','첫 발사'],'01-02':['力のコントロール','Power Control','力度训练','힘 조절'],'01-03':['角度のひみつ','Angle Control','角度的奥秘','각도의 비밀'],'01-04':['第一の試練','The First Trial','初次试炼','첫 시련']};
const missions={ja:{'01-01':'勝利する','01-02':'65%以上の力で勝利','01-03':'9°以上の角度で勝利','01-04':'ボス「剣」に勝利'},zh:{'01-01':'击败对手','01-02':'至少 65% 力度获胜','01-03':'至少 9° 偏角获胜','01-04':'击败首领「剣」'},en:{'01-01':'Win the match','01-02':'Win with at least 65% power','01-03':'Win with at least 9° aim','01-04':'Defeat the boss 剣'},ko:{'01-01':'승리','01-02':'65% 이상 파워로 승리','01-03':'9° 이상 각도로 승리','01-04':'보스 剣 격파'}};
const reasonNames={zh:{'場外':'出界','回転停止':'旋转停止','転倒':'倾倒','時間切れ':'时间结束','同時決着':'同时结束','hp-depleted':'HP 耗尽','double-ko':'双方 HP 耗尽'},en:{'場外':'Ring out','回転停止':'Spin stopped','転倒':'Toppled','時間切れ':'Time limit','同時決着':'Simultaneous finish','hp-depleted':'HP depleted','double-ko':'Double KO'},ja:{'hp-depleted':'HPが0','double-ko':'ダブルKO'},ko:{'場外':'링 아웃','回転停止':'회전 정지','転倒':'넘어짐','時間切れ':'시간 종료','hp-depleted':'HP 소진','double-ko':'동시 KO'}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const experienceText={
 ja:{quick:'ひっぱって発射',precision:'精密照準',precisionHint:'方向とパワーを調節し、発射ボタンで確定',dragHint:'青いコマをひっぱって離そう',battle:'バトル中！',pauseTitle:'一時停止',pauseHint:'準備ができたら再開',impact:'HIT',release:'指を離して SHOOT!'},
 zh:{quick:'拖拽即发射',precision:'精确瞄准',precisionHint:'调整方向和力度，再点击发射按钮',dragHint:'拖拽蓝色陀螺，松手发射',battle:'正在战斗！',pauseTitle:'已暂停',pauseHint:'准备好后继续战斗',impact:'撞击',release:'松手发射！'},
 en:{quick:'Pull to launch',precision:'Precision aim',precisionHint:'Adjust angle and power, then tap Launch',dragHint:'Pull the blue top and release',battle:'BATTLE!',pauseTitle:'Paused',pauseHint:'Resume when ready',impact:'HIT',release:'RELEASE TO LAUNCH'},
 ko:{quick:'드래그 발사',precision:'정밀 조준',precisionHint:'각도와 파워를 조절한 후 발사',dragHint:'파란 글자를 당기고 놓아 발사',battle:'배틀 중!',pauseTitle:'일시 정지',pauseHint:'준비되면 다시 시작',impact:'충돌',release:'놓으면 발사!'}
};
const readR13Settings=()=>{try{const v=JSON.parse(localStorage.getItem('moji-blade.r13.settings')||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
const readInputMode=()=>{try{return localStorage.getItem('moji-blade.r10.input')==='precision'}catch{return false}};

class NativeStoryScreen {
 constructor(){this.visible=false;this.match=null;this.view=null;this.raf=0;this.last=0;this.acc=0;this.drag=null;this.angle=0;this.power=.8;this.dir=1;this.paused=false;this.finished=false;this.precision=readInputMode();this.audio=null;this.dashHeading=null;this.dashPointer=null;this.hitTimer=0;this.prevHp=null;this.impactCount=0;this.lastImpactAt=0;this.presentation=null;this.touchPointer=null;this.r13=null;this.qualityControl=null;this.quality='high';this.lastDrawAt=0;this.windowAbort=null;this.transitions=0;this.currentPhase='loading';this.dashMessage='';this.healthState='ok';this.exitArmed=false;}
 language(){return document.querySelector('#locale-select')?.value||'ja';}
 labels(){return loc[this.language()]||loc.ja;}
 title(id){return stageTitles[id]?.[({ja:0,en:1,zh:2,ko:3}[this.language()]??0)]||id;}
 async open(payload){if(payload?.mode!=='story')return {status:'not-handled'};
  const level=LEVEL_CATALOG[payload.levelId],store=loadArcadeSave();if(!level||!isUnlocked(level.id,store.save.progress))return {status:'unavailable'};
  this.close(false);const t=this.labels();this.t=t;this.level=level;this.payload=payload;this.save=store.save;this.angle=0;this.power=.8;this.dir=1;this.last=0;this.acc=0;this.paused=false;this.finished=false;this.settling=false;this.settleElapsed=0;this.prevHp=null;this.precision=readInputMode();this.dashHeading=null;this.dashPointer=null;this.impactCount=0;this.lastImpactAt=0;this.touchPointer=null;this.lastDrawAt=0;this.lastImpactAt=-Infinity;this.windowAbort?.abort();this.windowAbort=new AbortController();this.transitions++;this.currentPhase='loading';this.dashMessage='';this.healthState='ok';this.exitArmed=false;
  const saved=readR13Settings(),initial=defaultQuality({width:innerWidth,memory:navigator.deviceMemory??8,cores:navigator.hardwareConcurrency??8,saveData:navigator.connection?.saveData,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  this.r13={quality:['auto','high','balanced','battery'].includes(saved.quality)?saved.quality:'auto',fx:['full','standard','quiet','off'].includes(saved.fx)?saved.fx:'standard',audio:Number.isFinite(saved.audio)?clamp(saved.audio,0,1):.5,haptics:saved.haptics===true};
  this.qualityControl=new FrameQualityController(initial);this.qualityControl.setMode(this.r13.quality,initial);this.quality=this.qualityControl.level;
  this.visible=true;this.prevFocus=document.activeElement;this.previousDocumentTitle=document.title;this.previousMetaDescription=document.querySelector('meta[name="description"]')?.content||'';const token=Symbol('r9-story');this.token=token;
  setStoryDocumentMeta(`${this.t.heading} · ${this.title(level.id)} | MOJI BLADE`,({ja:'文字ブレードのストーリーバトル。発射角度、パワー、Dashを使い、ステージ目標の達成を目指します。',zh:'文字对战故事关卡：调整发射角度与力度，使用Dash并完成关卡目标。',en:'Moji Blade Story battle: adjust launch angle and power, use Dash, and complete the stage objective.',ko:'문자 블레이드 스토리 배틀: 발사 각도와 파워를 조절하고 Dash를 사용해 스테이지 목표를 달성하세요.'}[this.language()]));
  root.hidden=false;root.innerHTML=`<div class="r8-shell r9-shell" data-phase="loading" data-input-mode="quick"><div class="r8-content"><header class="r8-head"><div><small>STORY BATTLE · ${escape(level.id)}</small><h1>${escape(t.heading)} · ${escape(this.title(level.id))}</h1></div><button type="button" class="r8-second" id="r9-back">← ${escape(t.back)}</button></header>
  <div class="r9-mission"><strong>${escape(t.mission)} · ${escape(level.id)}</strong> <span>${escape(getStageMission(level.id,this.language())?.main||missions.ja[level.id])}</span></div>
  <div class="r9-hud"><div class="r9-player"><b class="r9-glyph" id="r9-pglyph">${escape(payload.player.char)}</b><div class="r9-meters"><span>HP <b id="r9-p-hp-value">—</b></span><div class="r9-meter"><i class="r9-blue" id="r9-p-hp"></i></div><small>SPIN <b id="r9-p-spin-value">100%</b></small><div class="r9-meter r9-spin"><i id="r9-p-spin"></i></div></div></div><div class="r9-center"><span>ROUND 01</span><strong id="r9-time">00.0</strong><small id="r18-clock-label" class="r18-clock-label"></small><span id="r18-phase-chip" class="r18-phase-chip" aria-hidden="true">LOADING</span></div><div class="r9-player opponent"><b class="r9-glyph" id="r9-eglyph">${escape(level.enemy)}</b><div class="r9-meters"><span>HP <b id="r9-e-hp-value">—</b></span><div class="r9-meter"><i class="r9-red" id="r9-e-hp"></i></div><small>SPIN <b id="r9-e-spin-value">100%</b></small><div class="r9-meter r9-spin"><i id="r9-e-spin"></i></div></div></div></div>
  <div class="r8-view r9-stage"><canvas id="r9-canvas" tabindex="0" aria-label="Rapier 3D arena; drag to aim and release"></canvas>
    <div class="r10-arena-vignette" aria-hidden="true"></div><div id="r11-hit-veil" class="r11-hit-veil" aria-hidden="true"></div><div id="r12-gesture-indicator" class="r12-gesture-indicator" hidden aria-hidden="true"><b>↗</b><span id="r12-gesture-label"></span></div><div id="r11-dash-vector" class="r11-dash-vector" aria-hidden="true" hidden><span id="r11-vector-arrow">➤</span><small id="r11-vector-note">DASH DIRECTION</small></div><div class="r10-dash-pulse" id="r10-dash-pulse" aria-hidden="true"></div><div class="r10-impact" id="r10-impact" aria-hidden="true"><b id="r10-impact-title"></b><span id="r10-impact-p"></span><span id="r10-impact-e"></span></div>
    <div class="r10-aim-callout" id="r10-aim-callout" aria-hidden="true"><small>LAUNCH VECTOR</small><b id="r10-aim-readout">0° · 80%</b><span id="r10-gesture-hint"></span></div>
    <div class="r10-pause-overlay" id="r10-pause-overlay" hidden><small>MOJI BLADE · PAUSE</small><strong id="r10-pause-title"></strong><span id="r10-pause-hint"></span><button type="button" class="r8-cta" id="r10-resume">${t.resume} →</button><button type="button" class="r8-second r18-exit" id="r18-exit"></button><span id="r18-pause-warning" class="r18-pause-warning"></span></div>
    <div class="r8-result" id="r9-result" hidden></div></div>
  <section class="r8-controls r9-controls" id="r9-controls" aria-label="Launch controls">
    <details class="r13-options" id="r13-options"><summary aria-label="Game settings">⚙</summary><div class="r13-options-panel">
      <label for="r13-quality">${this.language()==='zh'?'画面质量':this.language()==='ja'?'画質':this.language()==='ko'?'화질':'Graphics'}<select id="r13-quality"><option value="auto">AUTO</option><option value="high">HIGH</option><option value="balanced">BALANCED</option><option value="battery">BATTERY</option></select></label>
      <label for="r13-fx">${this.language()==='zh'?'特效强度':this.language()==='ja'?'演出':this.language()==='ko'?'효과':'Effects'}<select id="r13-fx"><option value="full">FULL</option><option value="standard">STANDARD</option><option value="quiet">QUIET</option><option value="off">OFF</option></select></label>
      <label for="r13-volume">${this.language()==='zh'?'音效音量':this.language()==='ja'?'効果音':this.language()==='ko'?'효과음':'SFX volume'} <input type="range" id="r13-volume" min="0" max="100" step="10" value="50"></label>
      <label class="r13-haptics"><input type="checkbox" id="r13-haptics"> ${this.language()==='zh'?'震动反馈':this.language()==='ja'?'振動':this.language()==='ko'?'진동':'Haptics'}</label>
      <small id="r13-quality-status" role="status"></small></div></details>
    <button type="button" class="r8-second r10-spin-button" id="r9-spin">↺ ${t.spin}: ${t.left}</button>
    <div class="r10-control-caption"><small>SHOOT · DASH · WIN</small><b id="r10-control-label"></b><span id="r10-control-detail"></span></div>
    <details class="r10-precision" id="r10-precision"><summary><span>↗</span> <span id="r10-precision-label"></span></summary><div class="r10-precision-fields"><label>${t.angle} <output id="r9-angle-out">0°</output><input type="range" id="r9-angle" min="-80" max="80" step="1" value="0"></label><label>${t.power} <output id="r9-power-out">80%</output><input type="range" id="r9-power" min="15" max="100" step="1" value="80"></label></div></details>
    <button type="button" class="r8-cta r10-dash-button" id="r10-dash" disabled aria-label="Dash / Charge">⚡ <span id="r10-dash-label">DASH</span><small id="r10-dash-timer">READY</small></button>
    <button type="button" class="r8-cta r10-launch-button" id="r9-fire" disabled><span>↗</span> ${t.fire}</button>
    <button type="button" class="r8-second r10-pause-button" id="r9-pause" disabled aria-label="${t.pause}">Ⅱ</button>
  </section><div class="r18-coach" id="r18-coach" aria-label="Battle information"><div class="r18-coach-main"><span class="r18-dot" aria-hidden="true"></span><strong id="r18-coach-title"></strong><span id="r18-coach-detail"></span></div><div class="r18-coach-side"><span id="r18-dash-feedback"></span><span id="r18-health-feedback" aria-live="polite"></span></div><small id="r18-controls-help"></small></div><div class="r8-status" id="r9-status" role="status" aria-live="polite">${t.loading}</div><div class="r8-note">${t.noRank}</div></div></div>`;
  this.$=id=>root.querySelector('#'+id);
  this.$('r9-back').onclick=()=>this.close();this.installR13Settings();this.phase('loading');this.$('r18-exit').onclick=()=>{if(!this.paused||this.finished)return;if(!this.exitArmed){this.exitArmed=true;this.$('r18-exit').textContent=pauseActionsCopy(this.language()).exitConfirm;return;}this.close(true,true);};
  this.$('r9-angle').oninput=e=>{this.angle=Number(e.target.value)*Math.PI/180;this.$('r9-angle-out').textContent=e.target.value+'°';this.aim();};
  this.$('r9-power').oninput=e=>{this.power=Number(e.target.value)/100;this.$('r9-power-out').textContent=e.target.value+'%';this.aim();};
  this.$('r9-spin').onclick=()=>{this.dir*=-1;this.$('r9-spin').textContent=this.t.spin+': '+(this.dir===1?this.t.left:this.t.right);};
  this.$('r9-fire').onclick=()=>this.fire();const dashButton=this.$('r10-dash');let dashStart=null,suppressDashClick=false;
  dashButton.onclick=e=>{if(suppressDashClick&&e.detail!==0){suppressDashClick=false;return;}this.dash();};
  const hideVector=()=>{this.$('r11-dash-vector').hidden=true;dashButton.classList.remove('is-vectoring');};
  dashButton.addEventListener('pointerdown',e=>{if(dashButton.disabled||e.button!==0)return;dashStart={id:e.pointerId,x:e.clientX,y:e.clientY};dashButton.setPointerCapture(e.pointerId);});
  dashButton.addEventListener('pointermove',e=>{if(!dashStart||e.pointerId!==dashStart.id)return;const v=swipeDash(e.clientX-dashStart.x,e.clientY-dashStart.y);if(!v){hideVector();return;}
   const arrow=this.$('r11-vector-arrow');arrow.style.transform=`rotate(${Math.atan2(e.clientY-dashStart.y,e.clientX-dashStart.x)*180/Math.PI}deg)`;
   this.$('r11-dash-vector').hidden=false;dashButton.classList.add('is-vectoring');});
  dashButton.addEventListener('pointerup',e=>{if(!dashStart||e.pointerId!==dashStart.id)return;const v=swipeDash(e.clientX-dashStart.x,e.clientY-dashStart.y);dashStart=null;hideVector();if(v){suppressDashClick=true;this.dash(v.heading);setTimeout(()=>{suppressDashClick=false;},0);e.preventDefault();e.stopPropagation();}});
  dashButton.addEventListener('pointercancel',()=>{dashStart=null;hideVector();});dashButton.addEventListener('lostpointercapture',hideVector);this.$('r9-pause').onclick=()=>this.togglePause();this.$('r10-resume').onclick=()=>this.togglePause();
  this.$('r10-precision').addEventListener('toggle',()=>this.setInputMode(this.$('r10-precision').open));this.setInputMode(this.precision,false);
  // Capture Escape so the underlying stage-selection page cannot intercept it.
  this.escapeHandler=e=>{if(e.key==='Escape'&&this.visible){e.preventDefault();e.stopImmediatePropagation();if(this.match?.action&&!this.finished)this.togglePause();else this.close();}};
  document.addEventListener('keydown',this.escapeHandler,true);
  this.gameKeys=e=>{if(!this.visible||this.paused||this.finished||e.repeat||e.altKey||e.metaKey||e.ctrlKey||!shouldCaptureGameplayKey(e.target)||document.querySelector('dialog[open]'))return;
   if(this.match?.action){if(['Space','KeyD'].includes(e.code)){e.preventDefault();this.dash();}return;}
   if(e.code==='KeyQ'){e.preventDefault();this.$('r9-spin').click();return;}
   if(e.code==='Enter'){e.preventDefault();this.fire();return;}
   if(['KeyA','KeyD','KeyW','KeyS'].includes(e.code)){e.preventDefault();this.angle=clamp(this.angle+(e.code==='KeyD'?.05:e.code==='KeyA'?-.05:0),-Math.PI*80/180,Math.PI*80/180);
    this.power=clamp(this.power+(e.code==='KeyW'?.05:e.code==='KeyS'?-.05:0),.15,1);
    this.$('r9-angle').value=String(Math.round(this.angle*180/Math.PI));this.$('r9-power').value=String(Math.round(this.power*100));
    this.$('r9-angle-out').textContent=Math.round(this.angle*180/Math.PI)+'°';this.$('r9-power-out').textContent=Math.round(this.power*100)+'%';this.aim();}
  };document.addEventListener('keydown',this.gameKeys);
  try{
   const match=await createArcadeBattle({levelId:level.id,player:payload.player.char,font:payload.player.fontId});
   if(!this.visible||this.token!==token){match.dispose();return {status:'cancelled'};}this.match=match;
   try{this.view=new ArenaView(this.$('r9-canvas'),this.quality==='battery'?RENDER_QUALITIES[2]:RENDER_QUALITIES[0]);this.view.setBattle(match.native.battle);this.applyArenaArtDirection();}catch(error){this.view=null;this.installFallback(error);}
   this.presentation=new BattlePresentation({host:this.$('r9-canvas')?.parentElement||this.fallback.parentElement,webglCanvas:this.view?this.$('r9-canvas'):null,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,soundEnabled:()=>document.querySelector('#sound-toggle')?.getAttribute('aria-pressed')==='true'});this.applyQuality();this.applyFeedbackSettings();this.installInput();this.aim();this.updateHud();this.$('r9-fire').disabled=false;this.$('r9-pause').disabled=true;this.$('r9-status').textContent=this.t.ready;this.phase('ready');this.introCue();
   this.bindR13Viewport();this.raf=requestAnimationFrame(now=>this.frame(now));return {status:'started'};
  }catch(error){if(this.visible&&this.token===token)this.close(false);return {status:'failed',error:error.message};}
 }
 installR13Settings(){
  this.$('r13-quality').value=this.r13.quality;this.$('r13-fx').value=this.r13.fx;this.$('r13-volume').value=String(Math.round(this.r13.audio*100));this.$('r13-haptics').checked=this.r13.haptics;
  const persist=()=>{try{localStorage.setItem('moji-blade.r13.settings',JSON.stringify(this.r13))}catch{}};
  this.$('r13-quality').onchange=e=>{this.r13.quality=e.target.value;const device=defaultQuality({width:innerWidth,memory:navigator.deviceMemory??8,cores:navigator.hardwareConcurrency??8,saveData:navigator.connection?.saveData,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});this.qualityControl.setMode(this.r13.quality,device);this.quality=this.qualityControl.level;this.applyQuality();persist();};
  this.$('r13-fx').onchange=e=>{this.r13.fx=e.target.value;this.applyFeedbackSettings();persist();};
  this.$('r13-volume').oninput=e=>{this.r13.audio=Number(e.target.value)/100;this.applyFeedbackSettings();persist();};
  this.$('r13-haptics').onchange=e=>{this.r13.haptics=e.target.checked;this.applyFeedbackSettings();persist();};
 }
 applyFeedbackSettings(){this.presentation?.setPreferences({quality:this.quality,fxLevel:this.r13?.fx,audioLevel:this.r13?.audio,haptics:this.r13?.haptics});}
 applyQuality(){if(!this.visible)return;
  const config=QUALITY_PRESETS[this.quality],renderer=this.view?.renderer;
  if(renderer){renderer.setPixelRatio(Math.min(config.pixelRatio,devicePixelRatio||1));renderer.shadowMap.enabled=config.shadows;renderer.shadowMap.needsUpdate=true;this.view.resize();this.view.quality={...this.view.quality,id:config.shadows?'normal':'light'};}
  this.applyFeedbackSettings();const label=this.$?.('r13-quality-status');if(label)label.textContent=this.quality.toUpperCase()+(this.r13?.quality==='auto'?' · AUTO':'');
  root.querySelector('.r9-shell')?.setAttribute('data-quality',this.quality);
 }
 bindR13Viewport(){const update=()=>{const rect=this.$('r9-canvas')?.getBoundingClientRect();const host=root.querySelector('.r9-shell');if(!host)return;
   host.dataset.viewport=viewportClass({width:innerWidth,height:visualViewport?.height||innerHeight});
   host.style.setProperty('--r13-screen-h',`${visualViewport?.height||innerHeight}px`);
   this.view?.resize();if(rect)this.$('r13-options')?.removeAttribute('open');
  };
  update();const signal=this.windowAbort.signal;window.addEventListener('resize',update,{signal});visualViewport?.addEventListener('resize',update,{signal});window.addEventListener('orientationchange',update,{signal});
 }
 installFallback(error){const old=this.$('r9-canvas'),node=document.createElement('canvas');node.id='r9-fallback';node.className='r8-2d';node.setAttribute('aria-label','Projection of authentic Rapier physical positions');node.tabIndex=0;old.replaceWith(node);this.fallback=node;this.ctx=node.getContext('2d');this.$('r9-status').textContent=this.language()==='zh'?'已切换到简化画面，仍可继续游戏。':this.language()==='en'?'Simplified view. You can still play.':'軽量表示に切り替えました。対戦は続けられます。';
 }
 applyArenaArtDirection(){
  // Lighting-only changes: original Rapier bodies, collision meshes and battle data stay untouched.
  try{this.view.renderer.setClearColor(0x46517e);this.view.scene.fog.color.setHex(0x46517e);
    if(this.view.environment?.floor?.material?.color)this.view.environment.floor.material.color.setHex(0x616a9c);
    if(this.view.environment?.sun)this.view.environment.sun.color.setHex(0xffe2bb);
  }catch{/* optional visual treatment */}
 }
 phase(name){const shell=root.querySelector('.r9-shell');if(shell)shell.dataset.phase=name;
  this.currentPhase=name;const data=battlePhaseView({locale:this.language(),phase:name});
  const put=(id,value)=>{const el=this.$?.(id);if(el&&el.textContent!==value)el.textContent=value;};
  put('r18-phase-chip',data.title);put('r18-coach-title',data.title);put('r18-coach-detail',data.detail);put('r18-controls-help',data.help);put('r18-clock-label',data.clock);
  const coach=this.$?.('r18-coach');if(coach)coach.dataset.phase=name;
  if(name!=='battle')put('r18-dash-feedback',dashStatusView({locale:this.language(),phase:name}).label);
 }
 setInputMode(precision,persist=true){this.precision=!!precision;const detail=this.$('r10-precision');if(detail&&detail.open!==this.precision)detail.open=this.precision;
  const txt=experienceText[this.language()]||experienceText.ja,shell=root.querySelector('.r9-shell');if(shell)shell.dataset.inputMode=this.precision?'precision':'quick';
  this.$('r10-precision-label').textContent=txt.precision;
  this.$('r10-control-label').textContent=this.precision?txt.precision:txt.quick;
  this.$('r10-control-detail').textContent=this.precision?txt.precisionHint:txt.dragHint;
  this.$('r10-gesture-hint').textContent=this.precision?txt.precisionHint:txt.dragHint;
  if(persist)try{localStorage.setItem('moji-blade.r10.input',this.precision?'precision':'quick');}catch{}
 }
 introCue(){const box=this.$('r10-aim-callout');box.classList.add('is-entering');clearTimeout(this.introTimer);this.introTimer=setTimeout(()=>box.classList.remove('is-entering'),900);}
 syncAimUI(){this.$('r10-aim-readout').textContent=`${Math.round(this.angle*180/Math.PI)}° · ${Math.round(this.power*100)}%`;}
 installInput(){const canvas=this.view?this.$('r9-canvas'):this.fallback;if(!canvas)return;
  canvas.style.touchAction='none';
  const indicator=this.$('r12-gesture-indicator'),indicatorLabel=this.$('r12-gesture-label');
  const clearIndicator=()=>{indicator.hidden=true;indicator.classList.remove('is-cancel');};
  const showIndicator=(state,e)=>{indicator.hidden=false;const box=canvas.getBoundingClientRect();indicator.style.left=`${e.clientX-box.left}px`;indicator.style.top=`${e.clientY-box.top}px`;
   indicator.classList.toggle('is-cancel',state.backToOrigin);indicatorLabel.textContent=state.backToOrigin?({ja:'キャンセル',zh:'取消发射',en:'CANCEL',ko:'취소'}[this.language()]||'CANCEL'):this.precision?({ja:'照準を決める',zh:'确认瞄准',en:'AIM READY',ko:'조준 확인'}[this.language()]||'AIM READY'):({ja:'離して発射！',zh:'松手发射！',en:'RELEASE TO SHOOT',ko:'놓으면 발사!'}[this.language()]||'RELEASE TO SHOOT');};
  // Only the player's top is a quick-pull handle. A stray finger on the arena never launches.
  const playerCenter=()=>{if(!this.view?.camera||!this.match)return null;
   try{const p=this.match.native.battle.tops[0].body.translation(),v=new THREE.Vector3(p.x,p.y,p.z);v.project(this.view.camera);
    const box=canvas.getBoundingClientRect();return{x:box.left+(v.x+1)*box.width/2,y:box.top+(1-v.y)*box.height/2};}catch{return null;}};
  canvas.addEventListener('pointerdown',e=>{if(!this.match||this.match.action||!e.isPrimary||e.pointerType==='mouse'&&e.button!==0)return;
    const world=this.view?.pointFromPointer?.(e);
    if(world){if(Math.hypot(world.x,world.z-CONFIG.spawnRadius)>1.7)return;}
    else{const center=playerCenter(),rect=canvas.getBoundingClientRect(),targetRadiusValue=targetRadius({pointerType:e.pointerType,width:rect.width,height:rect.height});
     if(center&&!hitTarget({x:e.clientX,y:e.clientY,centerX:center.x,centerY:center.y,radius:targetRadiusValue}))return;}
    this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,committed:false,previousAim:{angle:this.angle,power:this.power}};
    try{canvas.setPointerCapture(e.pointerId);}catch{}this.sound('grab');e.preventDefault();});
  const follow=e=>{if(!this.drag||this.drag.id!==e.pointerId)return;
    this.drag.lastX=e.clientX;this.drag.lastY=e.clientY;
    const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y,state=assessPull({dx,dy,everArmed:this.drag.moved,precision:this.precision});
    this.drag.moved=state.armed;this.drag.committed=state.aim&&!state.backToOrigin;this.drag.lastState=state;if(!state.armed)return;
    showIndicator(state,e);
    if(!state.aim)return;
    this.angle=state.aim.angle;this.power=state.aim.power;
    this.$('r9-angle').value=String(Math.round(this.angle*180/Math.PI));this.$('r9-power').value=String(Math.round(this.power*100));
    this.$('r9-angle-out').textContent=Math.round(this.angle*180/Math.PI)+'°';this.$('r9-power-out').textContent=Math.round(this.power*100)+'%';
    this.$('r10-aim-callout').classList.add('is-dragging');this.$('r10-gesture-hint').textContent=this.precision?(experienceText[this.language()]||experienceText.ja).precisionHint:(experienceText[this.language()]||experienceText.ja).release;
    this.aim();e.preventDefault();};
  canvas.addEventListener('pointermove',follow);
  const release=(e,cancelled=false,useLast=false)=>{if(!this.drag||this.drag.id!==e.pointerId)return;
    const pull=this.drag,x=useLast&&Number.isFinite(pull.lastX)?pull.lastX:e.clientX,y=useLast&&Number.isFinite(pull.lastY)?pull.lastY:e.clientY,
      end=assessPull({dx:x-pull.x,dy:y-pull.y,everArmed:pull.moved,precision:this.precision,release:true,pointerCancelled:cancelled&&!pull.committed});
    this.drag=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}clearIndicator();
    this.$('r10-aim-callout').classList.remove('is-dragging');
    if(end.outcome==='cancel'){
      this.angle=pull.previousAim.angle;this.power=pull.previousAim.power;
      this.$('r9-angle').value=String(Math.round(this.angle*180/Math.PI));this.$('r9-power').value=String(Math.round(this.power*100));
      this.$('r9-angle-out').textContent=Math.round(this.angle*180/Math.PI)+'°';this.$('r9-power-out').textContent=Math.round(this.power*100)+'%';this.aim();return;
    }
    if(end.outcome==='fire')this.fire();else this.setInputMode(this.precision,false);
  };
  const signal=this.windowAbort?.signal;
  canvas.addEventListener('pointerup',e=>release(e));canvas.addEventListener('pointercancel',e=>release(e,true,true));
  canvas.addEventListener('lostpointercapture',e=>{if(this.drag?.id===e.pointerId)release(e,false,true);});
  window.addEventListener('pointerup',e=>release(e),{capture:true,signal});
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.buttons===0&&this.drag?.id===e.pointerId)release(e);else follow(e);},{capture:true,signal});
  canvas.addEventListener('keydown',e=>{if(this.match?.action)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){this.angle=clamp(this.angle+(e.key==='ArrowRight'?1:-1)*Math.PI/60,-Math.PI*80/180,Math.PI*80/180);this.$('r9-angle').value=String(Math.round(this.angle*180/Math.PI));this.$('r9-angle-out').textContent=Math.round(this.angle*180/Math.PI)+'°';this.aim();}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){this.power=clamp(this.power+(e.key==='ArrowUp'?.05:-.05),.15,1);this.$('r9-power').value=String(Math.round(this.power*100));this.$('r9-power-out').textContent=Math.round(this.power*100)+'%';this.aim();}
    if(e.key==='Enter'||e.key===' ')this.fire();});
 }

 aim(){if(this.view&&!this.match?.action)this.view.aim(this.angle,this.power,true,0);if(this.$)this.syncAimUI();}
 sound(type='hit',strength=1){if(this.presentation){this.presentation.sound(type==='grab'?'tap':type,clamp(strength/2,0,1));return;}if(document.querySelector('#sound-toggle')?.getAttribute('aria-pressed')!=='true')return;try{this.audio??=new (window.AudioContext||window.webkitAudioContext)();if(this.audio.state==='suspended')void this.audio.resume();
    const c=this.audio,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type==='hit'?'triangle':'sine';o.frequency.setValueAtTime(type==='launch'?240:type==='win'?620:type==='grab'?330:140+Math.min(300,strength*80),t);
    o.frequency.exponentialRampToValueAtTime(type==='launch'?90:type==='win'?930:85,t+(type==='win'?.25:.11));g.gain.setValueAtTime(Math.min(.09,type==='hit'?.025*strength:.055),t);g.gain.exponentialRampToValueAtTime(.001,t+(type==='win'?.29:.13));o.connect(g).connect(c.destination);o.start(t);o.stop(t+(type==='win'?.3:.14));
  }catch{/* audio is optional and never blocks game */}}
 effectPoint(position){const host=this.$('r9-canvas')?.parentElement||this.fallback?.parentElement,rect=host?.getBoundingClientRect();const w=rect?.width||400,h=rect?.height||420;if(!position||!this.view?.camera)return{x:w/2,y:h*.5};try{const v=new THREE.Vector3(position.x,position.y,position.z).project(this.view.camera);return{x:clamp((v.x+1)*w/2,12,w-12),y:clamp((1-v.y)*h/2,12,h-12)};}catch{return{x:w/2,y:h*.5}}}
 impact(hit){if(!this.visible||this.paused||this.finished)return;
  const v=hit.damage||[0,0],total=(v[0]||0)+(v[1]||0);if(total<=0)return;
  const now=performance.now(),level=this.r13?.fx||'standard',critical=Boolean(hit.critical);
  // Persistent feedback stays in the visual director. DOM overlays are strictly throttled.
  this.presentation?.spawn(hit,this.effectPoint(hit.position));
  const decision=feedbackDecision({now,lastVisual:this.lastImpactAt,critical,intensity:Math.min(1,total/20),level});
  if(!decision.visual)return;this.lastImpactAt=now;this.impactCount++;
  const box=this.$('r10-impact');box.classList.remove('is-visible');
  this.$('r10-impact-title').textContent=critical?'CRITICAL HIT!':'HIT!';
  this.$('r10-impact-p').textContent=v[0]?`PLAYER −${v[0]} HP`:'';
  this.$('r10-impact-e').textContent=v[1]?`RIVAL −${v[1]} HP`:'';
  const shell=root.querySelector('.r9-shell');shell?.setAttribute('data-last-impact',critical?'critical':'normal');
  const veil=this.$('r11-hit-veil');veil.classList.remove('is-hitting','is-critical');
  if(level!=='quiet'){void veil.offsetWidth;veil.classList.add('is-hitting');if(critical)veil.classList.add('is-critical');}
  if(level!=='quiet'){this.$('r9-pglyph')?.classList.toggle('r11-damaged',Boolean(v[0]));this.$('r9-eglyph')?.classList.toggle('r11-damaged',Boolean(v[1]));}
  if(level!=='quiet'||critical){void box.offsetWidth;box.classList.add('is-visible');}
  clearTimeout(this.hitTimer);
  this.hitTimer=setTimeout(()=>{box.classList.remove('is-visible');veil.classList.remove('is-hitting','is-critical');this.$('r9-pglyph')?.classList.remove('r11-damaged');this.$('r9-eglyph')?.classList.remove('r11-damaged');},critical?470:260);
 }
 fire(){if(!this.match||this.match.action||this.finished)return;try{this.match.launch({angle:this.angle,power:this.power,spinDirection:this.dir});this.$('r9-controls').querySelectorAll('input,#r9-spin,#r9-fire').forEach(x=>x.disabled=true);this.$('r10-dash').disabled=false;
    this.$('r9-status').textContent=(experienceText[this.language()]||experienceText.ja).battle;this.phase('battle');this.$('r9-pause').disabled=false;this.updateDashUI();this.sound('launch');
  }catch(error){this.$('r9-status').textContent=error.message;}}
 togglePause(){if(!this.match?.action||this.finished)return;this.paused=!this.paused;this.exitArmed=false;this.last=0;this.$('r9-pause').textContent=this.paused?'▶':'Ⅱ';
  this.$('r9-pause').setAttribute('aria-label',this.paused?this.t.resume:this.t.pause);
  this.$('r10-pause-overlay').hidden=!this.paused;this.$('r10-dash').disabled=this.paused||!this.match?.canDash().ok;this.$('r10-pause-title').textContent=(experienceText[this.language()]||experienceText.ja).pauseTitle;
  this.$('r10-pause-hint').textContent=(experienceText[this.language()]||experienceText.ja).pauseHint;const pauseCopy=pauseActionsCopy(this.language());this.$('r18-exit').textContent=pauseCopy.exit;this.$('r18-pause-warning').textContent=pauseCopy.exitWarning;
  this.phase(this.paused?'paused':'battle');if(this.paused)this.$('r10-resume').focus();else this.$('r9-canvas')?.focus({preventScroll:true});}
 dash(heading=null){if(this.paused||!this.match?.action||this.finished)return false;
  const result=this.match.dash(heading??this.dashHeading);
  if(!result.ok){this.updateDashUI();return false;}
  this.dashHeading=null;this.sound('dash',1.4);const pulse=this.$('r10-dash-pulse');pulse.classList.remove('is-active');void pulse.offsetWidth;pulse.classList.add('is-active');
  try{this.view?.boost({index:0,position:{...this.match.native.battle.tops[0].body.translation()}});}catch{}
  this.updateDashUI();return true;
 }
 updateDashUI(){const button=this.$('r10-dash');if(!button||!this.match?.action||this.finished)return;
  const available=this.match.canDash();const remaining=available.framesRemaining||Math.max(0,DASH_COOLDOWN_FRAMES-(this.match.frames-this.match.lastDashFrame));
  const state=dashStatusView({locale:this.language(),phase:this.paused?'paused':'battle',canDash:available,remainingFrames:remaining});
  button.disabled=this.paused||!state.enabled;this.$('r10-dash-timer').textContent=available.ok?'READY':available.reason==='cooldown'?`${(remaining/60).toFixed(1)}s`:available.reason==='low-spin'?'LOW SPIN':available.reason==='speed'?'WAIT':'—';
  const notice=this.$('r18-dash-feedback');if(notice&&notice.textContent!==state.label)notice.textContent=state.label;
  if(notice)notice.dataset.state=state.key;
 }
 updateHud(){if(!this.match)return;const s=this.match.snapshot();for(let i=0;i<2;i++){const prefix=i?'e':'p',hp=s.hp[i],max=this.match.stats[i].maxHp,spin=s.tops[i].initialOmega?clamp(s.tops[i].spin/s.tops[i].initialOmega,0,1):1;this.$(`r9-${prefix}-hp`).style.width=clamp(hp/max,0,1)*100+'%';this.$(`r9-${prefix}-hp-value`).textContent=`${hp}/${max}`;this.$(`r9-${prefix}-spin`).style.width=(spin*100).toFixed(1)+'%';this.$(`r9-${prefix}-spin-value`).textContent=Math.round(spin*100)+'%';}this.$('r9-time').textContent=s.time.toFixed(1).padStart(4,'0');const shell=root.querySelector('.r9-shell');if(shell)shell.dataset.danger=s.hp[0]/this.match.stats[0].maxHp<.25?'player':s.hp[1]/this.match.stats[1].maxHp<.25?'rival':'none';
  const status=healthStatusView({locale:this.language(),playerHp:s.hp[0],playerMaxHp:this.match.stats[0].maxHp,rivalHp:s.hp[1],rivalMaxHp:this.match.stats[1].maxHp});
  if(this.healthState!==status.key){this.healthState=status.key;const node=this.$('r18-health-feedback');if(node){node.dataset.state=status.key;node.textContent=status.key==='ok'?'':status.label;}}
 }
 frame(now){if(!this.visible||!this.match)return;this.raf=requestAnimationFrame(t=>this.frame(t));if(document.hidden){this.last=0;return;}const rawMs=this.last?now-this.last:0,dt=Math.min(.08,rawMs/1000);this.last=now;
  if(rawMs&&this.match.action&&!this.finished&&!this.paused&&this.view){const change=this.qualityControl?.observe(rawMs,now);if(change){this.quality=change;this.applyQuality();}}
  if(this.match.action&&!this.finished&&!this.paused){
   if(this.settling){
    const battle=this.match.native.battle;
    battle.advanceAftermath(dt);this.settleElapsed+=dt;this.updateHud();
    const clock=this.$('r9-time');if(clock)clock.textContent=(battle.time+(battle.aftermathTime||0)).toFixed(1).padStart(4,'0');
    const delay=battle.result?.reason==='場外'?CONFIG.ringOutResultDelay:CONFIG.resultDelay;
    if(this.settleElapsed>=delay)this.finish();
   }else{
    this.acc+=dt;let count=0;while(this.acc>=1/60&&!this.finished&&!this.match.finished&&count++<6){const events=this.match.stepFixed();this.acc-=1/60;for(const e of events){if(this.view)this.view.hit(e);this.impact(e);}}if(count>6)this.acc=0;if(this.match.finished)this.beginSettle();this.updateHud();this.updateDashUI();
   }
  }
  const fps=QUALITY_PRESETS[this.quality].renderFPS;if(renderDue(now,this.lastDrawAt,fps)||this.finished||this.settling){this.lastDrawAt=now;if(this.view)this.view.draw(this.match.native.battle,1,dt,!this.match.action);else this.drawFallback();}
  if(!this.paused)this.presentation?.tick(dt);
 }
 drawFallback(){const canvas=this.fallback,c=this.ctx;if(!canvas||!c||!this.match)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(rect.width*dpr)),h=Math.max(1,Math.floor(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.clearRect(0,0,w,h);c.fillStyle='#dce7e9';c.fillRect(0,0,w,h);const scale=Math.min(w,h)/15;c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.beginPath();c.arc(0,0,6.5,0,Math.PI*2);c.fillStyle='#f9faf6';c.fill();c.strokeStyle='#526d7f';c.lineWidth=.1;c.stroke();const snap=this.match.snapshot();snap.tops.forEach((top,i)=>{c.save();c.translate(top.position.x,-top.position.z);c.beginPath();c.arc(0,0,.63,0,Math.PI*2);c.fillStyle=i===0?'#3876c8':'#bd563d';c.fill();c.font='bold .7px sans-serif';c.fillStyle='white';c.textAlign='center';c.textBaseline='middle';c.fillText(top.glyph,0,0);c.restore();});c.restore();}
 beginSettle(){if(this.settling||this.finished)return;this.phase('settling');this.$('r10-dash').disabled=true;this.settling=true;this.settleElapsed=0;try{this.view?.finish(this.match.native.battle);}catch{}}
 finish(){if(this.finished)return;this.finished=true;this.paused=false;this.phase('result');this.$('r10-pause-overlay').hidden=true;this.updateHud();const s=this.match.snapshot(),t=this.t,type=s.result.winner===null?'draw':s.result.winner===0?'win':'loss';this.trace=this.match.exportTrace();const previousProgress=this.save?.progress||{};let outcome;
  try{outcome=commitArcadeResult(this.save,{levelId:this.level.id,trace:this.trace,action:this.match.action,glyph:this.payload.player.char,font:this.payload.player.fontId});this.save=outcome.save;document.dispatchEvent(new CustomEvent('moji:r9-native-progress',{detail:{saveStatus:outcome.status,progress:outcome.save.progress}}));}
  catch(error){outcome={status:'memory-only',evaluation:{cleared:false,stars:0},error:String(error)};}
  setStoryDocumentMeta(({ja:'文字ブレードのバトル結果',zh:'Moji Blade文字对战结算',en:'Moji Blade battle results',ko:'문자 블레이드 배틀 결과'}[this.language()]),({ja:'文字ブレードの戦闘結果。勝敗、クリア条件、星、残りHP、Dash、接触イベントと保存状況を確認できます。',zh:'查看文字对战胜负、通关目标、星级、剩余HP、Dash、碰撞事件与保存状态。',en:'Review Moji Blade battle outcome, objectives, stars, remaining HP, Dash, contact events and save status.',ko:'문자 블레이드 배틀 결과에서 승패, 목표, 별, 남은 HP, Dash, 접촉 이벤트와 저장 상태를 확인하세요.'}[this.language()]));
  const panel=this.$('r9-result');panel.hidden=false;const cleared=outcome.evaluation?.cleared,stars=outcome.evaluation?.stars||0,reason=reasonNames[this.language()]?.[s.result.reason]||s.result.reason;
  const nextLevel=LEVEL_ORDER[LEVEL_ORDER.indexOf(this.level.id)+1],canNext=outcome.status==='saved'&&cleared&&Boolean(nextLevel);this.presentation?.finish(this.effectPoint(),{victory:type==='win'});
  const report=buildStoryReport({levelId:this.level.id,trace:this.trace,action:this.match.action,evaluation:outcome.evaluation,previousProgress,saveStatus:outcome.status,locale:this.language(),glyph:this.payload.player.char,font:this.payload.player.fontId});
  const journal=outcome.status==='saved'?writeBattleJournal(report.journalEntry):{status:'unavailable'};
  const recent=readBattleJournal();
  panel.innerHTML=`<div class="r9-result-content r19-result-content" data-outcome="${type}">${storyResultHTML(report,{reason,journalStatus:journal.status,recent})}<div class="r9-result-actions"><button type="button" class="r8-cta" id="r9-again">${t.retry}</button>${canNext?`<button type="button" class="r8-cta" id="r9-next">${t.next}</button>`:''}<button type="button" class="r8-second" id="r9-stages">${t.stages}</button><details class="r11-battle-details"><summary>${this.language()==='zh'?'导出战斗记录':this.language()==='ja'?'対戦記録を出力':this.language()==='ko'?'대전 기록 내보내기':'Export battle trace'}</summary><button type="button" class="r8-second" id="r9-export">${t.export}</button></details></div></div>`;
  this.$('r9-again').onclick=()=>{const key=this.token,payload=this.payload;this.$('r9-again').disabled=true;root.querySelector('.r9-shell')?.classList.add('is-restarting');const animation=resultMotion({type,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});setTimeout(()=>{if(this.visible&&this.token===key)this.open(payload);},Math.min(180,animation.transitionMs));};if(canNext)this.$('r9-next').onclick=()=>this.close(true,true,nextLevel);this.$('r9-stages').onclick=()=>this.close(true,true);this.$('r9-export').onclick=()=>this.exportTrace();this.$('r9-controls').hidden=true;this.$('r9-status').textContent=t[type];this.$('r10-dash').disabled=true;this.$('r9-again').focus({preventScroll:true});
 }
 exportTrace(){if(!this.trace)return;const blob=new Blob([JSON.stringify(this.trace,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`moji-r10-arcade-local-${this.level.id}.json`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 close(restore=true,stages=false,nextLevel=null){this.windowAbort?.abort();this.windowAbort=null;this.exitArmed=false;clearTimeout(this.hitTimer);clearTimeout(this.introTimer);if(this.escapeHandler){document.removeEventListener('keydown',this.escapeHandler,true);this.escapeHandler=null;}if(this.gameKeys){document.removeEventListener('keydown',this.gameKeys);this.gameKeys=null;}cancelAnimationFrame(this.raf);this.raf=0;this.visible=false;this.token=null;this.presentation?.dispose();this.presentation=null;this.match?.dispose();this.match=null;this.drag=null;if(this.view){try{this.view.renderer?.dispose();this.view.observer?.disconnect();}catch{}this.view=null;}this.fallback=null;this.ctx=null;root.hidden=true;root.replaceChildren();if(this.previousDocumentTitle){setStoryDocumentMeta(this.previousDocumentTitle,this.previousMetaDescription);this.previousDocumentTitle=null;this.previousMetaDescription='';}if(restore)this.prevFocus?.focus?.({preventScroll:true});if(stages)document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:'stages',mode:'story',levelId:nextLevel}}));}
}
const story=new NativeStoryScreen();const prior=window.MojiBladeV3Bridge;
window.MojiBladeV3Bridge={...prior,launchStage:payload=>payload?.mode==='story'?story.open(payload):prior?.launchStage?.(payload),getState:()=>({...prior?.getState?.(),nativeHpVisible:story.visible,nativeHpRuleset:ARCADE_RULESET})};
