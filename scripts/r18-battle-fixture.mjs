/** R18 visual fixtures using actual native battle screen HTML template, without running Rapier/WebGL. */
import {readFileSync,writeFileSync} from 'node:fs';
import {battlePhaseView,dashStatusView} from '../engine/r18-battle-hud.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const css=['r3-battle.css','game-experience-r10.css','r18-battle.css'].map(read).join('\n');
const story=read('r9-story-screen.mjs'),classic=read('r8-classic-screen.mjs');
function markup(source,end){const a=source.indexOf('root.innerHTML=`');if(a===-1)throw Error('template missing');const b=source.indexOf(end,a);if(b===-1)throw Error('end missing');return source.slice(a+'root.innerHTML=`'.length,b);}
const storyMarkup=markup(story,'`;\n  this.$=');
const classicMarkup=markup(classic,'`;\n    root.querySelector');
const escapes=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const langTexts={ja:{heading:'文字バトル',back:'戻る',mission:'ミッション',spin:'回転方向',left:'左回転',angle:'方向',power:'力',fire:'発射！',pause:'一時停止',resume:'再開',loading:'読み込み中',noRank:'練習バトル'},zh:{heading:'文字竞技场',back:'返回',mission:'任务',spin:'旋转',left:'左旋',angle:'方向',power:'力度',fire:'发射！',pause:'暂停',resume:'继续',loading:'正在加载',noRank:'本地练习'},en:{heading:'Moji Arena',back:'Back',mission:'Mission',spin:'Spin',left:'CCW',angle:'Aim',power:'Power',fire:'Launch!',pause:'Pause',resume:'Resume',loading:'Loading',noRank:'Local match'},ko:{heading:'문자 배틀',back:'뒤로',mission:'목표',spin:'회전',left:'왼쪽',angle:'방향',power:'파워',fire:'발사!',pause:'일시 정지',resume:'재개',loading:'로딩',noRank:'연습 배틀'}};
const makeStory=new Function('t','level','payload','escape','getStageMission','missions','return `'+storyMarkup+'`;');
const makeClassic=new Function('payload','escape','CLASSIC_V2_PHYSICS','return `'+classicMarkup+'`;');
const cases=[
 {mode:'story',locale:'ja',phase:'ready'},
 {mode:'story',locale:'zh',phase:'battle'},
 {mode:'story',locale:'en',phase:'paused'},
 {mode:'classic',locale:'en',phase:'battle'}
];
for(const {mode,locale,phase} of cases){
 const copy=langTexts[locale],phaseInfo=battlePhaseView({locale,phase,mode});
 let content;
 if(mode==='story'){
  const mock={language:()=>locale,title:()=>'First Launch',r13:{quality:'high',fx:'standard',audio:.5,haptics:false}};
  content=makeStory.call(mock,copy,{id:'01-01',enemy:'字'},{player:{char:'龍'}},escapes,()=>({main:locale==='zh'?'战胜对手':'Defeat the rival'}),{});
 }else{
  const mock={text:{title:'Classic · Original Physics',back:'Back',time:'Battle time',angle:'Angle',power:'Power',spin:'Spin',left:'CCW',fire:'Launch!',load:'Loading',classic:'V2 Classic · No HP · Unranked'}};
  content=makeClassic.call(mock,{player:{char:'文'},opponent:{char:'剣'}},escapes,'classic-v2');
 }
 let html=`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{margin:0;min-height:100%;font-family:system-ui;background:#0b1937;color:white}*,*::before,*::after{box-sizing:border-box}${css}</style></head><body><div id="battle-root" ${mode==='classic'?'class="r8-shell"':''}>${content}</div><script>const phase=${JSON.stringify(phaseInfo)};const mode=${JSON.stringify(mode)};const status=${JSON.stringify(dashStatusView({locale,phase,canDash:{reason:'cooldown'},remainingFrames:96}))};
if(mode==='story'){
 const shell=document.querySelector('.r9-shell');shell.dataset.phase=phase.phase;
 for(const [id,val] of Object.entries({'r18-phase-chip':phase.title,'r18-coach-title':phase.title,'r18-coach-detail':phase.detail,'r18-clock-label':phase.clock,'r18-controls-help':phase.help,'r18-dash-feedback':status.label,'r9-p-hp-value':'84/100','r9-e-hp-value':'63/100'})){const node=document.getElementById(id);if(node)node.textContent=val;}
 document.querySelector('#r10-pause-overlay').hidden=phase.phase!=='paused';document.querySelector('#r10-pause-title').textContent=phase.title;document.querySelector('#r10-pause-hint').textContent=phase.detail;document.querySelector('#r18-exit').textContent='Leave stage';document.querySelector('#r18-pause-warning').textContent='Leaving does not save this match';
 document.querySelector('#r10-aim-callout').style.opacity=phase.phase==='ready'?1:0;
 document.querySelector('#r9-canvas').style.background='radial-gradient(ellipse at 50% 66%, #889dcc, #495b99 48%, #22345d 80%)';
 if(phase.phase==='battle'){document.querySelector('#r9-time').textContent='08.4';document.querySelector('#r10-dash').disabled=false;document.querySelector('#r9-fire').disabled=true;}
}else{document.querySelector('#r18-classic-phase').textContent=phase.title;document.querySelector('#r18-classic-hint').textContent=phase.detail;document.querySelector('#r18-classic-pause').disabled=false;document.querySelector('#r8-canvas').style.background='radial-gradient(ellipse at center,#819cc7,#355080,#17294c)';}
</script></body></html>`;
 const name=`r18-${mode}-${phase}-${locale}-fixture.html`;
 writeFileSync(new URL(`../assets/${name}`,import.meta.url),html);
 console.log(name);
}
