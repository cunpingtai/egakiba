/** Free glyph entry, native stat inspection and side-by-side comparison.
 * Uses the uploaded V2 GlyphLibrary. No illustrative fake stat values.
 */
import {loadClassicLibrary,classicGlyphMetrics} from './engine/classic-v2-adapter.mjs';
import {deriveNativeStats} from './engine/native-hp-rules.mjs';
import {battleIndex,statComparison} from './engine/battle-index-r10.mjs';
import {parseGlyphDraft,createGlyphValidationGate,glyphSelectionKey} from './engine/r16-glyph-contract.mjs';
const $=selector=>document.querySelector(selector);
const text={
 ja:{input:'好きな文字を入力',homeButton:'この文字で遊ぶ ↗',hint:'漢字・かな・アルファベットもOK。書体によって使えない文字があります。',multi:'一文字だけ入力してください。',empty:'文字を1つ入力してね。',invalid:'この書体で使える文字を入力してね。',wait:'文字の強さを調べています…',score:'この文字の戦力',index:'バトル指数',ready:'強さを比べよう！',error:'文字のデータを読み込めません。書体を変えてみてね。',compare:'力比べ',note:'この指数は文字の形状から求めた目安です。勝率や相性を保証するものではありません。',none:'クラシックではHPなし',tie:'似た実力',left:'自分の文字が優勢',right:'相手の文字が優勢'},
 zh:{input:'输入你想用的字',homeButton:'用这个字开战 ↗',hint:'支持汉字、假名、英文字母；具体取决于所选字体。',multi:'请只输入一个文字。',empty:'请输入一个文字。',invalid:'当前字体不支持这个文字，试试换一个。',wait:'正在计算真实字形属性…',score:'当前文字战力',index:'综合战力',ready:'对比已经完成',error:'无法读取字形数据，请换个字或字体。',compare:'实力对比',note:'综合战力是字形属性的参考指数，不代表胜率，也不包含操作和克制关系。',none:'经典对战没有 HP',tie:'实力接近',left:'当前文字属性更高',right:'对比文字属性更高'},
 en:{input:'Type your own glyph',homeButton:'Battle with this glyph ↗',hint:'Kanji, kana, Latin letters—subject to available typefaces.',multi:'Enter exactly one glyph.',empty:'Enter one character.',invalid:'Unsupported by this typeface. Try another glyph or font.',wait:'Reading real glyph geometry…',score:'Glyph battle index',index:'Battle index',ready:'Comparison ready',error:'Glyph data unavailable. Try another glyph or typeface.',compare:'Stat comparison',note:'A weighted index of measured glyph attributes—not a win-rate prediction or an advantage guarantee.',none:'No HP in Classic rules',tie:'Similar attributes',left:'Your glyph has the higher index',right:'Challenger has the higher index'},
 ko:{input:'원하는 글자를 입력',homeButton:'이 글자로 배틀 ↗',hint:'한자·가나·영문 지원. 서체에 따라 제한될 수 있습니다.',multi:'글자 하나만 입력하세요.',empty:'글자를 입력해 주세요.',invalid:'이 서체에서 지원하지 않는 글자입니다.',wait:'실제 글자 능력을 계산 중…',score:'글자 전투 지수',index:'전투 지수',ready:'비교 완료',error:'글자 데이터를 불러올 수 없습니다. 다른 글자를 입력해 주세요.',compare:'능력 비교',note:'형태 기반 참고 지수이며 승률이나 유불리를 보장하지 않습니다.',none:'클래식에는 HP 없음',tie:'비슷한 능력',left:'내 글자의 지수가 높음',right:'비교 글자의 지수가 높음'}
};
const getLocale=()=>$('#locale-select')?.value||'ja';
const msg=()=>text[getLocale()]||text.ja;
const segment=str=>{const draft=parseGlyphDraft(str);return {glyph:draft.ok?draft.glyph:'',multi:draft.reason==='multiple'};};
const isVisible=str=>Boolean(str&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(str)&&str.trim());
let request=0,initialised=false,current={glyph:'文',font:'gothic',mode:'story'};
let challenger={glyph:'剣',font:'gothic'};
let inputTimer=0;
const selectionGate=createGlyphValidationGate(async ({glyph,font,mode})=>nativeStats(glyph,font,mode));
const cache=new Map();
async function nativeStats(glyph,font,mode){
 const key=[glyph,font,mode].join('|');if(cache.has(key))return cache.get(key);
 const lib=await loadClassicLibrary(font);
 if(!lib.supports(glyph))throw Error('unsupported glyph');
 const loaded=lib.get(glyph,'mixed');
 const numbers=deriveNativeStats(loaded,classicGlyphMetrics(loaded));
 const stats=mode==='quick'?{speed:numbers.speed,power:numbers.power,balance:numbers.balance,hp:null}:{speed:numbers.speed,power:numbers.power,balance:numbers.balance,hp:numbers.maxHp};
 cache.set(key,stats);return stats;
}
function el(tag,className='',content=''){const node=document.createElement(tag);if(className)node.className=className;node.textContent=content;return node;}
function setPlayable(allowed){if($('#flow-page')?.hidden)return;const button=$('#flow-content [data-continue="prepare"]');const draft=$('#glyph-input');const validDraft=!draft||parseGlyphDraft(draft.value).glyph===current.glyph;const ready=allowed&&validDraft;if(button){button.disabled=!ready;button.setAttribute('aria-disabled',String(!ready));}}
function progress(primary,secondary,lang,mode){
 const root=$('#compare-stat-rows');if(!root)return;
 root.replaceChildren();
 for(const metric of statComparison(primary,secondary,mode)){
  const name={speed:{ja:'スピード',zh:'速度',en:'Speed',ko:'속도'},power:{ja:'パワー',zh:'力量',en:'Power',ko:'파워'},hp:{ja:'HP',zh:'血量',en:'HP',ko:'체력'},balance:{ja:'安定',zh:'平衡',en:'Balance',ko:'균형'}}[metric.key][lang];
  const row=el('div','compare-metric');
  const lhs=el('strong','compare-lhs',String(metric.player));const rhs=el('strong','compare-rhs',String(metric.rival));
  const title=el('span','compare-metric-title',name);
  const tracks=el('div','compare-track-pair');
  for(const [which,val] of [['player',metric.player],['rival',metric.rival]]){
   const rail=el('div','compare-rail compare-rail--'+which);
   const fill=el('span','compare-rail-fill');fill.style.width=Math.round(100*Math.max(0,Math.min(1,val/metric.max)))+'%';rail.append(fill);tracks.append(rail);
  }
  if(metric.difference>0)row.dataset.leader='player';else if(metric.difference<0)row.dataset.leader='rival';
  row.append(lhs,title,rhs,tracks);root.append(row);
 }
}
function errorText(reason,glyph,mode){const note=$('#compare-feedback');if(note)note.textContent=reason;const power=$('#glyph-power-score');if(power)power.textContent='—';const score=$('#home-battle-rating strong');if(score&&glyph===current.glyph)score.textContent='—';setPlayable(false);}
const statusWords={
 ja:{loading:'実際の字形データを確認しています…',ready:'この文字と書体で戦えます。',unsupported:'この書体に文字がありません。別の書体を選んでください。',unavailable:'書体データを読み込めません。フォントをインストールして再試行してください。',invalid:'一文字だけ入力してください。',empty:'文字を入力してください。'},
 zh:{loading:'正在读取真实字形数据…',ready:'字形已验证，可以进入战斗。',unsupported:'当前字体不支持这个文字，请更换字体。',unavailable:'字体数据不可用，请安装原始字体后重试。',invalid:'请只输入一个可见文字。',empty:'请输入文字。'},
 en:{loading:'Checking measured glyph data…',ready:'Glyph verified. Ready to fight.',unsupported:'This font does not support the glyph. Try another font.',unavailable:'Font data unavailable. Install the original font pack and retry.',invalid:'Enter exactly one visible glyph.',empty:'Enter a glyph.'},
 ko:{loading:'실제 글자 데이터를 확인하는 중…',ready:'이 글자로 전투할 수 있습니다.',unsupported:'이 서체는 해당 글자를 지원하지 않습니다.',unavailable:'서체 데이터를 읽을 수 없습니다. 원본 폰트를 설치하세요.',invalid:'표시 가능한 글자 하나만 입력하세요.',empty:'글자를 입력하세요.'}
};
function markStatus(state,reason=''){
 const status=$('#r16-glyph-status');const field=$('#glyph-input');const words=statusWords[getLocale()]||statusWords.ja;
 if(status){status.dataset.state=state;status.textContent=state==='loading'?words.loading:state==='ready'?words.ready:words[reason]||words.invalid;}
 if(field)field.setAttribute('aria-invalid',String(state==='invalid'));
}
function populateNativeStats(stats,mode){
 const rows=$('#flow-content .stats-preview');if(!rows)return;
 for(const [metric,value] of Object.entries(stats)){
  const row=rows.querySelector(`[data-metric="${metric}"]`);if(!row)continue;
  row.querySelector('strong').textContent=value===null?'—':String(value);
  row.querySelector('i').style.width=value===null?'0%':Math.min(100,Math.max(0,value))+'%';
 }
 const badge=rows.querySelector('.stats-title span');if(badge)badge.textContent=mode==='quick'?'CLASSIC':'ARENA HP';
 const note=rows.querySelector('#glyph-stats-note');if(note)note.textContent=msg().note+(mode==='quick'?' · '+msg().none:'');
}
function emptyNativeStats(){
 const rows=$('#flow-content .stats-preview');if(!rows)return;
 rows.querySelectorAll('.r2-stat strong').forEach(n=>n.textContent='—');
 rows.querySelectorAll('.r2-stat i').forEach(n=>n.style.width='0%');
 const score=$('#glyph-power-score');if(score)score.textContent='—';
}
async function inspect(){
 const id=++request,loc=getLocale(),lang=text[loc]?loc:'ja',m=text[lang],mode=current.mode;
 const compare=$('#glyph-compare'),inGlyph=Boolean(compare),selection={glyph:current.glyph,font:current.font,mode};
 if(inGlyph){setPlayable(false);emptyNativeStats();markStatus('loading');const feedback=$('#compare-feedback');if(feedback)feedback.textContent=m.wait;$('#compare-player-index').textContent='…';$('#compare-rival-index').textContent='…';}
 const draft=$('#glyph-input');if(inGlyph&&(!parseGlyphDraft(draft.value).ok||parseGlyphDraft(draft.value).glyph!==current.glyph)){selectionGate.invalidate();markStatus('invalid','invalid');setPlayable(false);return;}
 const result=await selectionGate.verify(selection);
 if(id!==request)return;
 if(result.status!=='ready'){
  errorText((statusWords[lang]||statusWords.ja)[result.reason]||m.error,current.glyph,mode);
  if(inGlyph){emptyNativeStats();markStatus('invalid',result.reason);$('#compare-player-index').textContent='—';$('#compare-rival-index').textContent='—';$('#compare-stat-rows').replaceChildren();const field=$('#glyph-input-error');if(field)field.textContent=(statusWords[lang]||statusWords.ja)[result.reason]||m.error;}
  return;
 }
 const player=result.data,rating=battleIndex(player,mode);
 const homePower=$('#home-battle-rating');if(homePower){homePower.querySelector('small').textContent=m.score;homePower.querySelector('strong').textContent=String(rating);homePower.querySelector('span').textContent=m.index;}
 if(!inGlyph)return;
 populateNativeStats(player,mode);markStatus('ready');setPlayable(true);
 const errorField=$('#glyph-input-error');if(errorField)errorField.textContent='';
 $('#glyph-power-score').textContent=String(rating);
 $('#glyph-power-tier').textContent=m.index+' · '+(mode==='quick'?'Classic':'HP Arena');
 $('#compare-player-symbol').textContent=current.glyph;
 $('#compare-player-font').textContent=current.font.toUpperCase();
 $('#compare-player-index').textContent=String(rating);
 if(!isVisible(challenger.glyph)){$('#compare-feedback').textContent=m.empty;$('#compare-rival-index').textContent='—';$('#compare-stat-rows').replaceChildren();return;}
 try{
  const rival=await nativeStats(challenger.glyph,challenger.font,mode);
  if(id!==request)return;
  const challengerIndex=battleIndex(rival,mode);$('#compare-rival-index').textContent=String(challengerIndex);
  progress(player,rival,lang,mode);
  const diff=rating-challengerIndex;
  $('#compare-feedback').textContent=`${Math.abs(diff)<=2?m.tie:diff>0?m.left:m.right} · ${rating} : ${challengerIndex}　${m.note}`;
 }catch{if(id===request){$('#compare-rival-index').textContent='—';$('#compare-stat-rows').replaceChildren();$('#compare-feedback').textContent=m.invalid;}}
}
window.MojiBladeR16Glyph={
 readyFor:(selection)=>selectionGate.isReady(selection)&&(!$('#glyph-input')||parseGlyphDraft($('#glyph-input').value).glyph===selection.glyph),
 invalidate:()=>{selectionGate.invalidate();++request;},
 async verifyForLaunch(selection){const state=await selectionGate.verify(selection);return state.status==='ready'&&state.key===glyphSelectionKey(selection);},
 status:()=>selectionGate.snapshot()
};
function applySelection(glyph){const ch=segment(glyph).glyph;if(!isVisible(ch))return false;
 if(window.MojiHomeV1?.selectGlyph)window.MojiHomeV1.selectGlyph(ch);
 else document.dispatchEvent(new CustomEvent('moji:glyph-changed',{detail:{glyph:ch}}));
 current.glyph=ch;const homeInput=$('#home-glyph-input');if(homeInput)homeInput.value=ch;
 const flowInput=$('#glyph-input');if(flowInput)flowInput.value=ch;
 void inspect();return true;
}
function homeInput(){
 const input=$('#home-glyph-input'),form=$('#home-glyph-form');if(!input||!form)return;
 form.addEventListener('submit',e=>{
  e.preventDefault();const part=segment(input.value);
  if(!isVisible(part.glyph)){$('#home-glyph-help').textContent=part.multi?msg().multi:msg().empty;input.setAttribute('aria-invalid','true');input.focus();return;}
  if(applySelection(part.glyph)){input.setAttribute('aria-invalid','false');
   document.dispatchEvent(new CustomEvent('moji:navigate',{detail:{screen:'glyph',mode:'story'}}));
  }
 });
 input.addEventListener('input',e=>{
  if(e.isComposing)return;clearTimeout(inputTimer);
  inputTimer=setTimeout(()=>{const v=segment(input.value);if(isVisible(v.glyph)){applySelection(v.glyph);input.setAttribute('aria-invalid','false');$('#home-glyph-help').textContent=msg().hint;}else{input.setAttribute('aria-invalid','true');$('#home-glyph-help').textContent=v.multi?msg().multi:msg().empty;}},250);
 });
 input.addEventListener('compositionend',()=>{const v=segment(input.value);if(isVisible(v.glyph))applySelection(v.glyph);});
 input.addEventListener('blur',()=>{input.value=segment(input.value).glyph||current.glyph;});
}
function attachComparator(){
 const root=$('#glyph-compare');if(!root)return;
 const input=$('#compare-rival-input'),font=$('#compare-rival-font');
 input.value=challenger.glyph;font.value=challenger.font;
 input.addEventListener('input',e=>{if(e.isComposing)return;challenger.glyph=segment(input.value).glyph;void inspect();});
 input.addEventListener('compositionend',()=>{challenger.glyph=segment(input.value).glyph;void inspect();});
 input.addEventListener('blur',()=>{input.value=segment(input.value).glyph||challenger.glyph;});
 font.addEventListener('change',()=>{challenger.font=font.value;void inspect();});
 $('#compare-use-rival').addEventListener('click',()=>{const part=segment(input.value);if(!isVisible(part.glyph))return;applySelection(part.glyph);document.dispatchEvent(new CustomEvent('moji:r10-use-font',{detail:{font:challenger.font,glyph:part.glyph}}));});
 $('#compare-swap').addEventListener('click',()=>{const prev={...current};const otherFont=challenger.font;applySelection(challenger.glyph);document.dispatchEvent(new CustomEvent('moji:r10-use-font',{detail:{font:otherFont,glyph:challenger.glyph}}));challenger.glyph=prev.glyph;challenger.font=prev.font;input.value=challenger.glyph;font.value=challenger.font;void inspect();});
}
// Treat the existing flow controller as source of truth, do not create parallel game state.
document.addEventListener('moji:r8-flow',e=>{
 const payload=e.detail?.payload;if(!payload?.player)return;
 current={glyph:payload.player.char,font:payload.player.fontId,mode:payload.mode};
 attachComparator();void inspect();
});
document.addEventListener('moji:glyph-changed',e=>{const g=segment(e.detail?.glyph).glyph;if(g){current.glyph=g;const field=$('#home-glyph-input');if(field&&document.activeElement!==field)field.value=g;void inspect();}});
document.addEventListener('moji:glyph-selected',e=>{const glyph=e.detail?.glyph;current={glyph,font:e.detail.font,mode:e.detail.mode};void inspect();});
// Font selection via challenger: reuse existing flow button so the actual native Battle uses it.
document.addEventListener('moji:r10-use-font',e=>{
 const chosen=$(`#flow-content [data-font-next="${e.detail.font}"]`);
 if(chosen)chosen.click();
});
$('#locale-select')?.addEventListener('change',()=>{const m=msg(),label=$('#home-glyph-label');if(label)label.textContent=m.input;const button=$('#home-use-glyph');if(button)button.textContent=m.homeButton;const note=$('#home-glyph-help');if(note)note.textContent=m.hint;void inspect();});
homeInput();
try{const data=JSON.parse(localStorage.getItem('moji-blade.v3.r2.preview')||'null');if(data?.glyph)current.glyph=segment(data.glyph).glyph;if(data?.font)current.font=data.font;}catch{}
if($('#home-glyph-input'))$('#home-glyph-input').value=current.glyph;
void inspect();
