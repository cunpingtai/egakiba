// 言葉の切り替え（日本語・English・한국어。2026-10-26 オーナー「英語、韓国語も入れて」）。
// 元の文は日本語のまま（story.json・game.js・声の対応表の鍵・夫の口の母音）。見せる時だけ t(日本語) で置き換える。
// 辞書は web/data/i18n/<lang>.json（{ "日本語": "訳" }）。無い言葉は日本語のまま出す（?i18ndebug で window.__i18nMiss に控える）。
// 差し込み: 辞書の鍵に {when} などがあれば「型」として扱い、game.js が組んだ文（「…ごめん。先月、元カノと…車の中で…」）も型に当てて訳す（捕まえた値も訳す）。
//   {x^} は頭を大文字に（英語の文の頭）。{x|yen} は万円の数を通貨の形に。{x:이/가} は前の字の終わりが子音なら前、母音なら後（韓国語の助詞）。
//   {H} は夫の名前（無ければ「夫」に当たる言葉。英語は文の頭で {Hc}）。
// 女性浮気版（mode 'w'。妻が浮気した側・夫が問い詰める側。2026-10-26 オーナー「女性浮気版も追加して」）: 仕組みの文（game.js・main.js・index.html）は夫が浮気した側の日本語のまま持ち、
//   見せる時に先に web/data/i18n/w.json（{ "夫の様子": "妻の様子" }。型も可）で日本語→日本語に置き換えてから、言葉の辞書に当てる。台本は story_w.json（最初から妻の言葉）
export const LANGS = { ja: '日本語', en: 'English', ko: '한국어' };
export let lang = 'ja';
export let mode = 'h'; // 'h': 夫が浮気した側（元の形）。'w': 妻が浮気した側
let dict = {}, tpls = [], hname = '', swap = {}, swapTpls = [];
const JA = /[぀-ヿ㐀-鿿]/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const setName = (n) => { hname = n || ''; }; // 縛られる側の名前（空なら「夫」「妻」の訳）
export function pickLang() {
  return 'ja';
}
export function pickMode() { // ?mode=h|w → 前に選んだ物（localStorage の uj_mode）→ 夫が浮気
  const q = new URLSearchParams(location.search).get('mode');
  let saved = null;
  try { saved = localStorage.getItem('uj_mode'); } catch { /* 保存できない環境 */ }
  const m = q || saved || 'h';
  return m === 'w' ? 'w' : 'h';
}
export async function load(l = pickLang(), m = pickMode()) {
  lang = l; mode = m; dict = {}; tpls = []; swap = {}; swapTpls = [];
  if (m === 'w') {
    try { swap = await fetch('./data/i18n/w.json').then((r) => (r.ok ? r.json() : {})); } catch { swap = {}; }
    for (const [k, v] of Object.entries(swap)) if (/\{\w+\}/.test(k) && !k.startsWith('_')) swapTpls.push(tpl(k, v));
    swapTpls.sort((a, b) => b.lit - a.lit);
    try { localStorage.setItem('uj_mode', 'w'); } catch { /* 保存できない環境 */ }
  } else { try { localStorage.setItem('uj_mode', 'h'); } catch { /* 保存できない環境 */ } }
  if (l !== 'ja') {
    try { dict = await fetch(`./data/i18n/${l}.json`).then((r) => (r.ok ? r.json() : {})); } catch { dict = {}; }
    for (const [k, v] of Object.entries(dict)) if (/\{\w+\}/.test(k) && !k.startsWith('_')) tpls.push(tpl(k, v));
    tpls.sort((a, b) => b.lit - a.lit); // 決まった字が多い型から当てる（{when}・{place} のような緩い型は最後）
  }
  document.documentElement.lang = l;
  document.documentElement.dataset.mode = m;
  try { localStorage.setItem('uj_lang', l); } catch { /* 保存できない環境 */ }
  font(l);
  localizeDom();
}
function tpl(key, out) {
  const keys = [];
  const re = new RegExp(`^${key.split(/(\{\w+\})/).map((p, i) => (i % 2 ? (keys.push(p.slice(1, -1)), '(.*?)') : esc(p))).join('')}$`);
  return { re, keys, out, lit: key.replace(/\{\w+\}/g, '').length };
}
// 日本語 → いまの言葉。vars は {n} などの差し込み（日本語のまま出す時も差し込む）
export function t(src, vars) {
  if (src === null || src === undefined || src === '') return '';
  src = String(src);
  if (mode === 'w' && swapTpls.length + Object.keys(swap).length) { // 女性浮気版: 先に日本語→日本語（夫→妻）
    const hit = swap[src];
    if (hit !== undefined) src = hit;
    else { for (const p of swapTpls) { const m = p.re.exec(src); if (m) { const v = {}; p.keys.forEach((k, i) => { v[k] = m[i + 1] || ''; }); src = fill(p.out, v); break; } } }
  }
  let out = src;
  if (lang !== 'ja') {
    const hit = (mode === 'w' ? dict[`${src}@w`] : undefined) ?? dict[src]; // 「@w」付きの鍵は、日本語は同じでも女性浮気版では訳が違う言葉（義母 → her mother）
    if (hit !== undefined) out = hit;
    else {
      const byTpl = fromTpl(src);
      if (byTpl !== null) return fill(byTpl, vars);
      miss(src);
    }
  }
  return fill(out, vars);
}
function fromTpl(src) {
  for (const p of tpls) {
    const m = p.re.exec(src);
    if (!m) continue;
    const vars = {};
    p.keys.forEach((k, i) => { vars[k] = m[i + 1] ? t(m[i + 1]) : ''; });
    return fill(p.out, vars);
  }
  return null;
}
function fill(s, vars) {
  if (typeof s !== 'string' || !s.includes('{')) return s;
  const H = hname || (mode === 'w' ? dict._H_w || '妻' : dict._H || '夫'), Hc = hname || (mode === 'w' ? dict._Hc_w : dict._Hc) || H; // {H}: 縛られる側（名前が無ければ「夫」「妻」の訳）
  const v = { H, Hc, ...(vars || {}) };
  return s.replace(/\{(\w+)(\^)?(?:\|(\w+))?(?::([^/}]+)\/([^}]+))?\}/g, (m, k, cap, fmt, p1, p2) => {
    let val = v[k];
    if (val === undefined) return m;
    val = String(val);
    if (fmt === 'yen') val = yen(val);
    if (cap) val = val.charAt(0).toUpperCase() + val.slice(1);
    if (p1) val += endsConsonant(val) ? p1 : p2;
    return val;
  });
}
const yen = (man) => (lang === 'en' ? `¥${(Number(man) * 10000).toLocaleString('en-US')}` : lang === 'ko' ? `${man}만 엔` : `${man}万円`);
// 韓国語の助詞のため: 終わりの字（括弧や記号は飛ばす）が子音で終わるか。ハングルは終声の有無、かなは「ん」だけ、英字は母音字以外、数字は 0 1 3 6 7 8、漢字は子音として扱う
function endsConsonant(s) {
  const m = /[\p{L}\p{N}](?=[^\p{L}\p{N}]*$)/u.exec(s);
  if (!m) return true;
  const ch = m[0], c = ch.codePointAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;
  if (c >= 0x3041 && c <= 0x30ff) return /[んンっッ]/.test(ch);
  if (/[0-9]/.test(ch)) return '013678'.includes(ch);
  if (/[a-zA-Z]/.test(ch)) return !/[aeiouyAEIOUY]/.test(ch);
  return true;
}
const missed = new Set();
function miss(src) {
  if (!JA.test(src) || missed.has(src)) return;
  missed.add(src);
  window.__i18nMiss = missed;
  if (new URLSearchParams(location.search).has('i18ndebug')) console.warn('i18n miss:', src);
}
// index.html の data-i18n（中身の日本語が鍵）と data-i18n-ph（placeholder）を置き換える。日本語の時は元のまま
function localizeDom() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.innerHTML = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
}
// 言葉に合う字体（Google Fonts）: 韓国語は Noto Serif KR、英語は EB Garamond。日本語の Shippori Mincho は index.html で読む
function font() {}
