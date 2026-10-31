import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_SITE_URL,
  SEO_COPY,
  SEO_INDEXABLE_PAGES,
  SEO_LOCALES,
  canonicalUrl,
  getSeoHead,
  getSeoPage,
  routeHref,
} from '../src/seo/landing-content.mjs';
import { indexablePaths } from '../src/koi-shindan/score.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('R26: each indexable intent has unique, useful copy in all four locales', () => {
  for (const locale of SEO_LOCALES) {
    const seenTitles = new Set();
    for (const key of ['home', ...SEO_INDEXABLE_PAGES]) {
      const page = getSeoPage(key, locale);
      assert.ok(page.title.length >= 18, `${locale}/${key} title is too short`);
      assert.ok(page.description.length >= (locale === 'en' ? 60 : 40), `${locale}/${key} description is too short`);
      assert.ok(page.h1.length >= 5, `${locale}/${key} H1 is missing`);
      assert.ok(page.intro.length >= 1, `${locale}/${key} intro is missing`);
      assert.ok(page.sections.length >= 2, `${locale}/${key} needs substantive sections`);
      assert.ok(!seenTitles.has(page.title), `${locale} has duplicate title: ${page.title}`);
      seenTitles.add(page.title);
    }
  }
});

test('R26: canonical and hreflang URLs use the configured deployment base, not hash fragments', () => {
  assert.equal(canonicalUrl('home', 'ja', DEFAULT_SITE_URL), DEFAULT_SITE_URL);
  assert.equal(canonicalUrl('stages', 'ja', DEFAULT_SITE_URL), `${DEFAULT_SITE_URL}stages/`);
  assert.equal(canonicalUrl('stages', 'en', DEFAULT_SITE_URL), `${DEFAULT_SITE_URL}en/stages/`);
  assert.equal(routeHref('glyphs', 'ja', '/games/moji-blade/'), '/games/moji-blade/glyphs/');
  assert.equal(routeHref('home', 'ja', '/games/moji-blade/'), '/games/moji-blade/');
  for (const locale of SEO_LOCALES) {
    const head = getSeoHead('compare', locale, DEFAULT_SITE_URL);
    assert.equal(head.alternates.length, 1);
    assert.ok(head.alternates.every((entry) => !entry.href.includes('#')));
    assert.equal(head.canonical, canonicalUrl('compare', locale, DEFAULT_SITE_URL));
  }
});

test('R26: the React home renders its actual content on the server instead of an app-shell placeholder', async () => {
  const source = await read('src/routes/index.tsx');
  assert.match(source, /ssr:\s*true/);
  assert.match(source, /return\s*<R9Shell\s*\/>/);
  assert.doesNotMatch(source, /useState\(false\)|if\s*\(!live\)/);
  assert.match(source, /seoRouteHead\('home',\s*'ja'\)/);
  assert.match(source, /文字ブレードのステージ攻略/);
});

test('R26: every public SEO page is a path-based SSR route', async () => {
  const expected = {
    play: '/play', stages: '/stages', glyphs: '/glyphs', compare: '/compare', strongest: '/strongest', 'how-to-play': '/how-to-play',
  };
  for (const [file, path] of Object.entries(expected)) {
    const source = await read(`src/routes/${file}.tsx`);
    assert.ok(source.includes(`createFileRoute('${path}')`), `${file} route path missing`);
    assert.match(source, /ssr:\s*true/);
    assert.match(source, /seoRouteHead/);
    assert.match(source, /SeoLandingPage/);
  }
  const routeTree = await read('src/routeTree.gen.ts');
  for (const path of ['/play', '/stages', '/glyphs', '/compare', '/strongest', '/how-to-play']) assert.ok(routeTree.includes(`'${path}'`), `generated route tree missing ${path}`);
  for (const path of ['/$locale/$slug', '/en', '/zh', '/ko']) assert.equal(routeTree.includes(`'${path}'`), false, `generated route tree still has ${path}`);
});

test('R26: router and build configuration preserve the base path and prerender crawlable links', async () => {
  const router = await read('src/router.tsx');
  const vite = await read('vite.config.ts');
  assert.match(router, /import\.meta\.env\.BASE_URL/);
  assert.match(router, /trailingSlash:\s*'always'/);
  assert.match(vite, /prerender:\s*\{\s*enabled:\s*true,\s*crawlLinks:\s*true/);
  assert.match(vite, /VITE_BASE_PATH/);
  assert.match(vite, /VITE_SITE_URL/);
});

test('R26: home has ordinary crawlable links to all search-intent landing pages', async () => {
  const html = await read('r9-index.html');
  const react = await read('src/routes/index.tsx');
  for (const slug of SEO_INDEXABLE_PAGES) {
    assert.ok(html.includes(`href="./${slug}/"`), `standalone home link missing: ${slug}`);
    assert.ok(react.includes(`routeHref('${slug}'`), `SSR home link missing: ${slug}`);
  }
  assert.match(html, /<link rel="canonical" href="https:\/\/egakiba\.com\/"/);
});

test('R26: sitemap contains the Japanese canonical landing URLs and no fragment URLs', async () => {
  const sitemap = await read('public/sitemap.xml');
  const robots = await read('public/robots.txt');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, 138 + indexablePaths().length);
  for (const path of indexablePaths()) assert.ok(urls.includes(`${DEFAULT_SITE_URL}${path}`), `missing sitemap URL: ${path}`);
  assert.equal(sitemap.includes('<lastmod>'), false);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => !url.includes('#')));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}draw-fight/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}draw-fight/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}typhoon-escape/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}typhoon-escape/tips/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}zipper-finger/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}zipper-finger/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}zipper-finger/photo-ideas/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}zipper-finger/jojo/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shodo-simulator-3d/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shodo-simulator-3d/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}dashimaki-game/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}dashimaki-game/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}dashimaki-game/phantom-dashimaki/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}dashimaki-game/failures/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}dashimaki-game/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice-simulator/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice-simulator/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice-simulator/high-score/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice-simulator/fold-and-flip/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice-simulator/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}long-potato/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}long-potato/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}long-potato/tips/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}long-potato/records/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}long-potato/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}one-breath/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}one-breath/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}one-breath/titles/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}one-breath/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}hamburg/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}hamburg/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}hamburg/high-score/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}soft-serve/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}soft-serve/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}soft-serve/high-score/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}cooking-games/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}omurice/ketchup-art/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}drawing-games/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shusshin-ken/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shusshin-ken/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shusshin-ken/results/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shusshin-ken/guess-mode/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}regional-differences/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}regional-differences/nikujaga/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}regional-differences/ozoni/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}uwaki-jinmon/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}uwaki-jinmon/s-rank/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}uwaki-jinmon/evidence/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}uwaki-jinmon/endings/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}interrogation-games/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ice-break/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ice-break/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ice-break/500-challenge/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kuroi-ekitai/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kuroi-ekitai/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kuroi-ekitai/titles/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}daruma/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}daruma/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}daruma/sensor-fix/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}daruma/speedrun/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-game/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-game/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-game/adjacency/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-game/hard-mode/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-game/asia/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kazoku-igai/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kazoku-igai/true-end/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}kazoku-igai/endings/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}acupuncture-darts/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}acupuncture-darts/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}concafe-simulator/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}concafe-simulator/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}concafe-simulator/endings/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}hanko-hankouki/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}beer-pour/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}beer-pour/100-points/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}rakugaki-coaster/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}rakugaki-coaster/how-to-play/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}rakugaki-coaster/share/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}rakugaki-coaster/faq/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}turkish-ice-cream-3d/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}turkish-ice-cream-3d/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}latteart-maker/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}latteart-maker/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}latteart-maker/catalog/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}jinsei-walker/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}jinsei-walker/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}roll-ice-simulator/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}roll-ice-simulator/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}nnko-quiz/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}nnko-quiz/endings/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-derby/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}prefecture-derby/guide/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}tenhou-simulator/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}tenhou-simulator/probability/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}streamer-life-simulator/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}streamer-life-simulator/endings/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}tsundetsundetsunde/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}bakuso-kickboard/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}sanma-bonenuki/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shukuyo-note/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shukuyo-note/honmei/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shukuyo-note/aisho/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}shukuyo-note/keisan/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ko/sansa/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ko/sansa/how-to/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ja/sansa-online-temple/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}ja/sansa-online-temple/how-to/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}fr/sansa/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}fr/sansa/how-to/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}en/sansa/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}en/sansa/how-to/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}about/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}contact/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}privacy/`));
  assert.ok(urls.includes(`${DEFAULT_SITE_URL}terms/`));
  assert.equal(urls.some((url) => url.endsWith('game.html')), false);
  assert.equal(urls.some((url) => url.includes('/studio') || url.includes('/gpu-check')), false);
  assert.ok(urls.includes(canonicalUrl('home', 'ja', DEFAULT_SITE_URL)));
  for (const locale of SEO_LOCALES) {
    for (const key of SEO_INDEXABLE_PAGES) assert.ok(urls.includes(canonicalUrl(key, locale, DEFAULT_SITE_URL)), `missing sitemap URL: ${locale}/${key}`);
  }
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Sitemap:\s*https:\/\/egakiba\.com\/sitemap\.xml/);
});

test('R26: search-entry links are localized in the existing interactive home', async () => {
  const app = await read('app.js');
  const staticHome = await read('r9-index.html');
  const reactHome = await read('src/routes/index.tsx');
  const keys = ['seoLinkStagesTitle', 'seoLinkStagesDesc', 'seoLinkGlyphsTitle', 'seoLinkGlyphsDesc', 'seoLinkCompareTitle', 'seoLinkCompareDesc', 'seoLinkStrongestTitle', 'seoLinkStrongestDesc', 'seoLinkPlayTitle', 'seoLinkPlayDesc', 'seoLinkGuideTitle', 'seoLinkGuideDesc'];
  for (const key of keys) {
    assert.ok(app.includes(`${key}:`), `translation missing: ${key}`);
    assert.ok(staticHome.includes(`data-t="${key}"`), `standalone home missing translation binding: ${key}`);
    assert.ok(reactHome.includes(`data-t="${key}"`), `SSR home missing translation binding: ${key}`);
  }
  const flow = await read('r2-flow.js');
  assert.match(flow, /location\.hash==='#stages'\)show\('stages'\)/);
  assert.match(flow, /location\.hash==='#modes'\)show\('modes'\)/);
});

test('R26: pages stay in Japanese without a language switcher', async () => {
  const rootRoute = await read('src/routes/__root.tsx');
  const landing = await read('src/seo/LandingPage.tsx');
  const home = await read('src/routes/index.tsx');
  assert.match(rootRoute, /const lang = pathname\.startsWith\('\/ko\/'\) \? 'ko' : pathname\.startsWith\('\/fr\/'\) \? 'fr' : pathname\.startsWith\('\/en\/'\) \? 'en' : 'ja'/);
  assert.match(rootRoute, /<html lang=\{lang\}>/);
  assert.doesNotMatch(landing, /aria-label="Language"/);
  assert.doesNotMatch(home, /locale-select/);
});
