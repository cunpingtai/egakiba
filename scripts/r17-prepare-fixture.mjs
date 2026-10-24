/** R17 UI-only fixture from production prepare() markup. No licensed fonts or WebGL. */
import {readFileSync,writeFileSync} from 'node:fs';
const load=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const flow=load('r2-flow.js');
const body=flow.slice(flow.indexOf('function prepare(){'),flow.indexOf('function handoff(){'));
const css=['styles.css','flow.css','game-experience-r10.css','r15-story.css','r16-glyph.css','r17-prepare.css'].map(load).join('\n');
const translations={
 ja:{prepare:'いざ、勝負！',prepBrief:'文字の準備はできた。勝負に出よう！',speed:'スピード',power:'パワー',balance:'バランス',hp:'HP',classic:'ルール',arena:'競技場',viewStage:'ステージを選び直す'},
 zh:{prepare:'决战准备',prepBrief:'双方就位，准备开战！',speed:'速度',power:'力量',balance:'平衡',hp:'血量',classic:'规则',arena:'竞技场',viewStage:'更换关卡'},
 en:{prepare:'Ready for battle',prepBrief:'Both tops are ready.',speed:'Speed',power:'Power',balance:'Balance',hp:'HP',classic:'Rules',arena:'Arena',viewStage:'Change stage'},
 ko:{prepare:'배틀 준비',prepBrief:'양쪽 준비 완료!',speed:'속도',power:'파워',balance:'균형',hp:'HP',classic:'규칙',arena:'경기장',viewStage:'스테이지 선택'}
};
const c={
 ja:{rulesStory:'ARENA HP · HPとSPIN / DASH',rulesQuick:'CLASSIC V2 · HPなし',titleStory:'ステージバトル',titleQuick:'フリーバトル',mission:'ミッション',goalHp:'残りHP 55%以上',unranked:'ローカル練習',checking:'双方の文字と書体を確認中…',opponent:'相手',player:'あなた',rival:'相手の文字',rivalHelp:'一文字だけ入力',stats:'字形から計算した能力',edit:'文字を変える',retry:'もう一度確認',battle:'バトル開始'},
 zh:{rulesStory:'ARENA HP · HP 与 DASH',rulesQuick:'CLASSIC V2 · 无 HP',titleStory:'故事挑战',titleQuick:'自由对战',mission:'关卡目标',goalHp:'剩余HP至少55%',unranked:'本地练习',checking:'正在验证双方文字和字体…',opponent:'对手',player:'你的文字',rival:'对手文字',rivalHelp:'只能输入一个可见文字。',stats:'真实字形属性',edit:'修改文字',retry:'重新验证',battle:'开始战斗'},
 en:{rulesStory:'ARENA HP · HP & DASH',rulesQuick:'CLASSIC V2 · NO HP',titleStory:'Story challenge',titleQuick:'Free battle',mission:'Stage objective',goalHp:'55% HP left',unranked:'Local practice',checking:'Checking both glyphs and fonts…',opponent:'Rival',player:'You',rival:'Rival glyph',rivalHelp:'One visible glyph only.',stats:'Native attributes',edit:'Change glyph',retry:'Check again',battle:'Launch battle'},
 ko:{rulesStory:'ARENA HP · HP와 DASH',rulesQuick:'CLASSIC V2 · HP 없음',titleStory:'스토리',titleQuick:'자유 배틀',mission:'목표',goalHp:'HP 55%',unranked:'로컬',checking:'글자와 글꼴 확인 중…',opponent:'상대',player:'플레이어',rival:'상대 글자',rivalHelp:'한 글자만 입력',stats:'실제 능력치',edit:'글자 변경',retry:'다시 검사',battle:'전투 시작'}
};
for(const [lang,copy] of Object.entries(translations)){
 const quick=['zh','ko'].includes(lang);
 const html=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body class="in-flow"><div class="app-shell"><main class="flow-page" id="flow-page"><div id="flow-content"></div></main></div>
 <script>const model={glyph:'龍',font:'gothic',mode:${JSON.stringify(quick?'quick':'story')},selectedLevel:'01-01',opponent:'字',opponentDraft:null};
 const LEVEL_CATALOG={'01-01':{id:'01-01',enemy:'字',enemyFont:'mincho',arena:'classic'}};
 const pc=()=>(${JSON.stringify(c[lang])}),t=key=>(${JSON.stringify(copy)})[key]||key,locale=()=>${JSON.stringify(lang)};
 const getStageMission=()=>({main:'${lang==='zh'?'击败对手':'Win the battle'}',bonusHp:'HP ≥ 55%',bonusTime:'16s'}),levelName=()=>${JSON.stringify(lang==='en'?'First Launch':'初の発射')};
 const stageMeta=()=>['01-01'],escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 ${body}
 document.querySelector('#flow-content').innerHTML=prepare();
 </script></body></html>`;
 writeFileSync(new URL(`../assets/r17-prepare-fixture-${lang}.html`,import.meta.url),html);
}
console.log('R17 UI fixture pages generated (actual prepare markup).');
