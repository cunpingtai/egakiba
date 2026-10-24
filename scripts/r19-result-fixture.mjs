/** R19 screenshot fixtures: reuse the actual R18 story & classic DOM template and R19 report renderer.
 * Fixed sample data; no claim that WebGL simulation ran in this fixture.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {buildStoryReport,storyResultHTML,classicResultHTML} from '../engine/r19-result-report.mjs';
import {LEVEL_CATALOG,evaluateLevelResult} from '../engine/level-catalog.mjs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const css=['r3-battle.css','game-experience-r10.css','r18-battle.css','r19-result.css'].map(src).join('\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const story=src('r9-story-screen.mjs'),classic=src('r8-classic-screen.mjs');
const markup=(s,end)=>{const a=s.indexOf('root.innerHTML=`'),b=s.indexOf(end,a);if(a<0||b<0)throw Error('Template extraction failed');return s.slice(a+16,b);};
const makeStory=new Function('t','level','payload','escape','getStageMission','missions','return `'+markup(story,'`;\n  this.$=')+'`;');
const makeClassic=new Function('payload','escape','CLASSIC_V2_PHYSICS','return `'+markup(classic,'`;\n    root.querySelector')+'`;');
for(const [locale,winner] of [['zh',0],['en',0],['ja',1],['ko',0]]){
 const t={heading:'MOJI BLADE',back:'Back',mission:'Mission',spin:'Spin',left:'Left',right:'Right',angle:'Angle',power:'Power',fire:'Launch',pause:'Pause',resume:'Resume',loading:'Loading',noRank:'Local practice'};
 const mock={language:()=>locale,title:()=>locale==='zh'?'初次试炼':'First Trial',r13:{quality:'high',fx:'standard',audio:.5,haptics:false}};
 const body=makeStory.call(mock,t,{id:'01-04',enemy:'剣'},{player:{char:'龍'}},esc,()=>({main:'Defeat boss 剣'}),{});
 const trace={result:{winner,reason:'場外'},frames:650,hp:[63,0],stats:[{maxHp:100}],events:Array.from({length:12},()=>({type:'contact'})),arcadeActions:[{frame:10,heading:0},{frame:250,heading:.3}],rulesetVersion:'arena-hp-rapier-r10-dash-local-v1'};
 const action={power:.8,angle:.25,spinDirection:1};const evaluation=evaluateLevelResult(LEVEL_CATALOG['01-04'],{winner,hp:trace.hp,playerMaxHp:100,durationSeconds:trace.frames/60},action);
 const report=buildStoryReport({levelId:'01-04',trace,action,evaluation,previousProgress:{'01-04':{stars:1,bestSeconds:15.3}},saveStatus:'saved',locale,glyph:'龍',font:'mincho'});
 const result=storyResultHTML(report,{reason:locale==='zh'?'出界':'Ring out',journalStatus:'saved',recent:[report.journalEntry]});
 const content=`<div class="r9-result-content r19-result-content" data-outcome="${report.outcome}">${result}<div class="r9-result-actions"><button type="button" class="r8-cta">${locale==='zh'?'再战一次':'Rematch'}</button><button type="button" class="r8-cta">${locale==='zh'?'下一关':'Next stage'}</button><button type="button" class="r8-second">${locale==='zh'?'返回关卡':'Stages'}</button></div></div>`;
 let html=`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{margin:0;min-height:100%;background:#091632;color:white;font-family:system-ui}*,*::before,*::after{box-sizing:border-box}${css}</style></head><body><div id="battle-root">${body}</div><script>const panel=document.getElementById('r9-result');panel.hidden=false;panel.innerHTML=${JSON.stringify(content)};document.querySelector('#r9-controls').hidden=true;document.querySelector('#r9-canvas').style.background='radial-gradient(ellipse at center,#6b88a4,#314d7d 56%,#122448)';</script></body></html>`;
 const file=`r19-result-story-${locale}-${winner===0?'win':'loss'}-fixture.html`;writeFileSync(new URL(`../assets/${file}`,import.meta.url),html);console.log(file);
}
const mock={text:{title:'Classic',back:'Back',time:'Battle time',angle:'Aim',power:'Power',spin:'Spin',left:'Left',fire:'Launch',load:'Loading',classic:'V2 Classic'}};
const body=makeClassic.call(mock,{player:{char:'文'},opponent:{char:'剣'}},esc,'classic-v2');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#091632;color:white;font-family:system-ui}*,*::before,*::after{box-sizing:border-box}${css}</style></head><body><div id="battle-root" class="r8-shell">${body}</div><script>const panel=document.getElementById('r8-result');panel.hidden=false;panel.innerHTML=${JSON.stringify(classicResultHTML({locale:'en',type:'win',duration:13.2,reason:'Ring out',contactEvents:18})+'<div class="r9-result-actions"><button class="r8-cta">Rematch</button><button class="r8-second">Back</button></div>')};document.querySelector('#r8-canvas').style.background='radial-gradient(ellipse at center,#6b88a4,#314d7d 56%,#122448)';</script></body></html>`;
writeFileSync(new URL('../assets/r19-result-classic-en-fixture.html',import.meta.url),html);
