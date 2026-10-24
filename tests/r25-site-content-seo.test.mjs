import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rankingCopy} from '../engine/r24-glyph-ranking.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('r9-index.html');
const jsx = read('src/routes/index.tsx');
const app = read('app.js');
const flow = read('r2-flow.js');
const dictionaryStart = app.indexOf('const dictionary = ');
const dictionaryEnd = app.indexOf('\n  };', dictionaryStart) + 4;
assert.ok(dictionaryStart >= 0 && dictionaryEnd > dictionaryStart, 'home translation dictionary is readable');
const dictionary = vm.runInNewContext(`(${app.slice(dictionaryStart + 'const dictionary = '.length, dictionaryEnd).trim()})`);

function homepageText(source, hydrateJapanese = false) {
  let body = source.match(/<main id="home-page"[\s\S]*?<\/main>/)?.[0];
  assert.ok(body, 'home page main exists');
  if (hydrateJapanese) {
    body = body.replace(/<([a-zA-Z][\w-]*)\b([^>]*\bdata-t="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
      (all, tag, attrs, key, inner) => `<${tag}${attrs}>${dictionary.ja[key] ?? inner}</${tag}>`);
  }
  return body.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}
function exactPhraseDensity(text) {
  const words = [...new Intl.Segmenter('ja', {granularity:'word'}).segment(text)].filter(x => x.isWordLike);
  const hits = (text.match(/文字ブレード/g) || []).length;
  return {hits, wordCount:words.length, percent:hits / words.length * 100};
}

test('R25 Japanese homepage has at least 3% exact primary-keyword density in both static and localized copy', () => {
  for (const [name, text] of [['static HTML', homepageText(html)], ['localized copy', homepageText(html, true)]]) {
    const d = exactPhraseDensity(text);
    assert.ok(d.percent >= 3, `${name}: ${d.hits}/${d.wordCount} = ${d.percent.toFixed(2)}%`);
    assert.ok(d.percent <= 4.5, `${name}: avoid excessive stuffing (${d.percent.toFixed(2)}%)`);
  }
  assert.match(html, /文字ブレード｜漢字ブレード・無料ブラウザ文字ゲーム/);
  assert.match(html, /application\/ld\+json/);
  assert.match(jsx, /application\/ld\+json/);
});

test('R25 SEO copy uses real Google Trends query clusters across all supported locales', () => {
  const keys = ['seoMetaTitle','seoMetaDescription','seoTitle','seoIntro1','seoIntro2','seoStoryTitle','seoStoryDesc','seoBattleTitle','seoBattleDesc','seoResearchTitle','seoResearchDesc','seoFaq1Q','seoFaq1A','seoFaq2Q','seoFaq2A','seoFaq3Q','seoFaq3A','seoFaq4Q','seoFaq4A'];
  for (const locale of ['ja','zh','en','ko']) for (const key of keys) assert.ok(dictionary[locale][key], `${locale}.${key}`);
  const ja = homepageText(html, true);
  for (const keyword of ['文字ブレード','漢字ブレード','文字ゲーム','ブラウザ','文字バトル','世界一難しい漢字','画数の多い漢字','難読漢字']) assert.ok(ja.includes(keyword), `missing query cluster: ${keyword}`);
  const ranking = rankingCopy('ja');
  assert.match(ranking.title, /最強・最弱/);
  assert.match(ranking.intro, /Tier/);
  assert.match(ranking.intro, /全Unicode/);
});

test('R25 removes unfinished user-facing pages, modes, and development-only controls', () => {
  for (const [name, source] of [['static HTML', html], ['React entry', jsx]]) {
    assert.doesNotMatch(source, /data-panel="leaderboard"|data-panel="account"|data-panel="local"/i, name);
    assert.doesNotMatch(source, /mode-card--streak|mode-card--scout|proto-bar|toggle-user|CHAPTER 02|CHAPTER 03|V3 のホーム|試作プレビュー/i, name);
    assert.match(source, /data-panel="profile"/);
    assert.match(source, /data-panel="collection"/);
    assert.match(source, /seo-content/);
  }
  for (const token of ['modeStreak','modeScout','demoLevels','demoStats','mockBadge','data-demo-stage','data-go-prepare','modepicker','toggle-user']) assert.ok(!app.includes(token), `stale home UI token: ${token}`);
  for (const token of ['STORY_CHAPTERS','DEMO_STAGE_GOALS','demoLevels','demoStats','mockBadge','handoff-card','INTEGRATION BOUNDARY','modeStreak','modeScout','COMING SOON']) assert.ok(!flow.includes(token), `stale flow UI token: ${token}`);
  assert.doesNotMatch(flow, /https:\/\/tsukuruum\.pages\.dev\/games\/moji-blade/);
});

test('R25 has unique localized SEO metadata for every real client-side page', () => {
  const required = ['home','modes','stages','glyph','prepare','profile','collection','detail','lab','ranking'];
  for (const screen of required) assert.match(flow, new RegExp(`${screen}:\\[`), `PAGE_META missing ${screen}`);
  for (const keyword of ['文字ブレードの遊び方','文字ブレードのステージ攻略','文字ブレードの文字選び','文字ブレードの対戦準備','文字ブレードのプレイ記録','文字ブレード文字図鑑','文字ブレードの文字詳細','文字ブレード文字比較ラボ','最強・最弱文字研究']) assert.ok(flow.includes(keyword), `missing page SEO title: ${keyword}`);
  assert.match(read('r9-story-screen.mjs'), /文字ブレードの文字バトル/);
  assert.match(read('r8-classic-screen.mjs'), /文字ブレード Classic対戦/);
  assert.match(read('engine/r19-result-report.mjs'), /文字ブレードのバトル結果/);
});
