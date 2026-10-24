// @ts-nocheck
import { DrawingEditor } from '../../packages/drawing/src/editor.js';
import { saveFighter, listFighters, saveDraft, loadDraft, migrateLegacy, blobToImage } from '../../packages/drawing/src/storage.js';
import { makeTexture, analyze, shapeFeatures, drawingHash } from '../../packages/fighter-analyzer/src/legacy-analyzer.js';
import { BALANCE_VERSION, statsFromShape, createMatch, stepMatch, TICK_RATE, createCpu, scorePveMatch } from '../../packages/game-core/src/index.ts';
import { Battle3DRenderer } from '../../packages/render3d/src/renderer.js';
import { CHAPTERS, LEVELS, getLevel, nextLevel } from '../../packages/campaign/src/levels.js';
import { loadProgress, storeProgress, isUnlocked, applyResult, emptyProgress } from '../../packages/campaign/src/progress.js';
import { createLevelCpu, bossCue } from '../../packages/campaign/src/cpu.js';
import { attackUi, impactView, impactPosition } from '../../packages/campaign/src/feedback.js';
import { GameAudio } from '../../packages/campaign/src/audio.js';
import { createSourceFight } from './source-fight.js';

export function mountStudio(root=document){
const ac=new AbortController();const signal=ac.signal;
const $=id=>root.querySelector('#'+id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const palette=['#27364e','#e45548','#f08a24','#f2c75c','#3aa556','#2f7fd8','#f28cb8','#ffffff'];
const screens=['draw','preview','stage','battle','result'];
let screen='draw', analysis=null, fighter=null, portrait=null, spriteBounds=null, enemySprite=null;
let match=null, cpu=null, simT=0, frameLast=0, loopId=0, paused=false, currentLevel='1-1';
let sourceFight=null, attackWasDown=false, fightElapsed=0, roundSeconds=90, sourceClosed=false;
const safeStorage={getItem:k=>{try{return window.localStorage.getItem(k);}catch{return null;}},setItem:(k,v)=>{try{window.localStorage.setItem(k,v);}catch{throw Error('Storage unavailable');}}};
let campaignProgress=loadProgress(safeStorage);
const audio=new GameAudio(safeStorage);
let lastBossPhase=null;
let record=null, currentSound=null;
const impactTimers=new Set();let impactSerial=0;let lastAdvice='';
let renderer3d=null, rendererMode='2d', lastRenderTime=0;
let finisherUntil=0, feedbackShake=0;
const debugGPU=new URL(location.href).searchParams.get('debug')==='gpu';
const reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const enemyAnalysisCache=new Map();
function clearImpacts(){finisherUntil=0;feedbackShake=0;$('knockoutBanner').hidden=true;for(const timer of impactTimers)clearTimeout(timer);impactTimers.clear();$('impactLayer').replaceChildren();$('combatToast').textContent='';combatFlashT=0;}
function spawnImpact(ev){
  const fx=impactView(ev);if(!fx)return;
  const layer=$('impactLayer');const label=document.createElement('span');
  label.className=`ink-impact ink-impact--${fx.tone}`;
  label.textContent=fx.text;
  const anchor=impactPosition(ev,match,rendererMode);
  label.style.left=anchor.left+'%';
  label.style.top=(anchor.top+(impactSerial++%3)*3)+'%';
  layer.appendChild(label);
  while(layer.children.length>6)layer.firstElementChild.remove();
  const timer=setTimeout(()=>{label.remove();impactTimers.delete(timer);},840);impactTimers.add(timer);
}
function updateAttackFeedback(){
  if(sourceFight?.player){
    const f=sourceFight.player;
    const advice=!f?'':f.stam<28?'スタミナ不足！ 少し待って回復しよう':f.cool>0||f.stun>0?'いまは攻撃できない！ スキを待とう':'J / スペースで攻撃、K / Shiftでガード';
    if(advice!==lastAdvice){$('battleAdvice').textContent=advice;lastAdvice=advice;}
    $('attackBtn').classList.remove('charging','heavy-ready');
    const label=$('attackBtn').querySelector('small');if(label)label.textContent='ATTACK';
    return;
  }
  if(!match)return;
  const f=match.p1,c=attackUi(f);const cmd=playerCommand();
  const charging=cmd.attackHeld&&f.chargeTicks>0&&!paused;
  $('attackBtn').classList.toggle('charging',charging);
  $('attackBtn').classList.toggle('heavy-ready',charging&&c.heavy);
  $('attackBtn').style.setProperty('--charge',`${Math.round(c.charge*100)}%`);
  $('attackBtn').setAttribute('aria-label',charging?(c.heavy?'強打の準備完了。離すと攻撃':'長押しで強打をためている'):'攻撃。短押しは弱攻撃、長押しは強打');
  $('attackBtn').querySelector('small').textContent=charging?(c.heavy?'RELEASE!':'HOLD…'):'ATTACK';
  const advice=c.hint;
  if(advice!==lastAdvice){$('battleAdvice').textContent=advice;lastAdvice=advice;}
  $('playerStaminaShell').classList.toggle('low-stamina',c.insufficient);
}
function updateBossTelegraph(){
  const cue=bossCue(getLevel(currentLevel),match?.tick||0);
  const visible=cue&&['warning','rush','rest'].includes(cue.phase);
  $('bossTelegraph').hidden=!visible;
  if(!visible){lastBossPhase=cue?.phase||null;return;}
  const alert=$('bossTelegraph');alert.dataset.phase=cue.phase;
  $('bossText').textContent=cue.label;
  const pct=Math.max(0,Math.min(100,100*cue.remainingTicks/cue.durationTicks));
  $('bossPhaseFill').style.width=pct.toFixed(2)+'%';
  $('bossPhaseSeconds').textContent=(cue.remainingTicks/TICK_RATE).toFixed(1)+'s';
  if(cue.phase==='warning'&&lastBossPhase!==cue.phase)audio.play('boss');
  lastBossPhase=cue.phase;
}
function release3d(){
  if(renderer3d){try{renderer3d.dispose();}catch(e){console.warn('3D release:',e);}renderer3d=null;}
}
function rendererFallback(why){
  console.warn('3D unavailable; recovering 2D canvas:',why);
  rendererMode='2d';$('battleGL').hidden=true;$('battleCanvas').hidden=false;
  release3d();
  message('renderStatus','2D モード：'+why);
}

function prepare3d(level){
  if(url.searchParams.get('render')==='2d'){rendererFallback('テスト指定');return;}
  try{
    release3d();
    renderer3d=new Battle3DRenderer($('battleGL'),{onUnavailable:rendererFallback,reducedMotion});
    const enemyKey=level.id;
    if(!enemyAnalysisCache.has(enemyKey)){const tex=makeTexture(enemySprite.image);const data=analyze(tex);if(!data)throw Error('CPU の骨格生成に失敗しました');enemyAnalysisCache.set(enemyKey,data);}
    renderer3d.setArenaTheme(level.arena);
    renderer3d.setFighters([analysis,enemyAnalysisCache.get(enemyKey)]);
    rendererMode='3d';$('battleGL').hidden=false;$('battleCanvas').hidden=true;
    message('renderStatus','3D ノートアリーナ · WebGL2');
  }catch(e){rendererFallback(e?.message||'WebGL 非対応');}
}
const userInput={x:0,z:0,attack:false,guard:false};
const keyHeld=new Set();
const keyArmed=new Set();
const gameCodes=new Set(['Space','ArrowLeft','ArrowUp','ArrowDown','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','ShiftLeft','ShiftRight']);
function eventCode(e){
  if(gameCodes.has(e.code))return e.code;
  const key=e.key;
  if(key==='j'||key==='J')return 'KeyJ';
  if(key==='k'||key==='K')return 'KeyK';
  if(key===' ')return 'Space';
  if(key==='w'||key==='W')return 'KeyW';
  if(key==='a'||key==='A')return 'KeyA';
  if(key==='s'||key==='S')return 'KeyS';
  if(key==='d'||key==='D')return 'KeyD';
  if(key==='Shift')return e.location===2?'ShiftRight':'ShiftLeft';
  if(key==='ArrowLeft'||key==='ArrowRight'||key==='ArrowUp'||key==='ArrowDown')return key;
  return '';
}
function held(code){return keyHeld.has(code)||keyArmed.has(code);}
function syncHeldButtons(){
  $('attackBtn')?.classList.toggle('pressed',userInput.attack||held('KeyJ')||held('Space'));
  $('guardBtn')?.classList.toggle('pressed',userInput.guard||held('KeyK')||held('ShiftLeft')||held('ShiftRight'));
}
const editor=new DrawingEditor($('drawCanvas'), updateDrawControls);
function show(target){if(screen==='battle'&&target!=='battle'){release3d();clearImpacts();}screen=target;for(const x of screens){const node=$(x+'Screen');node.classList.toggle('active',x===target);}window.scrollTo({top:0,behavior:'instant'});}
function message(id,text){$(id).textContent=text;}
function updateDrawControls(){
  $('birthBtn').disabled=!editor.hasInk;$('mobileBirthBtn').disabled=!editor.hasInk;
  $('undoBtn').disabled=editor.undoStack.length===0;$('mobileUndo').disabled=editor.undoStack.length===0;
  $('redoBtn').disabled=editor.redoStack.length===0;$('mobileRedo').disabled=editor.redoStack.length===0;
  $('strokeStatus').textContent=editor.hasInk?'ステキなラクガキだね！':'じゆうに かいてね！';
  for(const b of root.querySelectorAll('[data-tool]')){const active=b.dataset.tool===editor.tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  for(const b of root.querySelectorAll('.swatch')){const active=b.dataset.color===editor.color;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
}
for(const hex of palette){const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.color=hex;b.setAttribute('aria-label','色 '+hex);b.style.setProperty('--color',hex);b.addEventListener('click',()=>editor.setColor(hex));$('swatches').appendChild(b);const c=b.cloneNode(true);c.addEventListener('click',()=>editor.setColor(hex));$('mobileSwatches').appendChild(c);}
for(const b of root.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>editor.setTool(b.dataset.tool));
$('undoBtn').addEventListener('click',()=>editor.undo());$('redoBtn').addEventListener('click',()=>editor.redo());$('mobileUndo').addEventListener('click',()=>editor.undo());$('mobileRedo').addEventListener('click',()=>editor.redo());
$('clearBtn').addEventListener('click',()=>{if(editor.hasInk&&confirm('今の絵をぜんぶ消しますか？（もどすで復元できます）'))editor.clear();});
$('brushWidth').addEventListener('input',e=>{editor.setWidth(+e.target.value);$('brushValue').textContent=e.target.value;});
$('imageInput').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{await editor.importFile(file,{removeWhite:$('removeWhite').checked});message('drawNotice','画像を読みこみました。');}catch(error){message('drawNotice',error.message);}});
$('saveDraftBtn').addEventListener('click',async()=>{try{await saveDraft(await editor.toPng());message('drawNotice','下書きをこの端末に保存しました。');}catch{message('drawNotice','保存できませんでした。ブラウザの保存設定を確認してください。');}});
const libraryDialog=$('libraryDialog');
let libraryUrls=[];
$('openLibraryBtn').addEventListener('click',async()=>{
 const grid=$('localLibraryGrid');grid.textContent='読み込み中…';
 libraryDialog.showModal();
 try{
  const saved=await listFighters();grid.replaceChildren();
  if(!saved.length){grid.textContent='まだキャラがいません。プレビュー画面から保存できます。';return;}
  for(const item of saved){
    const url=URL.createObjectURL(item.png instanceof Blob?item.png:new Blob([item.png],{type:'image/png'}));libraryUrls.push(url);
    const pick=document.createElement('button');pick.className='library-pick';const im=document.createElement('img');im.src=url;im.alt='';const title=document.createElement('span');title.textContent=item.name||'ラクガキ';
    pick.append(im,title);pick.addEventListener('click',async()=>{try{const image=await blobToImage(item.png instanceof Blob?item.png:new Blob([item.png],{type:'image/png'}));editor.loadImageElement(image);libraryDialog.close();message('drawNotice','保存したキャラを開きました。');}catch{message('drawNotice','この絵を開けませんでした。');}});grid.appendChild(pick);
  }
 }catch(error){grid.textContent='保存したキャラの読み込みに失敗しました。';}
});
function closeLibrary(){if(libraryDialog.open)libraryDialog.close();}
$('libraryClose').addEventListener('click',closeLibrary);
libraryDialog.addEventListener('close',()=>{for(const u of libraryUrls)URL.revokeObjectURL(u);libraryUrls=[];});
function drawDemo(){const c=editor.ctx;c.save();c.strokeStyle='#27364e';c.lineWidth=25;c.lineJoin=c.lineCap='round';c.fillStyle='#8ed1db';
  c.beginPath();c.ellipse(510,460,235,260,-.07,0,Math.PI*2);c.fill();c.stroke();
  c.beginPath();c.moveTo(350,320);c.lineTo(335,165);c.lineTo(475,240);c.moveTo(610,260);c.lineTo(690,160);c.lineTo(730,340);c.stroke();
  c.beginPath();c.moveTo(320,535);c.lineTo(205,605);c.moveTo(705,540);c.lineTo(830,510);c.moveTo(420,705);c.lineTo(360,850);c.moveTo(585,710);c.lineTo(670,850);c.stroke();
  c.fillStyle='#27364e';c.beginPath();c.ellipse(430,450,18,29,0,0,Math.PI*2);c.ellipse(585,450,18,29,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(510,540,38,0,Math.PI);c.stroke();c.restore();
  editor.checkInk();updateDrawControls();}
// Browser URL ?demo=1 is a genuine editable sample, not a pretend completed stage.
const url=new URL(location.href);if(url.searchParams.get('demo')==='1'){drawDemo();message('drawNotice','おためしキャラを用意したよ！自由に描きなおせるよ。');}
function imageBounds(canvas){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(canvas,0,0,128,128);const d=x.getImageData(0,0,128,128).data;let minX=128,minY=128,maxX=0,maxY=0,n=0;for(let y=0;y<128;y++)for(let z=0;z<128;z++){if(d[(y*128+z)*4+3]>60){n++;minX=Math.min(minX,z);minY=Math.min(minY,y);maxX=Math.max(maxX,z);maxY=Math.max(maxY,y);}}if(!n)return {sx:0,sy:0,sw:canvas.width,sh:canvas.height};const padding=8,minXP=Math.max(0,minX-padding),minYP=Math.max(0,minY-padding),maxXP=Math.min(127,maxX+padding),maxYP=Math.min(127,maxY+padding);return {sx:minXP/128*canvas.width,sy:minYP/128*canvas.height,sw:(maxXP-minXP+1)/128*canvas.width,sh:(maxYP-minYP+1)/128*canvas.height};}
async function createFighter(){
  if(!editor.hasInk)return;
  $('birthBtn').disabled=true;$('mobileBirthBtn').disabled=true;message('drawNotice','キャラクターを分析しています…');
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,20)));
  try{
    // Original Zhang-Suen + marching squares + skeletal extrusion; main-thread R1 extraction.
    const texture=makeTexture(editor.canvas);
    const data=analyze(texture);
    if(!data||!data.joints?.length)throw Error('この絵からキャラを作れませんでした。少し大きく描いてみてね。');
    if(analysis?.tex){analysis.tex.width=0;analysis.tex.height=0;}
    analysis=data;portrait=editor.canvas;spriteBounds=imageBounds(portrait);
    const features=shapeFeatures(portrait,data), stats=statsFromShape(features);
    const hash=await drawingHash(portrait);
    fighter={id:'local-'+hash.slice(0,20),revision:1,analyzerVersion:'legacy-r1-extracted',balanceVersion:BALANCE_VERSION,stats,appearanceAssetId:'local'};
    updatePreviewStats(stats,features);show('preview');
  }catch(error){message('drawNotice',error.message||'解析に失敗しました');console.error(error);}
  finally{$('birthBtn').disabled=!editor.hasInk;$('mobileBirthBtn').disabled=!editor.hasInk;}
}
$('birthBtn').addEventListener('click',createFighter);$('mobileBirthBtn').addEventListener('click',createFighter);
function updatePreviewStats(stats,features){
  $('shapeType').textContent=features.mass>.66?'どっしりタイプ':features.limbReach>.65?'リーチタイプ':features.slenderness>.55?'すばやいタイプ':'バランスタイプ';
  const items=[['たいりょく',stats.maxHp/120,stats.maxHp],['パワー',stats.power/1.2,stats.power],['スピード',stats.speed/1.2,stats.speed],['リーチ',stats.reach/.85,stats.reach]];
  $('statList').replaceChildren(...items.map(([name,value,num])=>{
    const row=document.createElement('div');row.className='stat-row';const a=document.createElement('span');a.textContent=name;
    const track=document.createElement('div');track.className='stat-track';const fill=document.createElement('div');fill.className='stat-fill';fill.style.width=clamp(value*100,5,100)+'%';track.appendChild(fill);
    const v=document.createElement('span');v.className='stat-value';v.textContent=String(num);row.append(a,track,v);return row;
  }));
}
$('backToDraw').addEventListener('click',()=>show('draw'));
$('saveFighterBtn').addEventListener('click',async()=>{try{const png=await editor.toPng();await saveFighter({id:fighter.id,revision:fighter.revision,name:$('fighterName').value.trim().slice(0,32)||'マイキャラ',png,stats:fighter.stats,source:'v2',updatedAt:Date.now()});message('previewNotice','この端末に保存しました。');}catch(error){message('previewNotice','端末への保存に失敗しました。');console.error(error);}});
function renderPreview(now){const c=$('previewCanvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(!portrait)return;
  ctx.save();ctx.translate(290,443+(reducedMotion?0:Math.sin(now/360)*6));ctx.rotate(reducedMotion?0:Math.sin(now/750)*.045);
  drawSprite(ctx,portrait,spriteBounds,0,0,320,330,false,1);
  ctx.restore();
  if($('bonesToggle').checked&&analysis){
    const joints=analysis.joints, xs=joints.map(j=>j.x),ys=joints.map(j=>j.y);
    const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
    const sc=Math.min(320/(xmax-xmin+.6),330/(ymax-ymin+.6));
    const to=j=>({x:290+(j.x-(xmin+xmax)/2)*sc,y:443-(j.y-ymin)*sc});
    ctx.save();ctx.strokeStyle='#e45548';ctx.fillStyle='#27364e';ctx.lineWidth=2;
    for(let i=1;i<joints.length;i++){const a=joints[joints[i].par],p=joints[i];if(!a)continue;const u=to(a),v=to(p);ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);ctx.stroke();}
    for(const j of joints){const p=to(j);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
}
// Source canvas crop gives large, legible sprites independently of canvas whitespace.
function drawSprite(ctx,img,bounds,cx,foot,w,h,flip=false,opacity=1){
  ctx.save();ctx.globalAlpha=opacity;ctx.translate(cx,foot);if(flip)ctx.scale(-1,1);
  const b=bounds||{sx:0,sy:0,sw:img.width,sh:img.height};
  const scale=Math.min(w/b.sw,h/b.sh);const dw=b.sw*scale,dh=b.sh*scale;
  ctx.drawImage(img,b.sx,b.sy,b.sw,b.sh,-dw/2,-dh,dw,dh);ctx.restore();
}
function cpuSprite(level){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.lineJoin=x.lineCap='round';x.lineWidth=13;x.strokeStyle='#27364e';x.fillStyle=level.color;
  const a=level.avatar;
  x.beginPath();
  if(['spiky','star','guardian','king'].includes(a)){
    const rays=a==='star'?5:a==='king'?8:10;
    for(let i=0;i<rays*2;i++){const rad=i%2?130:190,angle=-Math.PI/2+i*Math.PI/rays;const xx=256+Math.cos(angle)*rad,yy=250+Math.sin(angle)*rad;i?x.lineTo(xx,yy):x.moveTo(xx,yy);}x.closePath();
  }else if(a==='ghost'){
    x.moveTo(125,390);x.lineTo(125,222);x.arc(256,222,132,Math.PI,0);x.lineTo(388,390);
    for(let i=0;i<4;i++){const xx=388-i*64;x.quadraticCurveTo(xx-15,450,xx-32,390);x.quadraticCurveTo(xx-49,365,xx-64,390);}x.closePath();
  }else if(a==='robot'){if(typeof x.roundRect==='function')x.roundRect(155,108,202,262,27);else x.rect(155,108,202,262);}
  else if(a==='longarms'){x.ellipse(256,250,112,151,0,0,2*Math.PI);}
  else if(a==='octopus'){x.ellipse(256,210,155,126,0,0,2*Math.PI);}
  else{x.ellipse(256,243,a==='rabbit'?120:151,a==='rabbit'?157:164,0,0,2*Math.PI);}
  x.fill();x.stroke();
  if(a==='cat'||a==='rabbit'){
    x.beginPath();x.moveTo(165,146);x.lineTo(a==='rabbit'?153:128,a==='rabbit'?32:68);x.lineTo(245,115);
    x.moveTo(278,116);x.lineTo(a==='rabbit'?356:381,a==='rabbit'?28:68);x.lineTo(360,154);x.stroke();
  }
  if(a==='king'){x.fillStyle='#f2c75c';x.beginPath();x.moveTo(155,125);x.lineTo(183,30);x.lineTo(238,104);x.lineTo(273,19);x.lineTo(315,104);x.lineTo(373,35);x.lineTo(386,142);x.closePath();x.fill();x.stroke();}
  x.beginPath();
  if(a==='octopus'){
    for(let i=0;i<7;i++){const q=117+i*46,t=40+i*74;x.moveTo(q,314);x.bezierCurveTo(q-70,350,t-60,410,t,460);}
  }else if(a==='longarms'){x.moveTo(165,235);x.lineTo(47,198);x.lineTo(15,356);x.moveTo(347,235);x.lineTo(473,174);x.lineTo(493,353);x.moveTo(219,362);x.lineTo(190,462);x.moveTo(294,362);x.lineTo(318,462);}
  else{x.moveTo(153,319);x.lineTo(94,395);x.moveTo(357,319);x.lineTo(422,395);x.moveTo(207,366);x.lineTo(178,464);x.moveTo(309,366);x.lineTo(342,464);}
  x.stroke();x.fillStyle='#27364e';
  for(const ex of [210,304]){x.beginPath();x.ellipse(ex,223,a==='ghost'?18:12,18,0,0,Math.PI*2);x.fill();}
  x.beginPath();x.moveTo(214,284);x.quadraticCurveTo(255,321,303,284);x.stroke();
  return {image:c,bounds:imageBounds(c)};
}
const thumbnailCache=new Map();
function thumbnailOf(level){
  if(thumbnailCache.has(level.id))return thumbnailCache.get(level.id);
  const sprite=cpuSprite(level),c=document.createElement('canvas');c.width=c.height=144;
  const g=c.getContext('2d');const b=sprite.bounds;
  const scale=Math.min(123/b.sw,130/b.sh),w=b.sw*scale,h=b.sh*scale;
  g.drawImage(sprite.image,b.sx,b.sy,b.sw,b.sh,(144-w)/2,137-h,w,h);
  const src=c.toDataURL('image/png');sprite.image.width=sprite.image.height=0;
  thumbnailCache.set(level.id,src);return src;
}
function stagePortrait(level){const img=document.createElement('img');img.src=thumbnailOf(level);img.alt='';img.decoding='async';return img;}
function selectStage(id){
  if(!getLevel(id))return;
  currentLevel=id;const lv=getLevel(id),unlocked=isUnlocked(campaignProgress,id);
  $('detailChapter').textContent=`CHAPTER ${lv.chapter} / ${lv.id}`;
  $('detailBadge').textContent=lv.boss?'BOSS BATTLE':'STAGE';
  $('stageDoodle').replaceChildren(stagePortrait(lv));$('stageDoodle').style.color=lv.color;
  $('detailName').textContent=lv.name;$('detailSubtitle').textContent=lv.description;
  $('detailStyle').textContent=lv.boss?'★ BOSS · '+lv.style.toUpperCase():lv.style.toUpperCase();
  $('detailStars').textContent='★'.repeat(campaignProgress.records[id]?.stars||0)+'☆'.repeat(3-(campaignProgress.records[id]?.stars||0));
  $('detailTip').textContent=lv.tip;
  $('selectLevelBtn').disabled=!unlocked;
  $('selectLevelBtn').textContent=!unlocked?'🔒 まず前のステージをクリア':fighter?'⚔ このステージに ちょうせん！ →':'✎ キャラを描いて ちょうせん！ →';
  $('stageStatus').textContent=unlocked?'':'先に '+lv.predecessor+' をクリアすると開きます。';
  $('selectedStageSummary').textContent=lv.id+' · '+lv.name+(lv.boss?' ★ BOSS':'');
  for(const button of root.querySelectorAll('.stage-tile')){const selected=button.dataset.level===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
}
function renderCampaign(){
  const root=$('chapterGroups');root.replaceChildren();
  for(const chapter of CHAPTERS){
    const area=document.createElement('section');area.className='chapter-block';area.style.setProperty('--chapter-accent',chapter.accent);
    const head=document.createElement('div');head.className='chapter-heading';
    const title=document.createElement('h2');const chapterTag=document.createElement('span');chapterTag.className='chapter-number';chapterTag.textContent=`CH.${chapter.id}`;title.append(chapterTag,document.createTextNode(chapter.title));
    const sub=document.createElement('small');sub.textContent=chapter.subtitle;head.append(title,sub);area.append(head);
    const grid=document.createElement('div');grid.className='stage-grid';
    for(const level of LEVELS.filter(l=>l.chapter===chapter.id)){
      const unlocked=isUnlocked(campaignProgress,level.id),saved=campaignProgress.records[level.id];
      const btn=document.createElement('button');btn.type='button';btn.className='stage-tile'+(level.boss?' boss':'')+(unlocked?'':' locked');btn.dataset.level=level.id;
      btn.setAttribute('aria-label',`${level.id} ${level.name}, ${!unlocked?'ロック中':saved?'クリア済み':'挑戦可能'}`);
      const id=document.createElement('span');id.className='stage-id';id.textContent=level.id+(level.boss?' ★':'');
      const icon=document.createElement('span');icon.className='stage-icon';if(unlocked){icon.append(stagePortrait(level));}else icon.textContent='🔒';
      const name=document.createElement('strong');name.textContent=level.name;
      const stars=document.createElement('span');stars.className='stage-stars';stars.textContent=unlocked?'★'.repeat(saved?.stars||0)+'☆'.repeat(3-(saved?.stars||0)):'LOCK';
      btn.append(id,icon,name,stars);btn.addEventListener('click',()=>{audio.play('tap');selectStage(level.id);});grid.append(btn);
    }
    area.append(grid);root.append(area);
  }
  selectStage(getLevel(currentLevel)?currentLevel:'1-1');
}
function openCampaign(){renderCampaign();show('stage');}
$('openStagesBtn').addEventListener('click',openCampaign);
$('stageBackBtn').addEventListener('click',()=>show(fighter?'preview':'draw'));
$('selectLevelBtn').addEventListener('click',()=>{
  if(!isUnlocked(campaignProgress,currentLevel))return;
  audio.play('tap');if(!fighter){show('draw');message('drawNotice','キャラを描いて「いのちをふきこむ」を押してね。');}
  else beginFight();
});
const enterStages=new URL(location.href).searchParams.get('screen')==='stages';
if(enterStages)openCampaign();
function neutral(){return {moveX:0,moveZ:0,attackHeld:false,guardHeld:false};}

function resetInput(){keyHeld.clear();keyArmed.clear();userInput.x=userInput.z=0;userInput.attack=userInput.guard=false;stickId=null;$('attackBtn').classList.remove('pressed');$('guardBtn').classList.remove('pressed');$('stickKnob').style.transform='';}
function playerCommand(){if(paused)return neutral();const x=(held('KeyD')||held('ArrowRight')?1:0)-(held('KeyA')||held('ArrowLeft')?1:0)+userInput.x;
  const z=(held('KeyS')||held('ArrowDown')?1:0)-(held('KeyW')||held('ArrowUp')?1:0)+userInput.z;
  const mag=Math.max(1,Math.hypot(x,z));return {moveX:x/mag,moveZ:z/mag,attackHeld:userInput.attack||held('KeyJ')||held('Space'),guardHeld:userInput.guard||held('KeyK')||held('ShiftLeft')||held('ShiftRight')};}
function setControls(id,field){const element=$(id);element.addEventListener('pointerdown',e=>{e.preventDefault();if(paused||screen!=='battle')return;element.setPointerCapture(e.pointerId);userInput[field]=true;element.classList.add('pressed');});for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,()=>{userInput[field]=false;element.classList.remove('pressed');});}
setControls('attackBtn','attack');setControls('guardBtn','guard');
const stick=$('mobileStick');let stickId=null;
function updateStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),radius=r.width*.32,mag=Math.max(radius,Math.hypot(dx,dy));userInput.x=dx/mag;userInput.z=dy/mag;$('stickKnob').style.transform=`translate(${userInput.x*radius}px,${userInput.z*radius}px)`;}
stick.addEventListener('pointerdown',e=>{if(paused||screen!=='battle'||stickId!==null)return;stickId=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);});
stick.addEventListener('pointermove',e=>{if(stickId===e.pointerId)updateStick(e);});
for(const evt of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(evt,e=>{if(stickId===e.pointerId){stickId=null;userInput.x=userInput.z=0;$('stickKnob').style.transform='';}});
window.addEventListener('keydown',e=>{
  const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target?.isContentEditable;
  if(screen!=='battle'){
    if(typing){if(e.key==='Escape')e.target.blur();return;}
    if(screen==='draw'){if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();if(e.shiftKey)editor.redo();else editor.undo();return;}if(e.code==='KeyB')editor.setTool('pen');if(e.code==='KeyG')editor.setTool('fill');if(e.code==='KeyE')editor.setTool('eraser');}
    return;
  }
  if(e.key==='Escape'&&!e.repeat){e.preventDefault();if(!finisherUntil)setPaused(!paused);return;}
  const code=eventCode(e);if(!gameCodes.has(code))return;
  e.preventDefault();
  if(typing&&document.activeElement instanceof HTMLElement)document.activeElement.blur();
  if(paused||e.repeat)return;
  keyHeld.add(code);syncHeldButtons();
}, {signal,capture:true});
window.addEventListener('keyup',e=>{
  const code=eventCode(e);if(!code)return;
  if(keyHeld.has(code)){keyHeld.delete(code);keyArmed.add(code);}
  if(screen==='battle')syncHeldButtons();
}, {signal,capture:true});
window.addEventListener('blur',()=>{if(document.hasFocus())return;resetInput();if(screen==='battle'&&match?.phase==='playing')setPaused(true);}, {signal});document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='battle'&&match?.phase==='playing'){resetInput();setPaused(true);}}, {signal});
function setPaused(value){paused=value;$('pausePanel').hidden=!value;$('pauseBtn').textContent=value?'▶ つづける':'Ⅱ ポーズ (Esc)';resetInput();frameLast=performance.now();simT=0;}
$('pauseBtn').addEventListener('click',()=>{if(!finisherUntil)setPaused(!paused);});$('resumeBtn').addEventListener('click',()=>setPaused(false));$('quitFightBtn').addEventListener('click',()=>{setPaused(false);match=null;show('preview');});
function beginFight(){
  if(!fighter)return;
  const level=getLevel(currentLevel);if(!level||!isUnlocked(campaignProgress,currentLevel)){
    openCampaign();return;
  }
  const rival={id:'cpu-'+level.id,revision:1,analyzerVersion:'campaign-r3',balanceVersion:BALANCE_VERSION,stats:statsFromShape(level.features)};
  enemySprite=cpuSprite(level);
  if(!enemyAnalysisCache.has(level.id)){
    const tex=makeTexture(enemySprite.image);const data=analyze(tex);
    if(!data){message('renderStatus','相手の絵を立体にできませんでした');return;}
    enemyAnalysisCache.set(level.id,data);
  }
  if(!analysis){message('renderStatus','自分の絵がまだありません');return;}
  $('battleCanvas').hidden=true;
  if(!sourceFight){
    const old=$('battleGL'),canvas=document.createElement('canvas');
    canvas.id='battleGL';old.replaceWith(canvas);
    sourceFight=createSourceFight(canvas,$('impactLayer'));
  }
  $('battleGL').hidden=false;
  sourceFight.begin(analysis,enemyAnalysisCache.get(level.id),fighter.stats,rival.stats,level.style);
  fightElapsed=0;attackWasDown=false;sourceClosed=false;roundSeconds=level.seconds;
  match={phase:'playing',winner:null,tick:0,maxTicks:Math.round(level.seconds*TICK_RATE),p1:{hp:fighter.stats.maxHp,stamina:100,definition:fighter,attack:null,guardHeld:false},p2:{hp:rival.stats.maxHp,stamina:100,definition:rival,attack:null,guardHeld:false}};
  message('renderStatus','ソース版ノートアリーナ');
  $('playerHudName').textContent=$('fighterName').value.trim()||'ぼくのラクガキ';
  $('enemyHudName').textContent=level.name;
  $('battleHeading').textContent=level.name;
  $('battleStageBadge').textContent=level.id+' / '+(level.boss?'BOSS':'BATTLE');
  lastBossPhase=null;$('bossTelegraph').hidden=true;clearImpacts();lastAdvice='';
  resetInput();paused=false;$('pausePanel').hidden=true;simT=0;frameLast=performance.now();if(document.activeElement instanceof HTMLElement)document.activeElement.blur();show('battle');updateHud();audio.play('tap');
}
$('fightStartBtn').addEventListener('click',beginFight);
function updateHud(){
  if(sourceFight?.player&&match){
    const p=sourceFight.player,e=sourceFight.enemy;
    $('pHp').style.width=clamp(p.hp/p.hpMax*100,0,100)+'%';
    $('eHp').style.width=clamp(e.hp/e.hpMax*100,0,100)+'%';
    $('pStam').style.width=clamp(p.stam,0,100)+'%';
    $('eStam').style.width=clamp(e.stam,0,100)+'%';
    const sec=Math.max(0,Math.ceil(roundSeconds-fightElapsed));
    $('battleClock').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    return;
  }
  if(!match)return;const p=match.p1,e=match.p2;$('pHp').style.width=clamp(p.hp/p.definition.stats.maxHp*100,0,100)+'%';$('eHp').style.width=clamp(e.hp/e.definition.stats.maxHp*100,0,100)+'%';$('pStam').style.width=clamp(p.stamina,0,100)+'%';$('eStam').style.width=clamp(e.stamina,0,100)+'%';const sec=Math.ceil((match.maxTicks-match.tick)/TICK_RATE);$('battleClock').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}
let combatFlashT=0;
function onEvents(events){for(const ev of events){spawnImpact(ev);if(ev.type==='attack_started')audio.play('attack');if(ev.type==='hit'){audio.play('hit');if(!reducedMotion)feedbackShake=Math.max(feedbackShake,.085);}if(ev.type==='blocked')audio.play('block');if(ev.type==='perfect_guard')audio.play('perfect');if(ev.type==='guard_break'){audio.play('break');if(!reducedMotion)feedbackShake=Math.max(feedbackShake,.12);}if(rendererMode==='3d')renderer3d?.markEvent(ev,match);if(['perfect_guard','guard_break'].includes(ev.type)){$('combatToast').textContent=ev.type==='perfect_guard'?'ジャストガード！':'ガードブレイク！';combatFlashT=.6;}}}
function renderBattle(now){const c=$('battleCanvas'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);
  const arenaId=getLevel(currentLevel)?.arena;
  const paper=arenaId==='ink-palace'?'#ede7f3':arenaId==='colored-note'?'#fff0d6':'#f7f5e8';
  const inkgrid=arenaId==='ink-palace'?'#d7cee8':arenaId==='colored-note'?'#ebd0a9':'#d1e0e3';
  ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);ctx.strokeStyle=inkgrid;ctx.lineWidth=1;
  for(let x=0;x<w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=0;y<h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.fillStyle=arenaId==='ink-palace'?'#d3c8e0':arenaId==='colored-note'?'#e5d3a9':'#e7e3d7';ctx.strokeStyle='#27364e';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(w/2,440,420,78,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#aebac2';ctx.lineWidth=2;ctx.setLineDash([12,12]);ctx.beginPath();ctx.ellipse(w/2,440,357,48,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(!match)return;
  ctx.save();if(feedbackShake>0.001){ctx.translate(Math.sin(now*.089)*feedbackShake*65,Math.cos(now*.119)*feedbackShake*32);}
  const place=f=>({x:w/2+(f.x-f.z)*125,y:413+f.z*10+f.x*5});
  for(const [f,img,b,flip] of [[match.p1,portrait,spriteBounds,false],[match.p2,enemySprite?.image,enemySprite?.bounds,true]]){
    if(!img)continue;const p=place(f);ctx.fillStyle='#728a9850';ctx.beginPath();ctx.ellipse(p.x,p.y+6,62,13,0,0,Math.PI*2);ctx.fill();
    const atk=f.attack?.age||0,attackOffset=atk>7&&atk<20?Math.sin((atk-7)/13*Math.PI)*26:0;
    ctx.save();ctx.translate(p.x+(flip?-attackOffset:attackOffset),p.y+(reducedMotion?0:Math.sin(now/240+(flip?1:0))*2));if(f.attack&&!reducedMotion)ctx.rotate((flip?-1:1)*Math.sin(Math.PI*clamp(atk/28,0,1))*.08);
    drawSprite(ctx,img,b,0,0,205,245,flip,f.hp<=0?.65:1);ctx.restore();
    if(f.guardHeld){ctx.beginPath();ctx.strokeStyle=flip?'#e45548':'#4a99aa';ctx.lineWidth=6;ctx.arc(p.x,p.y-112,115,-1.1,1.1);ctx.stroke();}
  }
  ctx.restore();ctx.fillStyle='#27364e';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('NOTEBOOK ARENA / PRACTICE',w/2,h-23);
}
function beginFinisher(now){
  if(finisherUntil)return;
  finisherUntil=now+800;
  const label=match?.tick>=match?.maxTicks?'TIME UP!':'K.O.!';
  $('knockoutBanner').textContent=label;$('knockoutBanner').hidden=false;
  $('bossTelegraph').hidden=true;
  resetInput();if(!reducedMotion)feedbackShake=Math.max(feedbackShake,.22);
}
function endFight(){
  if(!match)return;
  const level=getLevel(currentLevel);
  const result=scorePveMatch(match,'p1',{levelId:currentLevel,parTicks:level.parTicks});record=result;
  const won=match.winner==='p1';
  const previouslyUnlocked=new Set(LEVELS.filter(l=>isUnlocked(campaignProgress,l.id)).map(l=>l.id));
  let persisted=false;
  try{
    campaignProgress=applyResult(campaignProgress,result);
    persisted=storeProgress(safeStorage,campaignProgress);
    if(!persisted)console.warn('Local progress could not be written');
  }catch(error){console.warn('Failed to store result',error);}
  $('resultSaveNotice').textContent=persisted?'星とスコアをこの端末に保存しました。':'この端末へ記録を保存できませんでした。設定を確認してください。';
  const upcoming=nextLevel(currentLevel),newUnlock=won&&upcoming&&!previouslyUnlocked.has(upcoming.id)&&isUnlocked(campaignProgress,upcoming.id);
  $('resultBadge').textContent=won?'やった！ WIN!':match.winner==='draw'?'DRAW!':'ざんねん… LOSE!';
  $('resultBadge').classList.toggle('lose',!won);
  $('resultSummary').textContent=won?`${level.id} ${level.name} クリア！${newUnlock?' 次のステージが開いたよ！':''}`:'もういちど、ちょうせんしてみよう！';
  $('resultRecord').textContent=`${result.stars?'★'.repeat(result.stars)+'☆'.repeat(3-result.stars):'☆☆☆'}　${result.score} 点　${(match.tick/TICK_RATE).toFixed(1)} 秒`;
  $('resultFighter').src=editor.canvas.toDataURL('image/png');
  $('nextStageBtn').hidden=!(won&&upcoming&&isUnlocked(campaignProgress,upcoming.id));
  $('nextStageBtn').dataset.next=upcoming?.id||'';
  audio.play(won?'win':'lose');resetInput();match=null;show('result');
}
$('rematchBtn').addEventListener('click',beginFight);
$('nextStageBtn').addEventListener('click',()=>{const id=$('nextStageBtn').dataset.next;if(id&&isUnlocked(campaignProgress,id)){currentLevel=id;beginFight();}});
$('resultStagesBtn').addEventListener('click',openCampaign);
$('soundBtn').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);updateSoundBtn();audio.play('tap');});
function updateSoundBtn(){$('soundBtn').textContent=audio.enabled?'♪ ON':'♪ OFF';$('soundBtn').setAttribute('aria-pressed',String(audio.enabled));}
updateSoundBtn();$('resultPreviewBtn').addEventListener('click',()=>show('preview'));
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());$('helpClose').addEventListener('click',()=>$('helpDialog').close());
function syncSourceInput(){
  sourceFight.keys.ArrowRight=held('ArrowRight')||held('KeyD');
  sourceFight.keys.ArrowLeft=held('ArrowLeft')||held('KeyA');
  sourceFight.keys.ArrowUp=held('ArrowUp')||held('KeyW');
  sourceFight.keys.ArrowDown=held('ArrowDown')||held('KeyS');
  sourceFight.keys.Shift=held('ShiftLeft')||held('ShiftRight')||held('KeyK');
  sourceFight.defHeld=userInput.guard;
  sourceFight.jx=userInput.x;sourceFight.jy=userInput.z;
  const attackDown=userInput.attack||held('KeyJ')||held('Space');
  if(attackDown&&!attackWasDown)sourceFight.attack();
  attackWasDown=attackDown;
}
function finishFromSource(){
  if(sourceClosed||!sourceFight?.player||!match)return;
  sourceClosed=true;
  const p=sourceFight.player,e=sourceFight.enemy;
  match.phase='finished';
  match.winner=p.hp>0&&e.hp<=0?'p1':e.hp>0&&p.hp<=0?'p2':'draw';
  match.tick=Math.min(match.maxTicks,Math.max(1,Math.round(fightElapsed*TICK_RATE)));
  match.p1.hp=Math.max(0,p.hp);match.p1.definition=fighter;
  endFight();
}
function frame(now){loopId=requestAnimationFrame(frame);if(screen==='preview'){renderPreview(now);return;}if(screen!=='battle')return;
  if(sourceFight&&!sourceClosed&&(sourceFight.state==='intro'||sourceFight.state==='fight'||sourceFight.state==='ending'||sourceFight.state==='over')){
    if(frameLast===0)frameLast=now;const dt=Math.min((now-frameLast)/1000,.05);frameLast=now;
    if(!paused&&sourceFight.state==='fight'){fightElapsed+=dt;if(fightElapsed>=roundSeconds)sourceFight.timeUp();syncSourceInput();}
    else if(!paused)syncSourceInput();
    try{sourceFight.frame(paused?0:dt);sourceFight.resize();}catch(error){console.error(error);message('renderStatus','立体表示に失敗しました');}
    keyArmed.clear();syncHeldButtons();updateAttackFeedback();updateHud();
    if(sourceFight.state==='ending'&&!finisherUntil)beginFinisher(now);
    if(sourceFight.state==='over')finishFromSource();
    return;
  }
  if(!match){return;}
  if(match.phase==='finished'&&finisherUntil&&now>=finisherUntil){endFight();return;}
  if(frameLast===0)frameLast=now;let dt=Math.min((now-frameLast)/1000,.05);frameLast=now;
  if(!paused&&match.phase==='playing'){
    simT+=dt;let n=0;while(simT>=1/TICK_RATE&&n<6){simT-=1/TICK_RATE;n++;const p1=playerCommand(),p2=cpu.decide(match);const ev=stepMatch(match,p1,p2);if(ev.events.length)onEvents(ev.events);if(match.phase==='finished'){updateHud();beginFinisher(now);break;}}
    keyArmed.clear();syncHeldButtons();}
  if(!finisherUntil){updateBossTelegraph();updateAttackFeedback();}feedbackShake*=Math.exp(-dt*8);
  if(rendererMode==='3d'&&renderer3d&&!renderer3d.lost){try{renderer3d.render(match,paused?0:dt,now);if(debugGPU&&renderer3d.frame%60===0){const d=renderer3d.getDiagnostics();message('renderStatus',`WebGL2 GPU-QA · quality ${d.qualityLevel} · ${d.fighters} fighters · ${d.pixelRatio}x`);}}catch(e){rendererFallback(e?.message||'描画エラー');renderBattle(now);}}else renderBattle(now);updateHud();if(combatFlashT>0){combatFlashT-=dt;if(combatFlashT<=0)$('combatToast').textContent='';}
}
loopId=requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{release3d();audio.close();}, {signal});
(async()=>{try{const migrated=await migrateLegacy();if(signal.aborted)return;if(migrated.count)message('drawNotice',`前のバージョンの絵を ${migrated.count} 枚、安全にコピーしました。`);
    const draft=await loadDraft();if(signal.aborted)return;if(draft?.png&&url.searchParams.get('demo')!=='1'){const img=await blobToImage(draft.png);editor.loadImageElement(img);message('drawNotice','保存した下書きを読みこみました。');}
  }catch(error){console.warn('Local storage unavailable',error);message('drawNotice','ストレージが使えません。今の画面では絵を描けますが保存はできません。');}
})();

return ()=>{ac.abort();cancelAnimationFrame(loopId);release3d();try{sourceFight?.destroy();}catch{}sourceFight=null;try{audio.close();}catch{}};
}
