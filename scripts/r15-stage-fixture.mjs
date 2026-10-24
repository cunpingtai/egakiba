/** Generates UI-only stage selector fixtures from the actual R15 stages() renderer.
 * Does not start the 3D physics engine or prove real browser navigation.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {getStoryBoard,STORY_CHAPTERS} from '../engine/r15-stage-board.mjs';
import {R10_SAVE_KEY} from '../engine/r10-arcade-save.mjs';
const root=new URL('../',import.meta.url);
const load=(file)=>readFileSync(new URL(file,root),'utf8');
const flow=load('r2-flow.js');
const body=flow.slice(flow.indexOf('function stages(){'),flow.indexOf('function glyph(){'));
const encode=x=>JSON.stringify(x).replaceAll('<','\\u003c');
const states={
  progress:{'01-01':{stars:3,bestSeconds:13.2},'01-02':{stars:2,bestSeconds:16.4}},
  fresh:{},
  complete:{'01-01':{stars:3,bestSeconds:11},'01-02':{stars:3,bestSeconds:13},'01-03':{stars:2,bestSeconds:15},'01-04':{stars:1,bestSeconds:21}},
};
const titles={ja:{stage:'ステージ選択',stageBrief:'クリア条件を確認して、文字を選んで挑戦しよう。',rival:'相手',chapter:'章'},zh:{stage:'关卡选择',stageBrief:'查看任务目标，选择文字开始挑战。',rival:'对手',chapter:'章节'},en:{stage:'Stage Select',stageBrief:'Review the mission, then choose your glyph and battle.',rival:'Rival',chapter:'Chapter'},ko:{stage:'스테이지 선택',stageBrief:'미션을 확인하고 글자를 선택해 도전하세요.',rival:'상대',chapter:'챕터'}};
for(const [state,progress] of Object.entries(states)){
 const storage={getItem(key){if(key!==R10_SAVE_KEY)throw Error(key);return JSON.stringify({schema:1,revision:1,progress,battles:5,lastGlyph:'龍',lastFont:'gothic',updatedAt:null})}};
 for(const lang of ['ja','zh','en','ko']){
  const board=getStoryBoard(storage,lang);
  const css=['styles.css','flow.css','game-experience-r10.css','r15-story.css'].map(load).join('\n');
  const page=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="in-flow"><div class="app-shell"><main class="flow-page"><div class="flow-content" id="flow-content"></div></main></div><script>
  const data=${encode(board)},STORY_CHAPTERS=${encode(STORY_CHAPTERS)},lang=${encode(lang)},labels=${encode(titles)};
  const model={selectedLevel:data.nextSelectableId,glyph:'龍',chapter:0};
  const locale=()=>lang,t=(key)=>labels[lang][key]||key,storyCopy=()=>data.copy;
  const getStoryBoard=()=>data,selectStoryStage=(board,id)=>board.stages.some(s=>s.id===id&&s.selectable)?id:board.nextSelectableId;
  const escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  ${body}
  const stageRoot=document.querySelector('#flow-content');const render=()=>stageRoot.innerHTML=stages();render();
  stageRoot.addEventListener('click',event=>{const tile=event.target.closest('[data-level]');if(tile){const b=getStoryBoard();if(b.stages.some(s=>s.id===tile.dataset.level&&s.selectable)){model.selectedLevel=tile.dataset.level;render();}}
  const button=event.target.closest('[data-stage-start]');if(button)document.body.dataset.launched=button.dataset.stageStart;});
  </script></body></html>`;
  writeFileSync(new URL(`../assets/r15-fixture-${state}-${lang}.html`,import.meta.url),page);
 }
}
console.log('generated 12 page fixtures from actual stage renderer');
