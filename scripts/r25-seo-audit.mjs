import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('app.js');
const html = read('r9-index.html');
const jsx = read('src/routes/index.tsx');
const flow = read('r2-flow.js');
const start = app.indexOf('const dictionary = ');
const end = app.indexOf('\n  };', start) + 4;
if (start < 0 || end <= start) throw new Error('Cannot read localized home copy.');
const dictionary = vm.runInNewContext(`(${app.slice(start + 'const dictionary = '.length, end).trim()})`);
function homeText(source, hydrate) {
  let body = source.match(/<main id="home-page"[\s\S]*?<\/main>/)?.[0];
  if (!body) throw new Error('Home main element not found.');
  if (hydrate) body = body.replace(/<([a-zA-Z][\w-]*)\b([^>]*\bdata-t="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (all, tag, attrs, key, inner) => `<${tag}${attrs}>${dictionary.ja[key] ?? inner}</${tag}>`);
  return body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function density(text) {
  const tokens = [...new Intl.Segmenter('ja', {granularity:'word'}).segment(text)].filter(x => x.isWordLike).length;
  const hits = (text.match(/文字ブレード/g) || []).length;
  return {hits, tokens, percent: Number((hits / tokens * 100).toFixed(2))};
}
const staticResult = density(homeText(html, false));
const localizedResult = density(homeText(html, true));
if (staticResult.percent < 3 || localizedResult.percent < 3) throw new Error('Japanese home keyword density fell below 3%.');
const placeholders = /data-panel="leaderboard"|data-panel="account"|data-panel="local"|mode-card--streak|mode-card--scout|proto-bar|toggle-user|CHAPTER 02|CHAPTER 03/i;
if (placeholders.test(html) || placeholders.test(jsx)) throw new Error('Unfinished page or mode entry remains in a site entrypoint.');
const screens = ['home','modes','stages','glyph','prepare','profile','collection','detail','lab','ranking'];
for (const screen of screens) if (!flow.includes(`${screen}:[`)) throw new Error(`SEO metadata missing screen: ${screen}`);
console.log('R25 SITE SEO AUDIT: PASS');
console.log(`Primary keyword: 文字ブレード`);
console.log(`Static HTML density: ${staticResult.hits}/${staticResult.tokens} = ${staticResult.percent}%`);
console.log(`Localized Japanese density: ${localizedResult.hits}/${localizedResult.tokens} = ${localizedResult.percent}%`);
console.log(`Client-side screens with localized title/description: ${screens.length}`);
console.log('Unfinished nav/mode/chapter entries: 0');
console.log('Note: Japanese word count uses Intl.Segmenter(ja, word) and exact-phrase occurrences.');
