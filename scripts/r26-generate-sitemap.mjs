import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl, DEFAULT_SITE_URL, SEO_INDEXABLE_PAGES } from '../src/seo/landing-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFromFiles = await readEnvFiles(root);
const siteBase = process.env.SITE_URL || process.env.VITE_SITE_URL || envFromFiles.VITE_SITE_URL || DEFAULT_SITE_URL;
const base = new URL(siteBase);
base.search = '';
base.hash = '';
const basePathFromEnv = process.env.VITE_BASE_PATH || envFromFiles.VITE_BASE_PATH;
if (basePathFromEnv) {
  const normalizedPath = basePathFromEnv.startsWith('/') ? basePathFromEnv : `/${basePathFromEnv}`;
  base.pathname = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
}
if (!base.pathname.endsWith('/')) base.pathname += '/';
const locales = ['ja'];
const pages = [{ key: 'home', locale: 'ja' }];
for (const locale of locales) for (const key of SEO_INDEXABLE_PAGES) pages.push({ key, locale });
const unique = [...new Map(pages.map((item) => [canonicalUrl(item.key, item.locale, base.toString()), item])).entries()];
const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const urls = unique.map(([loc, item]) => {
  const priority = item.key === 'home' ? '1.0' : ['stages', 'strongest', 'glyphs', 'compare'].includes(item.key) ? '0.8' : '0.7';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}).join('\n');
const drawPaths = ['draw-fight/', 'draw-fight/how-to-play/', 'draw-fight/create-fighter/', 'draw-fight/controls/', 'draw-fight/stages/', 'draw-fight/fighter-stats/', 'draw-fight/tips/', 'draw-fight/bosses/', 'draw-fight/faq/', 'draw-fight/save-data/'];
const typhoonPaths = ['typhoon-escape/', 'typhoon-escape/how-to-play/', 'typhoon-escape/controls/', 'typhoon-escape/tips/'];
const zipperPaths = ['zipper-finger/', 'zipper-finger/how-to-play/', 'zipper-finger/photo-ideas/', 'zipper-finger/jojo/'];
const shodoPaths = ['shodo-simulator-3d/', 'shodo-simulator-3d/how-to-play/'];
const dashimakiPaths = ['dashimaki-game/', 'dashimaki-game/how-to-play/', 'dashimaki-game/phantom-dashimaki/', 'dashimaki-game/failures/', 'dashimaki-game/faq/'];
const omuricePaths = ['omurice-simulator/', 'omurice-simulator/how-to-play/', 'omurice-simulator/high-score/', 'omurice-simulator/fold-and-flip/', 'omurice-simulator/faq/'];
const potatoPaths = ['long-potato/', 'long-potato/how-to-play/', 'long-potato/tips/', 'long-potato/records/', 'long-potato/faq/'];
const extraUrls = [...drawPaths, ...typhoonPaths, ...zipperPaths, ...shodoPaths, ...dashimakiPaths, ...omuricePaths, ...potatoPaths].map((path) => `  <url>\n    <loc>${escapeXml(new URL(path, base).toString())}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === 'draw-fight/' || path === 'typhoon-escape/' || path === 'zipper-finger/' || path === 'shodo-simulator-3d/' || path === 'dashimaki-game/' || path === 'omurice-simulator/' || path === 'long-potato/' ? '0.8' : '0.6'}</priority>\n  </url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n${extraUrls}\n</urlset>\n`;
const sitemapPath = join(root, 'public', base.pathname.replace(/^\/+|\/+$/g, ''), 'sitemap.xml');
const publicRoot = join(root, 'public');
await removeStaleSitemaps(publicRoot, sitemapPath);
await mkdir(dirname(sitemapPath), { recursive: true });
await writeFile(sitemapPath, xml);
const sitemapUrl = new URL('sitemap.xml', base).toString();
await rm(join(dirname(sitemapPath), 'rakugaki-sitemap.xml'), { force: true });
await writeFile(join(root, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`);

// Keep the legacy standalone entry's canonical/hreflang in sync with the same base URL.
const staticHomePath = join(root, 'r9-index.html');
let staticHome = await readFile(staticHomePath, 'utf8');
const homeAlternates = [
  ['canonical', canonicalUrl('home', 'ja', base.toString())],
  ['ja', canonicalUrl('home', 'ja', base.toString())],
  ['x-default', canonicalUrl('home', 'ja', base.toString())],
];
for (const [lang, href] of homeAlternates) {
  const rel = lang === 'canonical' ? 'canonical' : 'alternate';
  const attr = lang === 'canonical' ? '' : ` hreflang=\"${lang}\"`;
  const pattern = new RegExp(`<link\\s+rel=\"${rel}\"${lang === 'canonical' ? '' : `\\s+hreflang=\"${lang}\"`}\\s+href=\"[^\"]*\"\\s*\\/>`);
  const replacement = `<link rel=\"${rel}\"${attr} href=\"${href}\" />`;
  if (!pattern.test(staticHome)) throw new Error(`Expected ${rel}/${lang} link in r9-index.html`);
  staticHome = staticHome.replace(pattern, replacement);
}
await writeFile(staticHomePath, staticHome);
console.log(JSON.stringify({ sitemapPath: sitemapPath.replace(root + '/', ''), sitemapUrl, urlCount: xml.match(/<loc>/g).length }, null, 2));

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}


async function readEnvFiles(projectRoot) {
  const output = {};
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    let contents = '';
    try { contents = await readFile(join(projectRoot, file), 'utf8'); } catch { continue; }
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      output[match[1]] = value;
    }
  }
  return output;
}


async function removeStaleSitemaps(directory, keepPath) {
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeStaleSitemaps(fullPath, keepPath);
      continue;
    }
    if (entry.isFile() && entry.name === 'sitemap.xml' && fullPath !== keepPath) await rm(fullPath, { force: true });
  }
}
