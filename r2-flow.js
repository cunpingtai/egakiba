/* R25 content audit: only four verified Story stages are exposed in the UI.
 * Story and VS COM continue to use their existing native battle rules. */
import {GlyphPreview3D} from './preview3d.js';
import {getGlyphGeometry,loadConfiguredGlyphPack,glyphAssetStatus} from './engine/glyph-source-v7.mjs';
import {LEVEL_CATALOG,LEVEL_ORDER,isPlayable,isUnlocked} from './engine/level-catalog.mjs';
import {loadArcadeSave as loadSave} from './engine/r10-arcade-save.mjs';
import {readCampaignSnapshot} from './engine/r14-campaign-progress.mjs';
import {readPlayerProfile,renderPlayerProfile} from './engine/r20-player-profile.mjs';
import {readCollectionView,collectionHTML,collectionCopy,collectionIdentity,filterCollection,toggleFavorite,markDiscovered,nativeStatsHTML} from './engine/r21-glyph-collection.mjs';
import {detailHTML,detailHash,parseDetailHash,measureFontVariants,detailCopy} from './engine/r22-glyph-detail.mjs';
import {labHTML,labCopy,labHash,parseLabHash,validateLabSelection,createLabInspector,inspectLab,DEFAULT_LAB} from './engine/r23-glyph-lab.mjs';
import {rankingHTML,rankGlyphs,createRankingInspector,rankingCopy,DEFAULT_RANKING,normalizeRankingOptions} from './engine/r24-glyph-ranking.mjs';
import {loadClassicLibrary,classicGlyphMetrics} from './engine/classic-v2-adapter.mjs';
import {deriveNativeStats} from './engine/native-hp-rules.mjs';
import {getStoryBoard,selectStoryStage,storyCopy,getStageMission} from './engine/r15-stage-board.mjs';
import {parseGlyphDraft} from './engine/r16-glyph-contract.mjs';
import {resolveBattleDraft,createBattlePreflight,createBattleLaunchLock} from './engine/r17-preflight.mjs';
import {inspectBattlePair} from './engine/r17-native-preflight.mjs';
const $=s=>document.querySelector(s);
const escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grapheme=s=>[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(s||'')][0]?.segment||'';
const LEVELS=[
 ['01-01','はじめての発射','First Launch','初次发射','첫 발사','字','launch','classic'],
 ['01-02','力のコントロール','Power Control','力度训练','힘 조절','力','power','classic'],
 ['01-03','角度のひみつ','Angle Control','角度的奥秘','각도의 비밀','山','angle','classic'],
 ['01-04','第一の試練','The First Trial','初次试炼','첫 시련','剣','boss','classic']
];
const M={
 ja:{home:'ホーム',mode:'モード',stage:'ステージ',glyph:'文字を選ぶ',prepare:'いざ、勝負！',chooseMode:'文字ブレードの遊び方',chapter:'章',level:'ステージ',next:'つぎへ',back:'戻る',set:'選択',selected:'決定！',launch:'バトル開始！',preview:'3D文字プレビュー',type:'キミの一文字',font:'書体',speed:'スピード',power:'パワー',hp:'HP',balance:'バランス',glyphStatsBrief:'速度・パワー・バランスは原本の字形データから算出します。未対応の文字は数値を表示しません。',metricLabel:'原生データから計算',classic:'ルール',stageBrief:'文字ブレードの第1章は4ステージ。発射・パワー・角度の目標を達成し、最後の「剣」に挑もう。',glyphBrief:'文字ブレードで使う漢字・かな・英字を1文字選び、4種類の書体を試そう。対応する文字は原本データで確認します。',prepBrief:'選んだ文字・書体・対戦ルールを確認してから、文字バトルを始めよう。',startError:'対戦を開始できませんでした。文字と書体を再確認して、もう一度お試しください。',chooseModeTitle:'文字ブレードの遊び方を選ぼう',modeStory:'ストーリーステージ',modeQuick:'VS COM フリーバトル',modeBrief:'4つのストーリーステージで操作を練習するか、VS COMで好きな文字と書体を試せます。',modeStoryDesc:'第一章の4ステージで発射、角度、ボス戦を練習。',modeQuickDesc:'好きな漢字・かな・英字と書体を選んで自由に対戦。',storyIntro:'4つのステージで文字バトルの操作を覚えよう。',modeTitle:'対戦モード',continue:'この文字で勝負！',viewStage:'ステージを選び直す',changeGlyph:'文字を変更',rival:'相手の文字',arena:'競技場',goal:'ミッション',first:'はじめから',choose:'この相手に挑む',stageTitle:'文字ブレードのステージ攻略',glyphTitle:'文字ブレードの文字選び',prepareTitle:'文字ブレードの対戦準備'},
 zh:{home:'首页',mode:'玩法',stage:'关卡',glyph:'选择文字',prepare:'决战准备',chooseMode:'文字对战玩法',chapter:'章节',level:'关卡',next:'下一步',back:'返回',set:'选择',selected:'已选择',launch:'开始对战！',preview:'3D文字预览',type:'你的战斗文字',font:'字体',speed:'速度',power:'力量',hp:'HP',balance:'平衡',glyphStatsBrief:'速度、力量和平衡由原始字形数据计算。字体缺失或文字不受支持时，不会显示猜测数值。',metricLabel:'原生字形计算',classic:'规则版本',stageBrief:'文字对战第一章开放4个关卡。完成发射、力度和角度目标，挑战最后的「剣」。',glyphBrief:'选择一个汉字、假名或字母，并尝试4种字体。系统会验证所选字体是否支持该文字。',prepBrief:'开始文字对战前，先确认双方文字、字体和规则。',startError:'无法启动对战。请重新检查文字与字体后再试。',chooseModeTitle:'选择文字对战玩法',modeStory:'故事关卡',modeQuick:'VS COM 自由对战',modeBrief:'通过4个故事关卡练习操作，或在VS COM中测试不同文字与字体。',modeStoryDesc:'在第一章4个关卡练习发射、角度和Boss战。',modeQuickDesc:'选择喜欢的汉字、假名、字母和字体，自由对战。',storyIntro:'通过4个关卡熟悉文字对战操作。',modeTitle:'对战模式',continue:'用这个文字开战',viewStage:'更换关卡',changeGlyph:'修改文字',rival:'对手文字',arena:'竞技场',goal:'关卡目标',first:'重新开始',choose:'挑战这个对手',stageTitle:'文字对战关卡攻略',glyphTitle:'选择对战文字与字体',prepareTitle:'文字对战准备'},
 en:{home:'Home',mode:'Modes',stage:'Stages',glyph:'Choose a glyph',prepare:'Ready for battle',chooseMode:'How to play Moji Blade',chapter:'Chapter',level:'Stage',next:'Next',back:'Back',set:'Select',selected:'Selected',launch:'Start battle',preview:'3D glyph preview',type:'Your battle glyph',font:'Typeface',speed:'Speed',power:'Power',hp:'HP',balance:'Balance',glyphStatsBrief:'Speed, power and balance are derived from original glyph geometry. Unsupported glyphs never receive guessed values.',metricLabel:'Measured from native data',classic:'Rules',stageBrief:'The first Moji Blade chapter has four playable stages. Meet launch, power and angle goals, then face 剣.',glyphBrief:'Choose one kanji, kana, or letter and try four typefaces. Support is checked against the original glyph data.',prepBrief:'Confirm both glyphs, typefaces, and battle rules before starting the match.',startError:'The battle could not start. Check the glyph and typeface, then try again.',chooseModeTitle:'Choose how to play Moji Blade',modeStory:'Story stages',modeQuick:'VS COM free battle',modeBrief:'Practice in four Story stages or test different glyphs and typefaces in VS COM.',modeStoryDesc:'Practice launch control, angle and a boss fight across four stages.',modeQuickDesc:'Choose any supported glyph and typeface for a free battle.',storyIntro:'Learn the controls across four glyph-battle stages.',modeTitle:'Battle modes',continue:'Battle with this glyph',viewStage:'Change stage',changeGlyph:'Change glyph',rival:'Rival glyph',arena:'Arena',goal:'Objective',first:'Start over',choose:'Challenge this rival',stageTitle:'Moji Blade stage guide',glyphTitle:'Choose a Moji Blade glyph',prepareTitle:'Moji Blade battle setup'},
 ko:{home:'홈',mode:'모드',stage:'스테이지',glyph:'글자 선택',prepare:'배틀 준비',chooseMode:'문자 블레이드 플레이 방법',chapter:'챕터',level:'스테이지',next:'다음',back:'뒤로',set:'선택',selected:'선택됨',launch:'배틀 시작',preview:'3D 글자 미리보기',type:'나의 배틀 글자',font:'서체',speed:'속도',power:'파워',hp:'HP',balance:'균형',glyphStatsBrief:'속도·파워·균형은 원본 글자 형태 데이터에서 계산합니다. 지원하지 않는 글자는 추정값을 표시하지 않습니다.',metricLabel:'원본 데이터 계산',classic:'규칙',stageBrief:'첫 번째 챕터의 4개 스테이지를 플레이할 수 있습니다. 발사·파워·각도 목표를 달성하고 마지막 보스 剣에 도전하세요.',glyphBrief:'한자·가나·알파벳 중 한 글자를 선택하고 네 가지 서체를 시험하세요. 지원 여부는 원본 데이터로 확인합니다.',prepBrief:'문자 배틀을 시작하기 전에 글자, 서체, 규칙을 확인하세요.',startError:'배틀을 시작할 수 없습니다. 글자와 서체를 확인한 뒤 다시 시도하세요.',chooseModeTitle:'문자 블레이드 플레이 방식',modeStory:'스토리 스테이지',modeQuick:'VS COM 자유 대전',modeBrief:'4개 스토리 스테이지에서 조작을 익히거나 VS COM에서 글자와 서체를 시험하세요.',modeStoryDesc:'4개 스테이지에서 발사, 각도, 보스전을 연습하세요.',modeQuickDesc:'지원되는 글자와 서체를 골라 자유롭게 대결하세요.',storyIntro:'4개 스테이지에서 글자 배틀 조작을 익히세요.',modeTitle:'배틀 모드',continue:'이 글자로 배틀',viewStage:'스테이지 변경',changeGlyph:'글자 변경',rival:'상대 글자',arena:'경기장',goal:'목표',first:'처음부터',choose:'이 상대에게 도전',stageTitle:'문자 블레이드 스테이지 안내',glyphTitle:'문자 블레이드 글자 선택',prepareTitle:'문자 블레이드 배틀 준비'}
};
const safeRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const v2=safeRead('tsukuruum.moji-blade.v2');
const proto=safeRead('moji-blade.v3.r2.preview');
const initialGlyph=grapheme(proto?.glyph||v2?.character||'文');
const initialFont=['gothic','mincho','pop','gyosho'].includes(proto?.font)?proto.font:'gothic';
const savedProgress=loadSave().save.progress;
const resumeLevel=LEVEL_ORDER.find(id=>isUnlocked(id,savedProgress)&&!savedProgress[id])||(savedProgress['01-04']?'01-04':'01-01');
const profileFilters={stage:'all',outcome:'all'};
const collectionFilters={query:'',category:'all',view:'all',selectedKey:collectionIdentity('文','gothic')};
let collectionInspectRevision=0;
let detailRevision=0;
let detailReturnScreen='collection';
let detailState={glyph:'文',font:'gothic',results:null,loading:false};
const labInspector=createLabInspector(inspectLab);
let labReturnScreen='collection';
let labState={selection:{...DEFAULT_LAB},result:null,loading:false,revision:0,feedback:''};
const rankingInspector=createRankingInspector(rankGlyphs);
let rankingReturnScreen='modes';
let rankingState={options:{...DEFAULT_RANKING},result:null,loading:false,revision:0,feedback:''};
const model={screen:'home',mode:'story',selectedLevel:resumeLevel,glyph:initialGlyph,font:initialFont,opponent:'字',opponentFont:null,opponentDraft:null,chapter:0,preview:null,homePreview:null,lastFocus:null,comparisonGlyph:'剣',comparisonFont:'gothic',glyphDraft:null};
const t=(key)=>M[$('#locale-select')?.value] ? (M[$('#locale-select').value][key]||M.ja[key]||key):(M.ja[key]||key);
const langIndex=()=>({ja:0,en:1,zh:2,ko:3}[$('#locale-select')?.value]??0);
const locale=()=>$('#locale-select')?.value||'ja';
const localPreviewStats=ch=>[null,null,null,null]; // Native stats arrive from r9-story-stats.mjs; never flash inaccurate raster estimates.
function persist(){try{localStorage.setItem('moji-blade.v3.r2.preview',JSON.stringify({glyph:model.glyph,font:model.font}))}catch{ /* preview should work in ephemeral mode */ }}
function showPreviewFallback(canvas,ch){const node=document.createElement('div');node.className='webgl-fallback';const home=canvas.id==='arena-canvas';node.innerHTML=`<div class="fallback-ring"></div><div class="fallback-duel"><span class="fallback-p1">${escapeHtml(ch)}</span>${home?'<span class="fallback-rival">斬</span>':''}</div><small>3D VIEW UNAVAILABLE</small>`;canvas.replaceWith(node);}
function initHome3D(){const canvas=$('#arena-canvas');try{model.homePreview=new GlyphPreview3D(canvas,{glyph:model.glyph,font:model.font});}catch(error){showPreviewFallback(canvas,model.glyph);console.warn('R2 WebGL fallback',error.message);}}
function initFlow3D(){const canvas=$('#glyph-webgl');if(!canvas)return;model.preview?.destroy();model.preview=null;try{model.preview=new GlyphPreview3D(canvas,{glyph:model.glyph,font:model.font,view:'glyph'});}catch(error){showPreviewFallback(canvas,model.glyph);}}
function updateGlyph(ch){const parsed=parseGlyphDraft(ch);if(!parsed.ok)return;ch=parsed.glyph;model.glyphDraft=null;model.glyph=ch;persist();queueMicrotask(()=>document.dispatchEvent(new CustomEvent('moji:r8-flow',{detail:{screen:model.screen,payload:statePayload()}})));document.querySelectorAll('.fallback-p1').forEach(n=>n.textContent=ch);model.homePreview?.setGlyph(ch,model.font);model.preview?.setGlyph(ch,model.font);$('#hero-player-glyph').textContent=ch;document.dispatchEvent(new CustomEvent('moji:glyph-selected',{detail:{glyph:ch,font:model.font,mode:model.mode}}));document.querySelectorAll('.glyph-chip').forEach(b=>{let a=b.dataset.glyph===ch;b.classList.toggle('is-current',a);b.setAttribute('aria-pressed',String(a));});}
const PAGE_META={
 ja:{home:['文字ブレード｜漢字ブレード・無料ブラウザ文字ゲーム','好きな漢字・かな・英字を選び、3Dの文字コマで戦う無料ブラウザゲーム。4つのストーリーステージ、VS COM、文字図鑑、文字比較ラボ、書体別の属性研究を楽しめます。'],modes:['文字ブレードの遊び方｜文字バトル・VS COM','文字ブレードの遊び方と対戦モードを紹介。4つのストーリーステージで練習し、VS COMのフリーバトルで漢字・かな・英字と書体を試せます。'],stages:['文字ブレードのステージ攻略｜第1章4ステージ','文字ブレード第一章の4ステージ、対戦相手、クリア目標、星3条件を確認。発射パワーと角度を調整して次のステージに挑戦します。'],glyph:['文字ブレードの文字選び｜漢字・かな・書体を比較','文字ブレードで使う漢字・かな・英字を選び、4種類の書体と3D文字プレビューを確認。対応している字形だけを対戦準備へ進めます。'],prepare:['文字ブレードの対戦準備｜文字・書体・属性を確認','文字ブレードの文字バトル開始前に、双方の文字、書体、速度・パワー・バランス、ストーリー目標とルールを確認します。'],profile:['文字ブレードのプレイ記録｜ステージ成績と対戦履歴','文字ブレードのローカルプレイ記録。ストーリーのステージベスト、最近の対戦、勝率、よく使う文字を確認できます。'],collection:['文字ブレード文字図鑑｜漢字・かな・文字コレクション','文字ブレードの文字図鑑で漢字・かな・英字・記号を検索し、実際に使用した文字とお気に入りを管理します。'],detail:['文字ブレードの文字詳細｜書体別の属性比較','文字ブレードの文字詳細で、対応する4種類の書体ごとに速度・パワー・バランス・ストーリーHPを比較します。'],lab:['文字ブレード文字比較ラボ｜速度・パワー・バランス','文字ブレードの文字比較ラボで2つの文字と書体を比較。属性差を確認してから、検証済みの組み合わせで対戦準備へ進みます。'],ranking:['文字ブレード最強・最弱文字研究｜Tier候補を属性比較','文字ブレードの最強・最弱候補を、書体別の速度・パワー・バランス・ストーリーHPで比較。Tier表の参考となる属性比較で、全Unicodeの総合順位や実際の勝率ではありません。']},
 zh:{home:['文字对战游戏｜Moji Blade 免费浏览器文字游戏','选择汉字、假名或字母，操控3D文字陀螺对战。体验4个故事关卡、VS COM自由对战、文字图鉴和字体属性比较。免费游玩，无需注册或安装。'],modes:['文字对战玩法｜故事关卡与VS COM','了解文字对战玩法：通过4个故事关卡练习操作，或在VS COM自由对战中测试不同文字与字体。'],stages:['文字对战关卡攻略｜第一章4个关卡','查看第一章4个关卡、对手、通关目标和三星条件，调整发射力度与角度，继续挑战。'],glyph:['选择文字与字体｜3D文字陀螺预览','选择汉字、假名或字母，预览3D字形并验证字体支持情况，再进入文字对战准备。'],prepare:['文字对战准备｜确认文字、字体与属性','开始对战前确认双方文字、字体、速度、力量、平衡、故事目标和规则。'],profile:['文字对战记录｜关卡成绩与最近战斗','查看本机保存的故事关卡最佳成绩、最近战斗、近期胜率和常用文字。'],collection:['文字图鉴｜汉字、假名与文字收藏','搜索汉字、假名、字母和符号，管理实际使用过的文字与收藏。'],detail:['文字详情｜不同字体的属性比较','按字体比较受支持文字的速度、力量、平衡与故事模式HP；缺失资源时不显示猜测数值。'],lab:['文字对比实验室｜比较速度、力量与平衡','比较两个文字和字体的字形属性差异，验证后再进入对战准备。'],ranking:['最强文字属性研究｜按字体比较候选','按字体比较经过验证的文字速度、力量、平衡和故事HP。属性计算值不等于实战胜率。']},
 en:{home:['Moji Blade | Free Glyph Battle Browser Game','Choose a kanji, kana, or letter and battle with a 3D glyph top. Play four Story stages, VS COM free battles, browse the glyph collection, and compare typeface attributes for free.'],modes:['How to Play Moji Blade | Story Stages and VS COM','Choose between four Story stages and VS COM free battles. Practice launch control, compare typefaces, and test supported glyphs.'],stages:['Moji Blade Stage Guide | Four Chapter One Stages','Review the four playable stages, rivals, clear objectives and star conditions. Adjust launch power and angle to progress.'],glyph:['Choose a Moji Blade Glyph | Typeface and 3D Preview','Choose a supported kanji, kana, or letter, preview its 3D shape, and verify the typeface before battle setup.'],prepare:['Glyph Battle Setup | Confirm Glyphs, Fonts and Rules','Check both glyphs, typefaces, derived attributes, Story objectives and battle rules before starting a match.'],profile:['Moji Blade Battle Record | Stage Bests and Recent Matches','Review local Story stage bests, recent matches, recent win rate and frequently used glyphs.'],collection:['Glyph Collection | Search Kanji, Kana and Symbols','Search glyphs by script, track glyphs actually used in battle, and manage local favorites.'],detail:['Glyph Details | Compare Attributes Across Typefaces','Compare supported glyph geometry metrics across four typefaces. Missing fonts never receive estimated values.'],lab:['Glyph Comparison Lab | Speed, Power and Balance','Compare two glyphs and typefaces using derived metrics, then continue to a verified battle setup.'],ranking:['Strongest Glyph Research | Compare Verified Attributes','Compare verified glyph candidates by typeface and attribute. Derived geometry metrics are not empirical win rates.']},
 ko:{home:['문자 블레이드 | 무료 글자 배틀 브라우저 게임','한자, 가나, 알파벳을 골라 3D 글자 팽이로 대결하세요. 4개 스토리 스테이지, VS COM, 글자 도감과 서체별 능력 비교를 무료로 즐길 수 있습니다.'],modes:['문자 블레이드 플레이 방법 | 스토리와 VS COM','4개 스토리 스테이지에서 조작을 익히거나 VS COM 자유 대전에서 글자와 서체를 시험하세요.'],stages:['문자 블레이드 스테이지 안내 | 첫 챕터 4개','플레이 가능한 4개 스테이지와 상대, 클리어 목표, 별 조건을 확인하고 발사 파워와 각도를 조절하세요.'],glyph:['문자 블레이드 글자 선택 | 서체와 3D 미리보기','한자, 가나, 알파벳 중 지원되는 글자를 선택하고 3D 형태와 서체 지원 여부를 확인하세요.'],prepare:['글자 배틀 준비 | 글자·서체·규칙 확인','배틀을 시작하기 전에 양쪽 글자와 서체, 계산된 능력치, 스토리 목표와 규칙을 확인하세요.'],profile:['문자 블레이드 배틀 기록 | 스테이지 최고 기록','로컬 스토리 기록, 최근 경기, 최근 승률과 자주 사용한 글자를 확인하세요.'],collection:['글자 도감 | 한자·가나·기호 검색과 즐겨찾기','글자 분류를 검색하고 실제 배틀에서 사용한 글자와 즐겨찾기를 관리하세요.'],detail:['글자 상세 | 서체별 능력치 비교','지원되는 글자의 속도, 파워, 균형과 스토리 HP를 네 가지 서체별로 비교합니다.'],lab:['글자 비교 실험실 | 속도·파워·균형 비교','두 글자와 서체의 계산 능력치를 비교하고 검증된 조합으로 배틀 준비를 진행하세요.'],ranking:['최강 글자 능력 연구 | 검증된 속성 비교','검증된 글자 후보를 서체와 능력치별로 비교합니다. 계산된 형태 값은 실제 승률이 아닙니다.']}
};
function applyPageMetadata(screen){const pair=(PAGE_META[locale()]||PAGE_META.ja)[screen]||(PAGE_META[locale()]||PAGE_META.ja).home;document.title=pair[0];const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=pair[1];const ogTitle=document.querySelector('meta[property="og:title"]');if(ogTitle)ogTitle.content=pair[0];const ogDesc=document.querySelector('meta[property="og:description"]');if(ogDesc)ogDesc.content=pair[1];}
const VALID_SCREENS=new Set(['home','modes','stages','glyph','prepare','profile','collection','detail','lab','ranking']);
function show(screen){
 if(!VALID_SCREENS.has(screen))screen='modes';
 if(screen!=='prepare')preflight.invalidate();
 if(screen!=='collection')++collectionInspectRevision;
 if(screen!=='detail')++detailRevision;
 if(screen!=='lab'){labInspector.invalidate();labState.revision++;labState.loading=false;}
 if(screen!=='ranking'){rankingInspector.invalidate();rankingState.revision++;rankingState.loading=false;}
 if(model.preview&&model.screen==='glyph'&&screen!=='glyph'){model.preview.destroy();model.preview=null;}
 model.screen=screen;const isHome=screen==='home';
 if(screen==='detail'){const hash=detailHash(detailState.glyph,detailState.font);if(hash&&location.hash!==hash)history.replaceState(null,'',location.pathname+location.search+hash);}
 else if(screen==='lab'){const hash=labHash(labState.selection)||'#lab';if(location.hash!==hash)history.replaceState(null,'',location.pathname+location.search+hash);}
 else if(screen==='ranking'){if(location.hash!=='#glyph-ranking')history.replaceState(null,'',location.pathname+location.search+'#glyph-ranking');}
 else if(['profile','collection'].includes(screen)&&location.hash!=='#'+screen)history.replaceState(null,'',location.pathname+location.search+'#'+screen);
 else if(['#profile','#collection','#lab'].includes(location.hash)||location.hash==='#glyph-ranking'||location.hash.startsWith('#glyph/')||location.hash.startsWith('#lab/'))history.replaceState(null,'',location.pathname+location.search);
 $('#home-page').hidden=!isHome;$('#flow-page').hidden=isHome;document.body.classList.toggle('in-flow',!isHome);
 const activePanel=screen==='profile'?'profile':['collection','detail'].includes(screen)?'collection':screen==='home'?'home':null;document.querySelectorAll('.desktop-nav [data-panel]').forEach(button=>button.classList.toggle('active',Boolean(activePanel)&&button.dataset.panel===activePanel));
 applyPageMetadata(screen);
 if(isHome){$('#flow-content').replaceChildren();model.homePreview?.resize();return;}
 $('#flow-back-label').textContent=t('back');
 const collectionTitle=collectionCopy(locale()).title;
 const detailTitle=detailCopy(locale()).title;
 const rankTitle=rankingCopy(locale()).title;
 $('#flow-breadcrumb').textContent=screen==='ranking'?[t('home'),rankTitle].join('  /  '):screen==='profile'?[t('home'),{ja:'プレイ記録',zh:'个人档案',en:'My record',ko:'내 기록'}[locale()]].join('  /  '):screen==='collection'?[t('home'),collectionTitle].join('  /  '):screen==='detail'?[t('home'),collectionTitle,detailTitle].join('  /  '):screen==='lab'?[t('home'),labCopy(locale()).title].join('  /  '):[t('home'),t('stage'),t('glyph'),t('prepare')].join('  /  ');
 const badge=$('#game-progress-chip');if(badge)badge.textContent=screen==='ranking'?'LOCAL GLYPH RESEARCH':screen==='profile'?'LOCAL RECORD':screen==='detail'?'GLYPH DETAILS':screen==='lab'?'GLYPH LAB':screen==='collection'?'LOCAL COLLECTION':model.mode==='story'?'CHAPTER 01 · '+model.selectedLevel:'FREE BATTLE';
 render();window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>{$('#flow-content h1')?.focus({preventScroll:true});});
}
const unlocked=id=>isUnlocked(id,loadSave().save.progress);
const starsFor=id=>loadSave().save.progress[id]?.stars||0;
const stageGoal=id=>getStageMission(id,locale())?.main||'';
function stageMeta(levelId){return LEVELS.find(n=>n[0]===levelId)||LEVELS[0]}
function levelName(level){return level[[1,2,3,4][langIndex()]]}
function modes(){return `<div class="flow-heading"><div><span class="flow-kicker">MOJI BLADE / GAME MODES</span><h1 tabindex="-1">${t('chooseModeTitle')}</h1><p>${t('modeBrief')}</p></div></div><div class="flow-mode-grid"><button class="flow-mode-card" type="button" data-mode-next="story"><span class="flow-kicker">01 / STORY</span><span class="flow-mode-symbol">章</span><strong>${t('modeStory')}</strong><small>${t('modeStoryDesc')}</small><span class="mode-next-arrow">→</span></button><button class="flow-mode-card" type="button" data-mode-next="quick"><span class="flow-kicker">02 / VS COM</span><span class="flow-mode-symbol">戦</span><strong>${t('modeQuick')}</strong><small>${t('modeQuickDesc')}</small><span class="mode-next-arrow">→</span></button></div><div class="r23-mode-entry"><button type="button" data-r23-open>⚖ ${labCopy(locale()).title} ↗</button><button type="button" data-r24-open-ranking>▤ ${rankingCopy(locale()).title} ↗</button></div>`;}
function stages(){
 const board=getStoryBoard(undefined,locale()),c=storyCopy(locale());
 // Only a validated, playable stage can be selected.
 model.chapter=0;
 model.selectedLevel=selectStoryStage(board,model.selectedLevel);
 const selected=board.stages.find(s=>s.id===model.selectedLevel);
 const statusLabel=s=>s.state==='cleared'?c.clear:s.state==='next'?c.next:c.locked;
 const stageTiles=board.stages.map((s,i)=>`<button type="button" data-level="${s.id}" class="r15-tile r15-${s.state} ${s.id===selected.id?'is-selected':''}" aria-pressed="${s.id===selected.id}" ${s.selectable?'':`disabled aria-disabled="true"`} aria-label="${escapeHtml(s.id+' '+s.name+' '+statusLabel(s))}">
   <span class="r15-tile-meta"><small>STAGE ${s.id}</small><span class="r15-tile-status">${s.boss?'BOSS · ':''}${escapeHtml(statusLabel(s))}</span></span>
   <span class="r15-tile-glyph" aria-hidden="true">${escapeHtml(s.enemy)}</span>
   <strong class="r15-tile-title">${escapeHtml(s.name)}</strong>
   <span class="r15-tile-foot"><span aria-label="${s.stars} / 3 ${escapeHtml(c.stars)}">${'★'.repeat(s.stars)}${'☆'.repeat(3-s.stars)}</span>${s.bestSeconds!==null?`<small>${escapeHtml(c.best)} ${s.bestSeconds.toFixed(1)}s</small>`:''}</span>
 </button>`).join('');
 const mission=selected.mission;
 const conditions=mission.conditions.map(goal=>`<li class="r15-goal"><span class="r15-goal-star" aria-hidden="true">★ ${goal.star}</span><span>${escapeHtml(goal.text)}</span></li>`).join('');
 const clearedText=board.allCleared?c.complete:`${board.clearedCount} / ${board.totalStages}`;
 return `<div class="flow-heading r15-title"><div><span class="flow-kicker">STORY / CHAPTER SELECT</span><h1 tabindex="-1">${escapeHtml(t('stageTitle'))}</h1><p>${escapeHtml(t('stageBrief'))}</p></div><span class="flow-status">CHAPTER 01 · LOCAL PLAY</span></div>
 <section class="r15-board" aria-label="${escapeHtml(t('stage'))}">
 <div class="r15-current-chapter" aria-label="${escapeHtml(t('chapter'))}"><span class="r15-chapter-mark">壱</span><span class="r15-chapter-info"><strong>CHAPTER 01</strong><small>${escapeHtml(c.chapter)}</small></span><span class="r15-chapter-badge">4 STAGES</span></div>
 <header class="r15-chapter-progress"><div><span class="flow-kicker">${escapeHtml(c.total)}</span><strong>${escapeHtml(clearedText)} <small>· ★ ${board.earnedStars} / ${board.maxStars}</small></strong></div><div class="r15-chapter-track" role="progressbar" aria-label="${escapeHtml(c.total)}" aria-valuemin="0" aria-valuemax="${board.totalStages}" aria-valuenow="${board.clearedCount}"><span style="width:${board.clearedCount/board.totalStages*100}%"></span></div></header>
 <div class="r15-stage-layout"><div class="r15-stage-list" role="group" aria-label="${escapeHtml(t('stage'))}">${stageTiles}</div>
 <aside class="r15-stage-inspector" aria-label="${escapeHtml(c.mission)}"><div class="r15-inspector-head"><span class="flow-kicker">STAGE ${selected.id}${selected.boss?' · BOSS':''}</span><span class="r15-inspector-status">${escapeHtml(statusLabel(selected))}</span></div><h2>${escapeHtml(selected.name)}</h2><p class="r15-inspector-tip">${escapeHtml(mission.instructions)}</p>
 <div class="r15-versus" aria-label="${escapeHtml(t('rival'))}"><div><small>${escapeHtml(t('rival'))}</small><strong>${escapeHtml(selected.enemy)}</strong></div><span>VS</span><div><small>PLAYER</small><strong>${escapeHtml(model.glyph)}</strong></div></div>
 <section class="r15-mission"><h3>${escapeHtml(c.mission)}</h3><p>${escapeHtml(mission.main)}</p><h3>${escapeHtml(c.reward)}</h3><ol class="r15-mission-goals">${conditions}</ol><p class="r15-mission-help">${escapeHtml(c.hint)}</p></section>
 ${selected.stars?`<p class="r15-pb">★ ${selected.stars} / 3${selected.bestSeconds!==null?` · ${escapeHtml(c.best)} ${selected.bestSeconds.toFixed(1)}s`:''}</p>`:''}
 ${!board.available?`<p class="r15-storage-warning" role="status">${escapeHtml(c.storage)}</p>`:''}
 <button class="button button-primary r2-primary r15-start" type="button" data-stage-start="${selected.id}">${escapeHtml(selected.state==='cleared'?c.replay:c.ready)} <span aria-hidden="true">↗</span></button>
 </aside></div></section>`;
}
function glyph(){const current=model.mode==='quick'?[null,null,null,null]:localPreviewStats(model.glyph);return `<div class="flow-heading"><div><span class="flow-kicker">GLYPH FORGE · 文字工房</span><h1 tabindex="-1">${t('glyphTitle')}</h1><p>${t('glyphBrief')}</p></div><span class="flow-status">CUSTOMIZE YOUR TOP</span></div><div class="glyph-layout"><div class="glyph-stage"><div class="glyph-stage-top"><span class="flow-kicker">YOUR BLADE</span><span class="preview-spin-tip">DRAG TO ROTATE</span></div><canvas id="glyph-webgl" aria-label="立体文字をマウスや指で回すプレビュー"></canvas><span class="glyph-stage-foot">${t('preview')}</span></div><div class="glyph-editor"><div class="form-caption">${t('type')}</div><div class="glyph-text-line"><input id="glyph-input" aria-label="${t('type')}" type="text" maxlength="12" value="${escapeHtml(model.glyphDraft??model.glyph)}" autocomplete="off" spellcheck="false" aria-describedby="glyph-input-error r16-glyph-status"/><button type="button" class="randomize-glyph" data-random>↻</button></div><p class="input-hint" id="glyph-input-error" role="status" aria-live="polite"></p><div class="r16-status" id="r16-glyph-status" role="status" aria-live="polite" data-state="loading">${locale()==='zh'?'正在验证字形与字体…':locale()==='en'?'Checking glyph and font…':locale()==='ko'?'글자와 서체를 확인하는 중…':'文字と書体を確認中…'}</div><div class="form-caption">${t('font')}</div><div class="font-choice" role="group" aria-label="${t('font')}">${[['gothic','ゴシック'],['mincho','明朝体'],['pop','POP'],['gyosho','行書体']].map(f=>`<button type="button" data-font-next="${f[0]}" aria-pressed="${model.font===f[0]}" class="${model.font===f[0]?'current':''}">${f[1]}</button>`).join('')}</div><div class="stats-preview"><div class="stats-title">GLYPH STATS <span>${t('metricLabel')}</span></div>${[['speed',current[0]],['power',current[1]],['hp',current[2]],['balance',current[3]]].map(([name,value])=>`<div class="r2-stat" data-metric="${name}"><span>${t(name)}</span><div class="r2-stat-track"><i style="width:${value===null?0:Math.min(100,value)}%"></i></div><strong>${value===null?'—':value}</strong></div>`).join('')}<p class="stat-note" id="glyph-stats-note">${t('glyphStatsBrief')}</p><div class="glyph-power-badge"><span id="glyph-power-title">${locale()==='zh'?'综合战力':locale()==='en'?'Battle index':locale()==='ko'?'전투력':'バトル指数'}</span><strong id="glyph-power-score">—</strong><small id="glyph-power-tier">${locale()==='zh'?'按实际字形计算':locale()==='en'?'Based on glyph geometry':'文字のカタチから計算'}</small></div></div>
      <div class="glyph-recommend"><div class="glyph-recommend-title">${locale()==='zh'?'试试其他文字':locale()==='en'?'Try another glyph':locale()==='ko'?'다른 글자도 사용':'ほかの文字も試そう'}</div><div class="glyph-recommend-row">${['文','龍','田','剣','花','一','炎','夢'].map(ch=>`<button type="button" data-sample-glyph="${ch}" aria-label="${ch}">${ch}</button>`).join('')}</div></div>
      <section class="glyph-compare" id="glyph-compare" aria-labelledby="glyph-compare-title"><header><span class="flow-kicker">VS · GLYPH LAB</span><h3 id="glyph-compare-title">${locale()==='zh'?'和另一个文字比比看':locale()==='en'?'Compare two glyphs':locale()==='ko'?'글자 능력 비교':'文字の強さを比べよう'}</h3><p>${locale()==='zh'?'两边都能自由输入，也能更换字体。':locale()==='en'?'Type a glyph on either side and choose a typeface.':'好きな文字と書体を選んで、強さを見比べよう。'}</p></header><div class="compare-editors"><div class="compare-main"><span>PLAYER</span><strong id="compare-player-symbol">${escapeHtml(model.glyph)}</strong><small id="compare-player-font">${model.font}</small><b id="compare-player-index">—</b></div><div class="compare-vs-mark">VS</div><div class="compare-rival"><label for="compare-rival-input">${locale()==='zh'?'对比文字':locale()==='en'?'Compare against':'相手の文字'}</label><div class="compare-rival-row"><input id="compare-rival-input" value="${escapeHtml(model.comparisonGlyph||'剣')}" maxlength="20" aria-describedby="compare-feedback" spellcheck="false"/><select id="compare-rival-font" aria-label="Compare font">${[['gothic','ゴシック'],['mincho','明朝体'],['pop','POP'],['gyosho','行書体']].map(f=>`<option value="${f[0]}" ${f[0]===(model.comparisonFont||'gothic')?'selected':''}>${f[1]}</option>`).join('')}</select></div><b id="compare-rival-index">—</b></div></div><div id="compare-stat-rows" class="compare-stat-rows" aria-live="polite"></div><div id="compare-feedback" class="compare-feedback" role="status">${locale()==='zh'?'正在读取真正的字形属性…':locale()==='en'?'Measuring glyphs…':'文字の強さを計算しています…'}</div><div class="compare-actions"><button type="button" id="compare-swap">⇄ ${locale()==='zh'?'交换双方':locale()==='en'?'Swap glyphs':'文字を入れ替え'}</button><button type="button" id="compare-use-rival">${locale()==='zh'?'改用对比文字':locale()==='en'?'Use challenger':'相手の文字を使う'} →</button></div></section>
      <button type="button" class="button button-primary r2-primary" data-continue="prepare" disabled aria-disabled="true">${t('continue')} <span>→</span></button></div></div>`;}
const PREPARE_COPY={
 ja:{rulesStory:'ARENA HP · HPとSPIN / DASH',rulesQuick:'CLASSIC V2 · HPなし / DASHなし',titleStory:'ステージバトル',titleQuick:'フリーバトル',mission:'ミッション',goalHp:'残りHP 55%以上',unranked:'ローカル練習 · ランキング対象外',checking:'双方の文字と書体を確認中…',ready:'双方の字形を確認済み。対戦できます。',starting:'対戦を起動しています…',rival:'相手の文字',rivalHelp:'一文字だけ入力してください。',error:'文字か書体を確認できません。',locked:'このステージは未解放です。',unsupported:'この文字は現在の書体で使えません。',missing:'必要なフォントがありません。',double:'一文字だけ入力してください。',startError:'起動できませんでした。もう一度お試しください。',player:'あなた',opponent:'相手',stats:'字形から計算した能力',edit:'文字を変える',retry:'もう一度確認',best:'現在の目標',battle:'バトル開始',hint:'続けるには両方の字形データが必要です。'},
 zh:{rulesStory:'ARENA HP · HP、SPIN 与 DASH',rulesQuick:'CLASSIC V2 · 无 HP / 无 DASH',titleStory:'故事挑战',titleQuick:'自由对战',mission:'关卡目标',goalHp:'剩余HP至少55%',unranked:'本地练习 · 不计入排行榜',checking:'正在验证双方文字和字体…',ready:'双方字形验证通过，可以开始对战。',starting:'正在启动对战…',rival:'对手文字',rivalHelp:'只能输入一个可见文字。',error:'文字或字体验证失败。',locked:'关卡尚未解锁。',unsupported:'该文字不受当前字体支持。',missing:'缺少所需的原始字体资源。',double:'请输入单个可见文字，不能截断。',startError:'战斗启动失败，请重试。',player:'你的文字',opponent:'对手',stats:'由真实字形计算的属性',edit:'修改文字',retry:'重新验证',best:'本关条件',battle:'开始战斗',hint:'双方字形数据验证完成后才能开始。'},
 en:{rulesStory:'ARENA HP · HP, SPIN & DASH',rulesQuick:'CLASSIC V2 · NO HP / NO DASH',titleStory:'Story challenge',titleQuick:'Free battle',mission:'Stage objective',goalHp:'At least 55% HP remaining',unranked:'Local practice · Not ranked',checking:'Checking both glyphs and fonts…',ready:'Both glyphs verified. Ready to battle.',starting:'Launching battle…',rival:'Rival glyph',rivalHelp:'Enter exactly one visible glyph.',error:'Glyph/font verification failed.',locked:'This stage is locked.',unsupported:'That font does not support the glyph.',missing:'Original font resource unavailable.',double:'Enter exactly one visible glyph. Nothing will be truncated.',startError:'Battle could not start. Please retry.',player:'Your glyph',opponent:'Opponent',stats:'Native glyph-based attributes',edit:'Change glyph',retry:'Check again',best:'Stage requirement',battle:'Launch battle',hint:'Both native glyphs must be verified before launch.'},
 ko:{rulesStory:'ARENA HP · HP, SPIN 및 DASH',rulesQuick:'CLASSIC V2 · HP 없음 / DASH 없음',titleStory:'스테이지 도전',titleQuick:'자유 대전',mission:'스테이지 목표',goalHp:'HP 55% 이상 남기기',unranked:'로컬 연습 · 랭킹 미반영',checking:'양쪽 글자와 글꼴을 확인 중…',ready:'양쪽 글자를 확인했습니다. 시작할 수 있습니다.',starting:'전투 실행 중…',rival:'상대 글자',rivalHelp:'표시 가능한 글자 하나만 입력하세요.',error:'글자 또는 글꼴 검증 실패.',locked:'스테이지가 잠겨 있습니다.',unsupported:'이 글꼴은 해당 글자를 지원하지 않습니다.',missing:'원본 글꼴 파일이 없습니다.',double:'글자 하나만 입력해 주세요.',startError:'전투를 시작하지 못했습니다. 다시 시도하세요.',player:'내 글자',opponent:'상대',stats:'실제 글자 형태의 능력치',edit:'글자 변경',retry:'다시 확인',best:'목표',battle:'전투 시작',hint:'양쪽 글자 데이터를 확인해야 시작할 수 있습니다.'}
};
const pc=()=>PREPARE_COPY[locale()]||PREPARE_COPY.ja;
const preflight=createBattlePreflight(inspectBattlePair);
const launchLock=createBattleLaunchLock();
function battleDraft(){const payload=statePayload();return {...payload,opponent:model.mode==='quick'?{char:model.opponentDraft??model.opponent,fontId:model.opponentFont||model.font}:null};}
function checkedBattle(){return resolveBattleDraft(battleDraft(),loadSave().save.progress);}
function preflightMessage(reason){const c=pc();if(reason==='locked'||reason==='stage')return c.locked;if(reason?.includes('font-unavailable'))return c.missing;if(reason?.includes('unsupported'))return c.unsupported;if(reason?.includes('multiple')||reason?.includes('invisible')||reason?.includes('empty'))return c.double;return c.error;}
function updatePrepareStatus(kind,message){if(model.screen!=='prepare')return;const box=$('#r17-check-status'),btn=$('#flow-content [data-launch]');if(box){box.dataset.state=kind;box.textContent=message;}if(btn){const disabled=kind!=='ready'||launchLock.isBusy();btn.disabled=disabled;btn.setAttribute('aria-disabled',String(disabled));btn.textContent=kind==='starting'?pc().starting:pc().battle+' ↗';}}
function paintBattleStats(data){if(model.screen!=='prepare')return;for(const [who,metrics] of Object.entries(data||{})){for(const attr of ['speed','power','balance','hp']){const target=$(`#r17-${who}-${attr}`);if(target)target.textContent=metrics[attr]===null?'—':String(metrics[attr]);}}}
async function refreshPreflight(){if(model.screen!=='prepare')return;preflight.invalidate();paintBattleStats(null);const result=checkedBattle();if(!result.ok){updatePrepareStatus('invalid',preflightMessage(result.reason));return;}
 updatePrepareStatus('checking',pc().checking);
 const outcome=await preflight.verify(result.selection);
 if(model.screen!=='prepare'||outcome.key!==preflight.snapshot().key)return;
 if(preflight.isReady(result.selection)){paintBattleStats(outcome.data);updatePrepareStatus('ready',pc().ready);}else if(outcome.status==='invalid')updatePrepareStatus('invalid',preflightMessage(outcome.reason));
}
function prepare(){
 const c=pc(), story=model.mode==='story',level=LEVEL_CATALOG[model.selectedLevel],st=stageMeta(model.selectedLevel),rival=story?(level?.enemy||'—'):(model.opponentDraft??model.opponent),rivalFont=story?(level?.enemyFont||'—'):(model.opponentFont||model.font);
 const mission=story?getStageMission(model.selectedLevel,locale()):null;
 const statGrid=(side)=>`<div class="r17-statline">${[['speed',t('speed')],['power',t('power')],['balance',t('balance')],['hp',t('hp')]].map(([id,label])=>`<span>${escapeHtml(label)} <b id="r17-${side}-${id}">—</b></span>`).join('')}</div>`;
 return `<div class="flow-heading r17-heading"><div><span class="flow-kicker">MATCH SETUP / ${story?'STORY':'VS COM'}</span><h1 tabindex="-1">${escapeHtml(t('prepareTitle'))}</h1><p>${escapeHtml(t('prepBrief'))}</p></div><span class="r17-rule-chip">${escapeHtml(story?c.rulesStory:c.rulesQuick)}</span></div>
 <div class="r17-prepare-layout"><section class="r17-versus" aria-label="${escapeHtml(t('prepare'))}"><div class="r17-arena-head"><span>MOJI BLADE · VERSUS</span><span>${escapeHtml(story?'STAGE '+model.selectedLevel:'FREE BATTLE')}</span></div><div class="r17-faceoff">
 <div class="r17-fighter r17-player"><span class="r17-fighter-type">PLAYER 01</span><strong class="r17-hero-letter">${escapeHtml(model.glyph)}</strong><b>${escapeHtml(c.player)}</b><small>${escapeHtml(model.font.toUpperCase())}</small>${statGrid('player')}<button type="button" class="r17-edit" data-continue="glyph">↶ ${escapeHtml(c.edit)}</button></div>
 <div class="r17-vs">VS</div>
 <div class="r17-fighter r17-rival"><span class="r17-fighter-type">${story?'STAGE RIVAL':'CPU'}</span><strong class="r17-hero-letter" id="r17-rival-symbol">${escapeHtml(rival)}</strong><b>${escapeHtml(c.opponent)}</b><small id="r17-rival-font">${escapeHtml(rivalFont.toUpperCase())}</small>${statGrid('rival')}</div>
 </div><div class="r17-battle-note">${escapeHtml(c.stats)} · ${escapeHtml(c.unranked)}</div></section>
 <aside class="r17-checklist"><div class="r17-checklist-top"><span class="flow-kicker">PRE-BATTLE CHECK</span><h2>${escapeHtml(story?levelName(st):c.titleQuick)}</h2><p class="r17-checklist-sub">${escapeHtml(story?c.titleStory:c.rulesQuick)}</p></div>
 ${story?`<section class="r17-objectives"><h3>${escapeHtml(c.mission)}</h3><strong>${escapeHtml(mission?.main||'—')}</strong><p>★ 2 — ${escapeHtml(mission?.bonusHp||c.goalHp)}</p><p>★ 3 — ${escapeHtml(mission?.bonusTime||'—')}</p></section>`:
 `<div class="r17-rival-input"><label for="r8-opponent-input">${escapeHtml(c.rival)}</label><input type="text" id="r8-opponent-input" value="${escapeHtml(rival)}" maxlength="20" aria-describedby="r17-rival-help r17-check-status" aria-invalid="false" autocomplete="off" spellcheck="false" /><small id="r17-rival-help">${escapeHtml(c.rivalHelp)}</small><label for="r23-opponent-font">${escapeHtml(t('font'))}</label><select id="r23-opponent-font">${['gothic','mincho','pop','gyosho'].map(f=>`<option value="${f}" ${f===rivalFont?'selected':''}>${f.toUpperCase()}</option>`).join('')}</select></div>`}
 <div class="r17-rule-row"><span>${escapeHtml(t('classic'))}</span><strong>${escapeHtml(story?c.rulesStory:c.rulesQuick)}</strong></div>
 <div class="r17-rule-row"><span>${escapeHtml(t('arena'))}</span><strong>${escapeHtml(story?(level?.arena||'classic'):'standard')}</strong></div>
 <div class="r17-check-status" id="r17-check-status" role="status" aria-live="polite" data-state="checking">${escapeHtml(c.checking)}</div>
 <button type="button" class="button button-primary r17-battle-cta" data-launch disabled aria-disabled="true">${escapeHtml(c.battle)} ↗</button>
 <div class="r17-secondary-actions">${story?`<button type="button" class="r17-subtle" data-continue="stages">← ${escapeHtml(t('viewStage'))}</button>`:''}<button type="button" class="r17-subtle" data-recheck>↻ ${escapeHtml(c.retry)}</button></div></aside></div>`;
}

function statePayload(){const quick=model.mode==='quick';return Object.freeze({mode:model.mode,levelId:model.mode==='story'?model.selectedLevel:null,player:{char:model.glyph,fontId:model.font},opponent:quick?{char:model.opponent,fontId:model.opponentFont||model.font}:null,ruleset:quick?'classic-v2':'arena-hp-v3',rulesetVersion:quick?'classic-v2':'arena-hp-rapier-r10-dash-local-v1',physicsVersion:'moji-blade-rapier021-r16-app-inner1',source:quick?'original-uploaded-v2-rapier':'original-v2-rapier+native-hp-r9',simulationVersion:'moji-blade-rapier021-r16-app-inner1',statsVersion:quick?'v2-original-glyph-metrics':'r10-native-hp-arcade-v1',verified:false});}
function render(){const root=$('#flow-content');const focused=(model.screen==='lab'&&document.activeElement?.id?.startsWith('r23-'))||(model.screen==='ranking'&&document.activeElement?.id?.startsWith('r24-'))?document.activeElement:null;const caret=focused&&(focused.id.endsWith('glyph')||focused.id==='r24-query')?focused.selectionStart:null;root.innerHTML=model.screen==='ranking'?rankingHTML({...rankingState,options:rankingState.options},locale()):model.screen==='lab'?labHTML({...labState,selection:labState.selection,loading:labState.loading},locale()):model.screen==='detail'?detailHTML({...detailState,rows:detailState.results?.rows||[],items:readCollectionView().items,storageStatus:readCollectionView().storageStatus},locale()):model.screen==='collection'?collectionHTML(readCollectionView(),{locale:locale(),...collectionFilters}):model.screen==='profile'?renderPlayerProfile(readPlayerProfile(),{locale:locale(),...profileFilters}):model.screen==='modes'?modes():model.screen==='stages'?stages():model.screen==='glyph'?glyph():model.screen==='prepare'?prepare():modes();if(focused){const restored=document.getElementById(focused.id);restored?.focus({preventScroll:true});if(restored&&caret!==null&&typeof restored.setSelectionRange==='function')try{restored.setSelectionRange(caret,caret);}catch{}}if(model.screen==='glyph')requestAnimationFrame(initFlow3D);if(model.screen==='prepare')queueMicrotask(()=>void refreshPreflight());if(model.screen==='detail'&&!detailState.results&&!detailState.loading)queueMicrotask(()=>void inspectDetail());if(model.screen==='lab'&&!labState.result&&!labState.loading)queueMicrotask(()=>void inspectLabPair());if(model.screen==='ranking'&&!rankingState.result&&!rankingState.loading)queueMicrotask(()=>void inspectRanking());queueMicrotask(()=>document.dispatchEvent(new CustomEvent('moji:r8-flow',{detail:{screen:model.screen,payload:statePayload()}})));}
async function launch(){
 if(model.screen!=='prepare'||launchLock.isBusy())return;
 const draft=checkedBattle();if(!draft.ok){updatePrepareStatus('invalid',preflightMessage(draft.reason));return;}
 if(!preflight.isReady(draft.selection)){void refreshPreflight();return;}
 const requestedGlyph=draft.selection.player,requestedFont=draft.selection.playerFont;
 const launchOutcome=await launchLock.run(async()=>{
  updatePrepareStatus('starting',pc().starting);
  const validPlayer=await window.MojiBladeR16Glyph?.verifyForLaunch?.({glyph:model.glyph,font:model.font,mode:model.mode});
  if(model.screen!=='prepare')return {status:'cancelled'};
  const fresh=checkedBattle();
  if(!validPlayer||!fresh.ok||!preflight.isReady(fresh.selection)){
   if(!validPlayer){show('glyph');return {status:'invalid'};}
   updatePrepareStatus('invalid',preflightMessage(fresh.reason));return {status:'invalid'};
  }
  const bridge=window.MojiBladeV3Bridge?.launchStage;
  if(typeof bridge!=='function'){updatePrepareStatus('invalid',pc().startError);return {status:'unavailable'};}
  const payload=statePayload();
  document.dispatchEvent(new CustomEvent('moji:v3-battle-request',{detail:payload}));
  try{
   const result=await bridge(payload);
   if(model.screen==='prepare'){
    if(result?.status==='started')updatePrepareStatus('ready',pc().ready);
    else updatePrepareStatus('invalid',pc().startError);
   }
   return result;
  }catch(error){console.warn('Battle startup failed',error);if(model.screen==='prepare')updatePrepareStatus('invalid',pc().startError);return {status:'failed'};}
 });
 if(launchOutcome?.status==='started'){markDiscovered(requestedGlyph,requestedFont);}
 if(launchOutcome?.status==='started'&&model.screen==='prepare'&&preflight.isReady(checkedBattle().selection))updatePrepareStatus('ready',pc().ready);
}
function goBack(){if(model.screen==='home')return;if(model.screen==='ranking'){show(rankingReturnScreen||'modes');return;}if(model.screen==='lab'){show(labReturnScreen||'collection');return;}if(model.screen==='detail'){show(detailReturnScreen||'collection');return;}if(['profile','collection'].includes(model.screen)){show('home');return;}if(model.screen==='stages'||model.screen==='modes')show('home');else if(model.screen==='glyph')show(model.mode==='story'?'stages':'modes');else if(model.screen==='prepare')show('glyph');else show('prepare');}
function collectionSelection(){const all=readCollectionView();const row=all.items.find(x=>collectionIdentity(x.glyph,x.font)===collectionFilters.selectedKey);return row||all.items[0];}
function refreshCollection({keepFocus=false}={}){
 if(model.screen!=='collection')return;render();
 if(keepFocus){const input=$('#r21-search');input?.focus({preventScroll:true});input?.setSelectionRange?.(input.value.length,input.value.length);}
}
async function inspectCollection(){
 const selected=collectionSelection(),target=$('#r21-native');if(!selected||!target)return;
 const id=++collectionInspectRevision,key=collectionIdentity(selected.glyph,selected.font),c=collectionCopy(locale());
 target.textContent=c.checking;
 try{
  const lib=await loadClassicLibrary(selected.font);
  if(!lib.supports(selected.glyph))throw Error('unsupported');
  const shape=lib.get(selected.glyph,'mixed'),stats=deriveNativeStats(shape,classicGlyphMetrics(shape));
  if(id!==collectionInspectRevision||model.screen!=='collection'||collectionFilters.selectedKey!==key)return;
  target.innerHTML=nativeStatsHTML({speed:stats.speed,power:stats.power,balance:stats.balance,hp:stats.maxHp},locale());
 }catch{
  if(id===collectionInspectRevision&&model.screen==='collection'&&collectionFilters.selectedKey===key)target.textContent=c.missing;
 }
}
function openDetail(glyph,font='gothic',returnScreen=model.screen){
 const hash=detailHash(glyph,font);if(!hash)return false;
 detailReturnScreen=['ranking','collection'].includes(returnScreen)?returnScreen:'collection';
 ++detailRevision;detailState={glyph,font,results:null,loading:false};show('detail');return true;
}
async function inspectDetail(){
 if(model.screen!=='detail'||detailState.loading)return;
 const rev=++detailRevision,glyph=detailState.glyph;
 detailState.loading=true;
 // Repaint loading state. Do not overwrite a later character selection.
 render();
 const results=await measureFontVariants(glyph);
 if(rev!==detailRevision||model.screen!=='detail'||detailState.glyph!==glyph)return;
 detailState.results=results;detailState.loading=false;render();
}
function updateDetailFont(font){
 const hash=detailHash(detailState.glyph,font);if(!hash)return;
 detailState.font=font;history.replaceState(null,'',location.pathname+location.search+hash);render();
}

function openLab(selection=DEFAULT_LAB){
 const checked=validateLabSelection(selection);if(!checked.ok)return false;
 labReturnScreen=['ranking','collection','detail','modes','home'].includes(model.screen)?model.screen:'collection';
 labInspector.invalidate();labState={selection:{...checked.selection},result:null,loading:false,revision:labState.revision+1,feedback:''};show('lab');return true;
}
async function inspectLabPair(){
 if(model.screen!=='lab'||labState.loading)return;
 const rev=++labState.revision,selection={...labState.selection};
 labState.loading=true;labState.feedback='';render();
 const result=await labInspector.verify(selection);
 if(rev!==labState.revision||model.screen!=='lab')return;
 labState.result=result;labState.loading=false;
 const c=labCopy(locale());labState.feedback=result.status==='ready'?c.ready:result.status==='invalid'?c.invalid:result.sides?.a?.status==='unsupported'||result.sides?.b?.status==='unsupported'?c.unsupported:c.unavailable;
 render();
}
function changeLabField(id,value){
 const key={'r23-a-glyph':'a','r23-b-glyph':'b','r23-a-font':'fontA','r23-b-font':'fontB'}[id];if(!key)return;
 labState.selection={...labState.selection,[key]:value};labInspector.invalidate();labState.revision++;labState.loading=false;labState.result=null;labState.feedback='';
 const hash=labHash(labState.selection)||'#lab';history.replaceState(null,'',location.pathname+location.search+hash);
 render();
 const field=$('#'+id);field?.focus({preventScroll:true});if(field?.setSelectionRange&&id.endsWith('glyph'))try{field.setSelectionRange(value.length,value.length);}catch{}
}
function labBattle(){
 const result=labState.result,checked=validateLabSelection(labState.selection);
 if(result?.status!=='ready'||!checked.ok||JSON.stringify(result.selection)!==JSON.stringify(checked.selection))return;
 model.mode='quick';model.opponent=checked.selection.b;model.opponentFont=checked.selection.fontB;model.opponentDraft=null;model.font=checked.selection.fontA;
 updateGlyph(checked.selection.a);show('prepare');
}

function openRanking(options={},returnScreen=model.screen){
 rankingInspector.invalidate();rankingReturnScreen=returnScreen||'modes';
 rankingState={options:normalizeRankingOptions({...DEFAULT_RANKING,...options}),result:null,loading:false,revision:rankingState.revision+1,feedback:''};
 show('ranking');return true;
}
async function inspectRanking(){
 if(model.screen!=='ranking'||rankingState.loading)return;
 const rev=++rankingState.revision,options={...rankingState.options};
 rankingState.loading=true;rankingState.feedback='';render();
 const snapshot=await rankingInspector.run(options);
 if(rev!==rankingState.revision||model.screen!=='ranking')return;
 rankingState.result=snapshot.result;rankingState.loading=false;
 const c=rankingCopy(locale());rankingState.feedback=snapshot.result?.status==='complete'?c.ready:snapshot.result?.status==='unavailable'?c.unavailable:snapshot.result?.status==='empty'?c.empty:c.noVerified;
 render();
}
function changeRankingFilter(key,value){
 if(model.screen!=='ranking')return;
 rankingState.options=normalizeRankingOptions({...rankingState.options,[key]:value});
 rankingState.result=null;rankingState.loading=false;rankingState.feedback='';rankingState.revision++;
 rankingInspector.invalidate();
 if(location.hash!=='#glyph-ranking')history.replaceState(null,'',location.pathname+location.search+'#glyph-ranking');
 render();
}
function awaitCopy(text){return navigator.clipboard?.writeText?.(text)||Promise.reject(Error('clipboard unavailable'));}
function onClick(e){
 if(e.target.closest('[data-r24-open-ranking]')){const source=model.screen==='detail'?{font:detailState.font}:model.screen==='collection'?collectionSelection():model.screen==='lab'?{font:labState.selection.fontA}:null;openRanking({font:source?.font||model.font},model.screen);return;}
 if(e.target.closest('[data-r24-detail]')&&model.screen==='ranking'){openDetail(e.target.closest('[data-r24-detail]').dataset.r24Detail,e.target.closest('[data-r24-detail]').dataset.r24Font||rankingState.options.font,'ranking');return;}
 if(e.target.closest('[data-r24-compare]')&&model.screen==='ranking'){const row=e.target.closest('[data-r24-compare]');openLab({a:row.dataset.r24Compare,fontA:row.dataset.r24Font||rankingState.options.font,b:model.glyph,fontB:model.font});return;}
 if(e.target.closest('[data-r24-lab]')&&model.screen==='ranking'){openLab({a:model.glyph,fontA:model.font,b:model.opponent||'剣',fontB:model.opponentFont||model.font});return;}
 if(e.target.closest('[data-r24-back]')&&model.screen==='ranking'){show(rankingReturnScreen||'modes');return;}
 if(e.target.closest('[data-r24-refresh]')&&model.screen==='ranking'){rankingInspector.invalidate();rankingState.revision++;rankingState.result=null;rankingState.loading=false;rankingState.feedback='';render();return;}
 if(e.target.closest('[data-r23-open]')){const source=model.screen==='detail'?{glyph:detailState.glyph,font:detailState.font}:model.screen==='collection'?collectionSelection():null;openLab({a:source?.glyph||model.glyph,fontA:source?.font||model.font,b:model.opponent||'剣',fontB:model.opponentFont||model.font});return;}
 if(e.target.closest('[data-r23-back]')){show(labReturnScreen||'collection');return;}
 if(e.target.closest('[data-r23-swap]')&&model.screen==='lab'){const s=labState.selection;openLab({a:s.b,fontA:s.fontB,b:s.a,fontB:s.fontA});return;}
 if(e.target.closest('[data-r23-verify]')&&model.screen==='lab'){labInspector.invalidate();labState.revision++;labState.result=null;labState.loading=false;render();return;}
 if(e.target.closest('[data-r23-battle]')&&model.screen==='lab'){labBattle();return;}
 if(e.target.closest('[data-r23-share]')&&model.screen==='lab'){const text=labHash(labState.selection),c=labCopy(locale()),target=$('#r23-status');if(text){awaitCopy(location.origin+location.pathname+location.search+text).then(()=>{if(target?.isConnected)target.textContent=c.copied;}).catch(()=>{if(target?.isConnected)target.textContent=c.copyFail;});}else if(target)target.textContent=c.invalid;return;}
 if(e.target.closest('[data-r22-back]')){show(detailReturnScreen||'collection');return;}
 const detailFont=e.target.closest('[data-r22-font]');if(detailFont&&model.screen==='detail'){updateDetailFont(detailFont.dataset.r22Font);return;}
 if(e.target.closest('[data-r22-retry]')&&model.screen==='detail'){++detailRevision;detailState.results=null;detailState.loading=false;render();return;}
 if(e.target.closest('[data-r22-favorite]')&&model.screen==='detail'){const out=toggleFavorite(detailState.glyph,detailState.font);render();const feedback=$('#r22-feedback');if(feedback)feedback.textContent=detailCopy(locale())[out.status==='saved'?'saved':'storeFail'];return;}
 if(e.target.closest('[data-r22-use]')&&model.screen==='detail'){const selected=detailState.results?.rows?.find(r=>r.font===detailState.font);if(selected?.status!=='ready')return;model.font=detailState.font;updateGlyph(detailState.glyph);show('glyph');return;}
 if(e.target.closest('[data-r22-share]')&&model.screen==='detail'){const c=detailCopy(locale()),feedback=$('#r22-feedback'),url=location.href;try{awaitCopy(url).then(()=>{if(model.screen==='detail'&&feedback?.isConnected)feedback.textContent=c.copied;}).catch(()=>{if(model.screen==='detail'&&feedback?.isConnected)feedback.textContent=c.copyFail;});}catch{if(feedback)feedback.textContent=c.copyFail;}return;}
 if(e.target.closest('[data-r22-open]')&&model.screen==='collection'){const row=collectionSelection();if(row)openDetail(row.glyph,row.font);return;}
 const rowButton=e.target.closest('[data-r21-select]');if(rowButton){++collectionInspectRevision;collectionFilters.selectedKey=rowButton.dataset.r21Select;refreshCollection();return;}
 if(e.target.closest('[data-r21-favorite]')){const row=collectionSelection();if(!row)return;const result=toggleFavorite(row.glyph,row.font);++collectionInspectRevision;refreshCollection();const feedback=$('#r21-feedback');if(feedback)feedback.textContent=collectionCopy(locale())[result.status==='saved'?'saved':'unavailable'];return;}
 if(e.target.closest('[data-r21-inspect]')){void inspectCollection();return;}
 if(e.target.closest('[data-r21-use]')){const row=collectionSelection();if(!row)return;model.font=row.font;updateGlyph(row.glyph);show('glyph');return;}
 if(e.target.closest('[data-r21-home]')){show('home');return;}
 if(e.target.closest('[data-r20-story]')){model.mode='story';show('stages');return;}if(e.target.closest('[data-r20-home]')){show('home');return;}if(e.target.closest('[data-recheck]')){if(!launchLock.isBusy())void refreshPreflight();return;}const sample=e.target.closest('[data-sample-glyph]');if(sample){updateGlyph(sample.dataset.sampleGlyph);render();return;}let target=e.target.closest('[data-mode-next]');if(target){model.mode=target.dataset.modeNext;show(model.mode==='story'?'stages':'glyph');return;}target=e.target.closest('[data-continue]');if(target){if(target.dataset.continue==='prepare'&&!window.MojiBladeR16Glyph?.readyFor?.({glyph:model.glyph,font:model.font,mode:model.mode})){return;}show(target.dataset.continue);return;}target=e.target.closest('[data-level]');if(target){const board=getStoryBoard(undefined,locale());const stage=board.stages.find(s=>s.id===target.dataset.level);if(stage?.selectable){model.selectedLevel=stage.id;render();requestAnimationFrame(()=>$('#flow-content [data-level=\"'+stage.id+'\"]')?.focus({preventScroll:true}));}return;}target=e.target.closest('[data-stage-start]');if(target){const board=getStoryBoard(undefined,locale());if(board.stages.some(s=>s.id===target.dataset.stageStart&&s.selectable)){model.selectedLevel=target.dataset.stageStart;show('glyph');}return;}target=e.target.closest('[data-font-next]');if(target){model.font=target.dataset.fontNext;persist();render();return;}if(e.target.closest('[data-random]')){const pool=['文','剣','龍','水','花','力','風','田','天','夢'];updateGlyph(pool.filter(x=>x!==model.glyph)[Math.floor(Math.random()*(pool.length-1))]);render();return;}if(e.target.closest('[data-launch]')){launch();return;}}
$('#flow-content').addEventListener('click',onClick);
$('#flow-content').addEventListener('change',event=>{if(model.screen==='ranking'&&['r24-font','r24-metric','r24-category','r24-direction'].includes(event.target.id)){const key={'r24-font':'font','r24-metric':'metric','r24-category':'category','r24-direction':'direction'}[event.target.id];changeRankingFilter(key,event.target.value);return;}if(model.screen==='collection'){if(event.target.id==='r21-category')collectionFilters.category=event.target.value;if(event.target.id==='r21-view')collectionFilters.view=event.target.value;++collectionInspectRevision;refreshCollection();return;}if(model.screen==='lab'&&(event.target.id==='r23-a-font'||event.target.id==='r23-b-font')){changeLabField(event.target.id,event.target.value);return;}if(model.screen==='prepare'&&event.target.id==='r23-opponent-font'){model.opponentFont=event.target.value;const fontLabel=$('#r17-rival-font');if(fontLabel)fontLabel.textContent=event.target.value.toUpperCase();void refreshPreflight();return;}if(model.screen!=='profile')return;if(event.target.id==='r20-filter-stage')profileFilters.stage=event.target.value;if(event.target.id==='r20-filter-outcome')profileFilters.outcome=event.target.value;render();});
$('#flow-content').addEventListener('input',e=>{
 if(model.screen==='ranking'&&e.target.id==='r24-query'){changeRankingFilter('query',e.target.value);return;}
 if(model.screen==='lab'&&!e.isComposing&&['r23-a-glyph','r23-b-glyph'].includes(e.target.id)){changeLabField(e.target.id,e.target.value);return;}
 if(e.target.id==='r21-search'){collectionFilters.query=e.target.value;++collectionInspectRevision;refreshCollection({keepFocus:true});return;}
 if(e.target.id==='r8-opponent-input'&&!e.isComposing){const parsed=parseGlyphDraft(e.target.value);model.opponentDraft=parsed.ok?null:e.target.value;if(parsed.ok)model.opponent=parsed.glyph;const symbol=$('#r17-rival-symbol');if(symbol)symbol.textContent=parsed.ok?parsed.glyph:'?';e.target.setAttribute('aria-invalid',String(!parsed.ok));void refreshPreflight();return;}
 if(e.target.id!=='glyph-input'||e.isComposing)return;
 const parsed=parseGlyphDraft(e.target.value);
 model.glyphDraft=parsed.ok?null:e.target.value;
 const message=$('#glyph-input-error');
 const wording={ja:{empty:'文字を入力してください。',multiple:'一文字だけ入力してください。',invisible:'表示できる文字を入力してください。'},zh:{empty:'请输入一个文字。',multiple:'只能输入一个文字，不能输入多个。',invisible:'请输入可见的文字。'},en:{empty:'Enter a glyph.',multiple:'Enter exactly one glyph.',invisible:'Enter a visible glyph.'},ko:{empty:'글자를 입력하세요.',multiple:'글자 하나만 입력하세요.',invisible:'표시 가능한 글자를 입력하세요.'}};
 if(message)message.textContent=parsed.ok?'':(wording[locale()]||wording.ja)[parsed.reason];
 e.target.setAttribute('aria-invalid',String(!parsed.ok));
 if(parsed.ok){updateGlyph(parsed.glyph);}else{window.MojiBladeR16Glyph?.invalidate?.();document.querySelectorAll('#flow-content .r2-stat strong').forEach(n=>n.textContent='—');document.querySelectorAll('#flow-content .r2-stat i').forEach(n=>n.style.width='0%');const score=$('#glyph-power-score');if(score)score.textContent='—';const status=$('#r16-glyph-status');if(status){status.dataset.state='invalid';status.textContent=message?.textContent||'';}const button=$('#flow-content [data-continue="prepare"]');if(button){button.disabled=true;button.setAttribute('aria-disabled','true');}}
});
$('#flow-content').addEventListener('compositionend',e=>{if(['glyph-input','r8-opponent-input','r23-a-glyph','r23-b-glyph'].includes(e.target.id))e.target.dispatchEvent(new Event('input',{bubbles:true}));});
$('#flow-content').addEventListener('change',e=>{if(e.target.id==='glyph-input'&&!parseGlyphDraft(e.target.value).ok)e.target.focus();});
$('#flow-back').addEventListener('click',goBack);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&model.screen!=='home'&&!$('#overlay').hidden){return;}if(e.key==='Escape'&&model.screen!=='home'){goBack();}});
document.addEventListener('moji:navigate',e=>{if(e.detail?.screen==='ranking'){openRanking(e.detail?.options||{},model.screen);return;}if(e.detail?.screen==='detail'){openDetail(e.detail?.glyph,e.detail?.font||'gothic');return;}if(e.detail?.screen==='lab'){openLab(e.detail?.selection||DEFAULT_LAB);return;}if(['profile','collection'].includes(e.detail?.screen)){show(e.detail.screen);return;}if(e.detail?.mode)model.mode=e.detail.mode;if(e.detail?.levelId&&isPlayable(e.detail.levelId))model.selectedLevel=selectStoryStage(getStoryBoard(undefined,locale()),e.detail.levelId);show(e.detail.screen||'modes');});
document.addEventListener('moji:glyph-changed',e=>updateGlyph(e.detail?.glyph));
$('#locale-select')?.addEventListener('change',()=>{if(model.screen!=='home')show(model.screen);else applyPageMetadata('home');});
// Preserve V2 settings without modifying V2's key; never infer campaign progress from V2's local data.
window.MojiHomeV1?.selectGlyph(model.glyph);
initHome3D();
const status=$('#sync-status');if(status){status.setAttribute('title','Progress is stored only on this device and is not uploaded to a server.');status.innerHTML='<span class="signal-dot"></span><span>'+ (loadSave().status==='unavailable'?'セーブ不可':'端末に保存') + '</span>';}
const existing=$('#prototype-caption');if(existing)existing.textContent='STORY CHAPTER 01 · LOCAL PLAY';
applyPageMetadata(model.screen);
window.MojiBladeR5={getSelection:()=>statePayload(),open:show};
window.MojiBladeR3=window.MojiBladeR5;
window.MojiBladeR2=window.MojiBladeR3;
// Single validated view of campaign progress for the R14 home card and resume CTA.
window.MojiBladeR14Campaign={snapshot:()=>readCampaignSnapshot()};
document.dispatchEvent(new Event('moji:campaign-ready'));

// Local save updates reach HOME without navigating away or overwriting V2 data.
document.addEventListener('moji:r9-native-progress',event=>{if(model.screen==='stages')render();const s=$('#sync-status span:last-child');if(s)s.textContent=event.detail?.saveStatus==='saved'?'端末に保存 SAVED':'セーブ不可';});

// Optional app-owned glyph pack, pinned in index.html via data-glyph-pack-* attributes.
void loadConfiguredGlyphPack().then(status=>{
 if(status.status==='loaded'){
  model.homePreview?.swap('player',model.glyph,model.font);model.homePreview?.draw();
  if(model.screen==='glyph')render();
 }
}).catch(error=>console.warn('R7 glyph pack unavailable; using local font fallback:',error.message));

// R17: opponent changes are handled by the strict prepare preflight above (never truncate input).
window.MojiBladeR17Prepare={status:()=>preflight.snapshot()};
window.MojiBladeR20Profile={open:()=>show('profile'),read:()=>readPlayerProfile()};
window.MojiBladeR21Collection={open:()=>show('collection'),read:()=>readCollectionView()};
window.MojiBladeR22Detail={open:openDetail,measure:measureFontVariants};
window.MojiBladeR23Lab={open:openLab,inspect:inspectLab};
window.MojiBladeR24Ranking={open:openRanking,inspect:rankGlyphs};
window.addEventListener('hashchange',()=>{if(location.hash==='#glyph-ranking'){openRanking(DEFAULT_RANKING,model.screen);return;}if(location.hash==='#stages'){show('stages');return;}if(location.hash==='#modes'){show('modes');return;}const lab=parseLabHash(location.hash);if(lab){openLab(lab);return;}const target=parseDetailHash(location.hash);if(target){openDetail(target.glyph,target.font);}else if(location.hash==='#collection'&&model.screen!=='collection'){show('collection');}});
if(location.hash==='#profile')show('profile');
if(location.hash==='#collection')show('collection');
if(location.hash==='#stages')show('stages');
if(location.hash==='#modes')show('modes');
if(location.hash==='#glyph-ranking')openRanking(DEFAULT_RANKING,'home');
const deepLink=parseDetailHash(location.hash);if(deepLink)openDetail(deepLink.glyph,deepLink.font);
const labDeepLink=parseLabHash(location.hash);if(labDeepLink)openLab(labDeepLink);
