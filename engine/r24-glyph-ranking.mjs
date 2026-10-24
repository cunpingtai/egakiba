/** R24: local, font-specific glyph attribute research. Never implies empirical win rates or global rankings. */
import { loadClassicLibrary, classicGlyphMetrics } from './classic-v2-adapter.mjs';
import { deriveNativeStats } from './native-hp-rules.mjs';
import { parseGlyphDraft, R16_FONTS } from './r16-glyph-contract.mjs';
import { SUGGESTED_GLYPHS, glyphCategory } from './r21-glyph-collection.mjs';
import { escapeResult } from './r19-result-report.mjs';

export const R24_METRICS = Object.freeze(['speed', 'power', 'balance', 'hp']);
export const R24_CATEGORIES = Object.freeze(['all', 'han', 'kana', 'latin', 'other']);
export const DEFAULT_RANKING = Object.freeze({ font: 'gothic', metric: 'power', category: 'all', query: '', direction: 'desc' });
export const R24_SAMPLE_GLYPHS = Object.freeze([...new Set(SUGGESTED_GLYPHS.map(x => parseGlyphDraft(x)).filter(x => x.ok).map(x => x.glyph))]);

const copy = {
 ja: {title:'文字ブレード最強・最弱文字研究',intro:'文字ブレードの最強・最弱候補を、書体別の速度・パワー・バランス・ストーリーHPで比較します。Tier表を考えるための属性参考であり、対象は図鑑の候補文字に限られます。全Unicodeの総合順位や実戦勝率ではありません。',badge:'ローカル研究 · 世界ランキングではありません',note:'この順位は図鑑の候補文字のうち、選択した書体で実測できた文字だけの比較です。全Unicodeの最強ランキングでも、実戦の勝率でもありません。',font:'書体',metric:'並べる能力',category:'文字分類',query:'候補文字を検索',direction:'並び順',desc:'高い順',asc:'低い順',all:'すべて',han:'漢字',kana:'かな',latin:'英字・数字',other:'記号',speed:'速度',power:'パワー',balance:'バランス',hp:'HP（ストーリー参考）',scan:'原本データを再確認',loading:'原本の書体を読み込み、候補を検証中…',ready:'検証済みの文字だけを順位に含めています。',unavailable:'原本の書体データを読み込めません。数値を推測せず、順位を作成しません。',empty:'条件に一致する候補文字がありません。',noVerified:'この条件で属性を検証できた文字はありません。',verified:'検証済み',candidates:'候補',unsupported:'非対応',unavailableCount:'未読込',rank:'候補内順位',glyph:'文字',value:'属性値',details:'文字の詳細',compare:'対比する',tip:'属性値は字形から導いた参考値です。実際の勝敗は発射角度、回転、接触、操作と物理演算で変わります。',sample:'候補セット',sampleCount:'文字',source:'原本 V2 字形データ · 書体別',back:'モードへ戻る',lab:'文字対比ラボ',clear:'検索をクリア'},
 zh: {title:'最强与最弱文字属性研究',intro:'按字体比较候选文字的速度、力量、平衡与故事模式HP，可作为制作Tier表的属性参考。范围仅限图鉴候选文字，并非全部Unicode文字的综合排名或实战胜率。',badge:'本地属性研究 · 非全球排行榜',note:'排名只比较图鉴候选集内、当前字体成功验证的文字。它不是所有 Unicode 文字的最强排名，也不是实际对战胜率。',font:'字体',metric:'排序属性',category:'文字分类',query:'搜索候选文字',direction:'排序方向',desc:'从高到低',asc:'从低到高',all:'全部分类',han:'汉字',kana:'假名',latin:'字母与数字',other:'符号',speed:'速度',power:'力量',balance:'平衡',hp:'HP（故事模式参考）',scan:'重新验证原始数据',loading:'正在读取原始字体并验证候选文字…',ready:'排名只包含已成功验证的文字。',unavailable:'无法读取原始字体资源。不会猜测数值或生成排名。',empty:'没有符合当前条件的候选文字。',noVerified:'当前条件下没有成功验证属性的文字。',verified:'已验证',candidates:'候选文字',unsupported:'不支持',unavailableCount:'无法读取',rank:'样本内名次',glyph:'文字',value:'属性值',details:'文字详情',compare:'进行对比',tip:'属性值是根据字形推导的参考值。实际胜负还取决于发射角度、旋转、碰撞、操作和物理模拟。',sample:'候选集合',sampleCount:'个候选文字',source:'原始 V2 字形数据 · 按字体独立计算',back:'返回模式',lab:'文字对比实验室',clear:'清除搜索'},
 en: {title:'Moji Blade strongest and weakest glyph research',intro:'Compare verified glyph candidates by typeface, speed, power, balance and Story HP. Use these metrics as a reference for a Tier list, not as a universal Unicode ranking or empirical win rate.',badge:'Local attribute research · Not a global leaderboard',note:'Ranks compare only candidates in this curated collection whose metrics verify for the selected font. This is not a universal Unicode ranking or an empirical battle win rate.',font:'Typeface',metric:'Rank by attribute',category:'Glyph category',query:'Search candidate glyphs',direction:'Sort order',desc:'Highest first',asc:'Lowest first',all:'All categories',han:'Han characters',kana:'Kana',latin:'Letters & digits',other:'Symbols',speed:'Speed',power:'Power',balance:'Balance',hp:'HP (Story reference)',scan:'Recheck native data',loading:'Loading original font and verifying candidates…',unavailable:'Original font data could not be loaded. No estimated values or ranking are shown.',empty:'No candidate glyphs match these filters.',noVerified:'No glyph metrics could be verified for these options.',ready:'Only verified glyphs are included in the ranking.',verified:'Verified',candidates:'Candidates',unsupported:'Unsupported',unavailableCount:'Unavailable',rank:'Sample rank',glyph:'Glyph',value:'Attribute value',details:'Glyph details',compare:'Compare',tip:'These are geometry-derived reference metrics. Actual outcomes depend on launch angle, spin, contacts, controls and physics simulation.',sample:'Candidate set',sampleCount:'candidate glyphs',source:'Original V2 glyph data · computed per font',back:'Back to modes',lab:'Glyph comparison lab',clear:'Clear search'},
 ko: {title:'문자 블레이드 최강·최약 글자 연구',intro:'검증된 후보 글자를 서체별 속도, 파워, 균형과 스토리 HP로 비교합니다. Tier표 참고용 속성 비교이며 전체 유니코드 순위나 실제 승률이 아닙니다.',badge:'로컬 능력치 연구 · 전체 랭킹 아님',note:'순위는 도감 후보 중 선택한 서체에서 검증된 글자만 비교합니다. 모든 유니코드의 최강 순위나 실제 승률이 아닙니다.',font:'서체',metric:'정렬 능력치',category:'글자 분류',query:'후보 글자 검색',direction:'정렬 순서',desc:'높은 순',asc:'낮은 순',all:'전체',han:'한자',kana:'가나',latin:'영문·숫자',other:'기호',speed:'속도',power:'파워',balance:'균형',hp:'HP (스토리 참고)',scan:'원본 데이터 다시 확인',loading:'원본 글꼴을 불러와 후보를 확인 중…',unavailable:'원본 글꼴 데이터를 읽을 수 없습니다. 추정값이나 순위를 만들지 않습니다.',empty:'조건에 맞는 후보가 없습니다.',noVerified:'이 조건에서 능력치를 검증한 글자가 없습니다.',ready:'검증된 글자만 순위에 포함됩니다.',verified:'검증됨',candidates:'후보',unsupported:'미지원',unavailableCount:'읽을 수 없음',rank:'후보 내 순위',glyph:'글자',value:'능력치',details:'글자 상세',compare:'비교하기',tip:'능력치는 글자 형태에서 계산한 참고값입니다. 실제 결과는 발사 각도, 회전, 충돌, 조작과 물리 시뮬레이션에 따라 달라집니다.',sample:'후보 세트',sampleCount:'개 후보 글자',source:'원본 V2 글자 데이터 · 서체별 계산',back:'모드로 돌아가기',lab:'글자 비교 실험실',clear:'검색 지우기'}
};
export const rankingCopy = locale => copy[locale] || copy.ja;

export function normalizeRankingOptions(raw = {}) {
 const font = R16_FONTS.includes(raw.font) ? raw.font : DEFAULT_RANKING.font;
 const metric = R24_METRICS.includes(raw.metric) ? raw.metric : DEFAULT_RANKING.metric;
 const category = R24_CATEGORIES.includes(raw.category) ? raw.category : DEFAULT_RANKING.category;
 const direction = ['asc','desc'].includes(raw.direction) ? raw.direction : DEFAULT_RANKING.direction;
 const query = String(raw.query ?? '').normalize('NFC').trim().slice(0, 8);
 return Object.freeze({ font, metric, category, query, direction });
}

function metricsFor(glyph, lib) {
 if (!lib?.supports?.(glyph)) return { status: 'unsupported', stats: null };
 try {
  const shape = lib.get(glyph, 'mixed');
  const stats = deriveNativeStats(shape, classicGlyphMetrics(shape));
  const values = { speed: stats.speed, power: stats.power, balance: stats.balance, hp: stats.maxHp };
  if (Object.values(values).some(v => !Number.isFinite(v))) throw Error('non-finite native metric');
  return { status: 'ready', stats: values };
 } catch { return { status: 'unavailable', stats: null }; }
}

/** Ranks only verified native-derived metrics in a curated candidate subset. */
export async function rankGlyphs(rawOptions = {}, { loader = loadClassicLibrary, glyphs = R24_SAMPLE_GLYPHS } = {}) {
 const options = normalizeRankingOptions(rawOptions);
 const candidates = [...new Set(glyphs.map(g => parseGlyphDraft(g)).filter(x => x.ok).map(x => x.glyph))]
  .filter(g => (options.category === 'all' || glyphCategory(g) === options.category) && (!options.query || g.toLocaleLowerCase().includes(options.query.toLocaleLowerCase())));
 if (!candidates.length) return { status: 'empty', options, candidateCount: 0, verifiedCount: 0, unsupportedCount: 0, unavailableCount: 0, rows: [] };
 let lib;
 try { lib = await loader(options.font); }
 catch { return { status: 'unavailable', options, candidateCount: candidates.length, verifiedCount: 0, unsupportedCount: 0, unavailableCount: candidates.length, rows: candidates.map((glyph, index) => ({ glyph, font: options.font, status: 'unavailable', stats: null, rank: null, index })) }; }
 const rows = candidates.map((glyph, index) => ({ glyph, font: options.font, index, ...metricsFor(glyph, lib), rank: null }));
 const ready = rows.filter(row => row.status === 'ready').sort((a,b) => {
  const delta = a.stats[options.metric] - b.stats[options.metric];
  return delta === 0 ? a.index - b.index : options.direction === 'desc' ? -delta : delta;
 });
 let previousValue = null, previousRank = 0;
 ready.forEach((row, index) => {
  const value = row.stats[options.metric];
  row.rank = previousValue !== null && value === previousValue ? previousRank : index + 1;
  previousValue = value; previousRank = row.rank;
 });
 const rest = rows.filter(row => row.status !== 'ready');
 return { status: ready.length ? 'complete' : 'no-verified', options, candidateCount: candidates.length, verifiedCount: ready.length, unsupportedCount: rows.filter(r => r.status === 'unsupported').length, unavailableCount: rows.filter(r => r.status === 'unavailable').length, rows: [...ready, ...rest] };
}

export function createRankingInspector(inspect = rankGlyphs) {
 let revision = 0, state = Object.freeze({ status: 'idle', options: DEFAULT_RANKING, result: null });
 return {
  snapshot: () => state,
  invalidate() { revision++; state = Object.freeze({ status: 'idle', options: state.options, result: null }); return state; },
  async run(options) {
   const id = ++revision, clean = normalizeRankingOptions(options);
   state = Object.freeze({ status: 'loading', options: clean, result: null });
   try {
    const result = await inspect(clean);
    if (id === revision) state = Object.freeze({ status: result.status, options: clean, result });
   } catch {
    if (id === revision) state = Object.freeze({ status: 'unavailable', options: clean, result: { status: 'unavailable', options: clean, candidateCount: 0, verifiedCount: 0, unsupportedCount: 0, unavailableCount: 0, rows: [] } });
   }
   return state;
  }
 };
}

export function rankingHTML({ options = DEFAULT_RANKING, result = null, loading = false, feedback = '' } = {}, locale = 'ja') {
 const c = rankingCopy(locale), esc = escapeResult, o = normalizeRankingOptions(options);
 const opt = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
 const fontOptions = R16_FONTS.map(f => opt(f, f.toUpperCase(), o.font)).join('');
 const metricOptions = R24_METRICS.map(m => opt(m, c[m], o.metric)).join('');
 const categoryOptions = R24_CATEGORIES.map(cat => opt(cat, c[cat], o.category)).join('');
 const directionOptions = ['desc','asc'].map(d => opt(d, c[d], o.direction)).join('');
 const complete = result && ['complete','no-verified','empty'].includes(result.status);
 const rows = result?.rows?.filter(r => r.status === 'ready') || [];
 const table = rows.map(row => `<article class="r24-rank-row"><span class="r24-rank-number">#${row.rank}</span><span class="r24-rank-glyph" aria-label="${esc(row.glyph)}">${esc(row.glyph)}</span><span class="r24-rank-font">${esc(row.font.toUpperCase())}</span><span class="r24-rank-score"><strong>${esc(row.stats[o.metric])}</strong><small>${esc(c[o.metric])}</small></span><span class="r24-rank-mini">${['speed','power','balance'].filter(k=>k!==o.metric).map(k=>`<small>${esc(c[k])} ${esc(row.stats[k])}</small>`).join('')}<small>${esc(c.hp)} ${esc(row.stats.hp)}</small></span><span class="r24-rank-actions"><button type="button" data-r24-detail="${esc(row.glyph)}" data-r24-font="${esc(row.font)}">${esc(c.details)}</button><button type="button" data-r24-compare="${esc(row.glyph)}" data-r24-font="${esc(row.font)}">${esc(c.compare)}</button></span></article>`).join('');
 const stateMessage = loading ? c.loading : result?.status === 'unavailable' ? c.unavailable : result?.status === 'empty' ? c.empty : result?.status === 'no-verified' || (complete && !rows.length) ? c.noVerified : result?.status === 'complete' ? c.ready : c.loading;
 return `<main class="r24-ranking"><header class="flow-heading r24-heading"><div><span class="flow-kicker">GLYPH ATTRIBUTE RESEARCH / R24</span><h1 tabindex="-1">${esc(c.title)}</h1><p>${esc(c.intro)}</p></div><span class="flow-status">${esc(c.badge)}</span></header>
 <section class="r24-controls" aria-label="${esc(c.title)} filters"><div class="r24-control"><label for="r24-font">${esc(c.font)}</label><select id="r24-font">${fontOptions}</select></div><div class="r24-control"><label for="r24-metric">${esc(c.metric)}</label><select id="r24-metric">${metricOptions}</select></div><div class="r24-control"><label for="r24-category">${esc(c.category)}</label><select id="r24-category">${categoryOptions}</select></div><div class="r24-control"><label for="r24-direction">${esc(c.direction)}</label><select id="r24-direction">${directionOptions}</select></div><div class="r24-control r24-search"><label for="r24-query">${esc(c.query)}</label><input id="r24-query" maxlength="8" value="${esc(o.query)}" autocomplete="off" spellcheck="false" placeholder="文 / 龍 / A"/></div><button type="button" class="r24-refresh" data-r24-refresh ${loading?'disabled':''}>↻ ${esc(c.scan)}</button></section>
 <section class="r24-summary" aria-label="${esc(c.sample)}"><div><span>${esc(c.sample)}</span><strong>${R24_SAMPLE_GLYPHS.length} ${esc(c.sampleCount)}</strong></div><div><span>${esc(c.candidates)}</span><strong>${result?result.candidateCount:'—'}</strong></div><div><span>${esc(c.verified)}</span><strong>${result?result.verifiedCount:'—'}</strong></div><div><span>${esc(c.unsupported)}</span><strong>${result?result.unsupportedCount:'—'}</strong></div><div><span>${esc(c.unavailableCount)}</span><strong>${result?result.unavailableCount:'—'}</strong></div></section>
 <section class="r24-results"><header class="r24-results-head"><div><span class="flow-kicker">${esc(c.rank)} · ${esc(c[o.metric])}</span><h2>${esc(c[o.metric])} / ${esc(o.font.toUpperCase())}</h2></div><span class="r24-source">${esc(c.source)}</span></header><p class="r24-state" role="status" aria-live="polite">${esc(feedback||stateMessage)}</p>${rows.length?`<div class="r24-rank-list" aria-label="${esc(c.rank)}">${table}</div>`:''}${complete&&!rows.length?`<p class="r24-empty">${esc(c.noVerified)}</p>`:''}<p class="r24-note">${esc(c.note)}</p><p class="r24-caution">${esc(c.tip)}</p></section>
 <footer class="r24-footer"><button type="button" data-r24-lab>⚖ ${esc(c.lab)} ↗</button><button type="button" data-r24-back>← ${esc(c.back)}</button></footer></main>`;
}
