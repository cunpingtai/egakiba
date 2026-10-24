/** R22: Detail of one glyph across the four *real* V2 font libraries.
 * Never publish estimated stats, 'best font' claims, or inferred discoveries.
 * Hash route only; not a server-rendered or indexable SEO detail URL.
 */
import {loadClassicLibrary,classicGlyphMetrics} from './classic-v2-adapter.mjs';
import {deriveNativeStats} from './native-hp-rules.mjs';
import {parseGlyphDraft,R16_FONTS} from './r16-glyph-contract.mjs';
import {collectionIdentity} from './r21-glyph-collection.mjs';
import {escapeResult} from './r19-result-report.mjs';
export const R22_FONTS=Object.freeze([...R16_FONTS]);
const esc=escapeResult;
const copy={
 ja:{lab:'文字対決ラボ',title:'文字ブレードの文字詳細',intro:'文字ブレードで使う同じ文字を4種類の書体で比較し、原本の字形データから速度・パワー・バランス・HPを確認します。',back:'文字図鑑へ戻る',local:'ローカル研究 · ランキング対象外',font:'書体',used:'使用済み',new:'未使用',favorite:'お気に入り',fav:'お気に入りに追加',unfav:'お気に入り解除',play:'この文字で対戦',loading:'原本の字形データを検査しています…',unavailable:'元の書体ファイルを読み込めません',unsupported:'この書体は対象文字に非対応',speed:'速度',power:'パワー',balance:'バランス',hp:'HP（ストーリー）',metric:'同じ字形を、書体別に測定',diff:'選択した書体との差分',measured:'字形データによる計算値。勝率や強さの順位ではありません。',warning:'字形の対応状況は原本データによります。未検証の値は表示しません。',saved:'お気に入りを更新しました',storeFail:'保存できません',share:'ページへのリンクをコピー',copied:'リンクをコピーしました',copyFail:'コピーできません。URLを直接コピーしてください。',retry:'再検査'},
 zh:{lab:'文字对比实验室',title:'文字详情与字体比较',intro:'比较同一文字在四种字体中的字形参数，查看速度、力量、平衡与故事模式HP。',back:'返回文字图鉴',local:'本机研究 · 不参与排行',font:'字体',used:'已用于战斗',new:'尚未使用',favorite:'已收藏',fav:'加入收藏',unfav:'取消收藏',play:'用这个文字对战',loading:'正在读取四种字体的真实字形…',unavailable:'原始字体资源不可用',unsupported:'该字体不支持此文字',speed:'速度',power:'力量',balance:'平衡',hp:'HP（故事模式）',metric:'同字不同字体 · 原生属性',diff:'相对当前字体的差值',measured:'由字形推导的属性，不等于实测胜率或最强排名。',warning:'原始字体缺失或不支持时不展示推测值；此页面使用本地记录。',saved:'已更新收藏',storeFail:'无法保存到本机',share:'复制此文字详情链接',copied:'链接已复制',copyFail:'复制失败，请直接复制地址栏链接',retry:'重新读取'},
 en:{lab:'Glyph comparison lab',title:'Moji Blade glyph details',intro:'Compare one glyph across four typefaces using original geometry to inspect speed, power, balance and Story HP. No guessed values.',back:'Back to collection',local:'Local research · Not ranked',font:'Font',used:'Used in battle',new:'Not played',favorite:'Favorite',fav:'Save favorite',unfav:'Remove favorite',play:'Use this glyph',loading:'Checking original glyph data for four fonts…',unavailable:'Original font data unavailable',unsupported:'Glyph not supported in this font',speed:'Speed',power:'Power',balance:'Balance',hp:'HP (Story)',metric:'One glyph · four font variants',diff:'Difference from selected font',measured:'Derived stats are not win rates or rankings.',warning:'Unsupported/missing fonts show no estimated values. Your play records remain local.',saved:'Favorite updated',storeFail:'Local storage unavailable',share:'Copy detail link',copied:'Link copied',copyFail:'Copy failed. Copy the address manually.',retry:'Retry measurement'},
 ko:{lab:'글자 비교 실험실',title:'문자 블레이드 글자 상세',intro:'하나의 글자를 네 가지 서체에서 비교하고 원본 형태 데이터로 속도, 파워, 균형과 스토리 HP를 확인합니다.',back:'도감으로 돌아가기',local:'로컬 연구 · 랭킹 제외',font:'서체',used:'배틀 사용',new:'미사용',favorite:'즐겨찾기',fav:'즐겨찾기 추가',unfav:'즐겨찾기 해제',play:'이 글자로 배틀',loading:'네 가지 원본 글꼴 확인 중…',unavailable:'원본 글꼴 파일 없음',unsupported:'해당 글자 미지원',speed:'속도',power:'파워',balance:'균형',hp:'HP (스토리)',metric:'같은 글자의 서체별 능력',diff:'선택한 서체와의 차이',measured:'글자 형태에서 계산된 값이며 승률이나 순위가 아닙니다.',warning:'지원하지 않거나 글꼴이 없으면 추측값을 표시하지 않습니다.',saved:'즐겨찾기 갱신됨',storeFail:'저장 불가',share:'상세 링크 복사',copied:'링크 복사됨',copyFail:'복사 실패. 주소를 직접 복사하세요.',retry:'다시 확인'}
};
export const detailCopy=locale=>copy[locale]||copy.ja;
export function detailHash(glyph,font='gothic'){
 const g=parseGlyphDraft(glyph);if(!g.ok||!R22_FONTS.includes(font))return null;
 return `#glyph/${encodeURIComponent(g.glyph)}/${font}`;
}
export function parseDetailHash(hash){
 if(typeof hash!=='string'||hash.length>200||!hash.startsWith('#glyph/'))return null;
 const parts=hash.slice(7).split('/');if(parts.length!==2)return null;
 try{const glyph=decodeURIComponent(parts[0]),font=parts[1];const valid=parseGlyphDraft(glyph);
  if(!valid.ok||!R22_FONTS.includes(font)||parts[0]!==encodeURIComponent(valid.glyph))return null;
  return {glyph:valid.glyph,font};
 }catch{return null;}
}
/** Per-font errors are independent. Runtime loader may be injected for unit tests. */
export async function measureFontVariants(glyph,{loader=loadClassicLibrary}={}){
 const selected=parseGlyphDraft(glyph);if(!selected.ok)return {status:'invalid',rows:[]};
 const rows=await Promise.all(R22_FONTS.map(async font=>{
  try{
   const lib=await loader(font);
   if(!lib?.supports?.(selected.glyph))return {font,status:'unsupported',stats:null};
   const shape=lib.get(selected.glyph,'mixed');const s=deriveNativeStats(shape,classicGlyphMetrics(shape));
   if(![s.speed,s.power,s.balance,s.maxHp].every(Number.isFinite))throw Error('Invalid metrics');
   return {font,status:'ready',stats:{speed:s.speed,power:s.power,balance:s.balance,hp:s.maxHp}};
  }catch{return {font,status:'unavailable',stats:null};}
 }));
 return {status:'complete',glyph:selected.glyph,rows};
}
export function metricDelta(row,baseline){
 if(row?.status!=='ready'||baseline?.status!=='ready')return null;
 return Object.fromEntries(['speed','power','balance','hp'].map(k=>[k,row.stats[k]-baseline.stats[k]]));
}
export function detailHTML({glyph,font='gothic',rows=[],loading=false,items=[],storageStatus='available'},locale='ja'){
 const c=detailCopy(locale),selected=items.find(x=>x.glyph===glyph&&x.font===font),base=rows.find(x=>x.font===font),record=selected||{discovered:false,favorite:false,plays:0};
 const badge=record.discovered?c.used:c.new;
 const getRow=id=>rows.find(r=>r.font===id)||{font:id,status:loading?'loading':'unavailable',stats:null};
 const tab=R22_FONTS.map(id=>`<button type="button" data-r22-font="${id}" class="r22-tab ${id===font?'active':''}" aria-pressed="${id===font}">${esc(id.toUpperCase())}<small>${esc(getRow(id).status==='ready'?'✓':getRow(id).status==='loading'?'…':'—')}</small></button>`).join('');
 const stats=(r)=>['speed','power','balance','hp'].map(key=>`<div class="r22-number"><span>${esc(c[key])}</span><strong>${r.status==='ready'?esc(r.stats[key]):'—'}</strong></div>`).join('');
 const delta=(r)=>{const d=metricDelta(r,base);return d?['speed','power','balance','hp'].map(k=>`<span title="${esc(c[k])}">${esc(c[k])} <b>${d[k]>0?'+':''}${d[k]}</b></span>`).join(''):'—';};
 const table=R22_FONTS.map(id=>{const r=getRow(id),active=id===font;return `<div class="r22-matrix-row ${active?'is-selected':''}" data-r22-row="${id}"><div class="r22-matrix-label"><strong>${esc(id.toUpperCase())}</strong><small>${r.status==='ready'?'✓':r.status==='loading'?'…':esc(c[r.status]||c.unavailable)}</small></div>${['speed','power','balance','hp'].map(k=>`<span class="r22-table-number">${r.status==='ready'?esc(r.stats[k]):'—'}</span>`).join('')}<button type="button" data-r22-font="${id}" aria-label="${esc(c.font)}: ${id}">${active?'●':'↗'}</button></div>`;}).join('');
 return `<div class="r22-detail"><header class="flow-heading r22-top"><div><span class="flow-kicker">GLYPH DETAILS / R22</span><h1 tabindex="-1">${esc(c.title)} · ${esc(glyph)}</h1><p>${esc(c.intro)}</p></div><span class="flow-status">${esc(c.local)}</span></header>
 <div class="r22-layout"><section class="r22-hero"><button type="button" data-r22-back class="r22-back">← ${esc(c.back)}</button><div class="r22-symbol" aria-label="${esc(glyph)}">${esc(glyph)}</div><div class="r22-character"><strong>${esc(glyph)}</strong><span>${esc(font.toUpperCase())}</span></div><div class="r22-tags"><span>${esc(badge)}</span>${record.favorite?`<span>★ ${esc(c.favorite)}</span>`:''}${record.plays>0?`<span>${record.plays} recent</span>`:''}</div><div class="r22-tab-grid">${tab}</div>
 <div class="r22-hero-stats" aria-live="polite">${base?.status==='ready'?`<div class="r22-numbers">${stats(base)}</div>`:`<p role="status">${esc(c[base?.status]||c.loading)}</p>`}</div><div class="r22-actions"><button type="button" data-r22-favorite ${storageStatus!=='available'?'disabled':''}>${esc(record.favorite?c.unfav:c.fav)} ★</button><button type="button" class="r22-play" data-r22-use ${base?.status==='ready'?'':'disabled'}>${esc(c.play)} ↗</button></div><p id="r22-feedback" role="status" aria-live="polite"></p></section>
 <section class="r22-research"><div class="r22-research-header"><div><span class="flow-kicker">FONT COMPARISON</span><h2>${esc(c.metric)}</h2></div><button type="button" data-r22-retry>${esc(c.retry)} ↻</button></div><p class="r22-note">${esc(c.measured)}</p><div class="r22-table" role="group" aria-label="${esc(c.metric)}"><div class="r22-matrix-row r22-table-header"><span>${esc(c.font)}</span>${['speed','power','balance','hp'].map(k=>`<span>${esc(c[k])}</span>`).join('')}<span>↗</span></div>${table}</div><div class="r22-delta"><h3>${esc(c.diff)} · ${esc(font)}</h3>${R22_FONTS.filter(id=>id!==font).map(id=>`<div><strong>${esc(id.toUpperCase())}</strong><span>${delta(getRow(id))}</span></div>`).join('')}</div><p class="r22-warning">${esc(c.warning)}</p><button type="button" data-r23-open class="r22-share">⚖ ${esc(c.lab)} ↗</button><button type="button" data-r24-open-ranking class="r22-share">▤ ${esc(({ja:'文字能力リサーチ',zh:'最强文字研究',en:'Glyph rankings',ko:'글자 능력 연구'})[locale]||'文字能力リサーチ')} ↗</button><button type="button" data-r22-share class="r22-share">${esc(c.share)} <span aria-hidden="true">↗</span></button></section></div></div>`;
}
