# R26 — Independent crawlable URLs, SSR and prerendering

**Baseline:** R25 cumulative source. **Release:** R26, 2026-10-24. This is an indexability and routing release, not a new gameplay mode. Existing physics, story objectives, saves and local-only records are preserved.

## URL map

Default canonical base retained from the repository's existing `source/demo.html` canonical: `https://tsukuruum.pages.dev/games/moji-blade/`. Configure `VITE_SITE_URL` and `VITE_BASE_PATH` together if the public deployment uses another origin or path prefix.

| Intent | Japanese/default URL suffix | English | Simplified Chinese | Korean |
|---|---|---|---|---|
| Home | `/` | `/en/` | `/zh/` | `/ko/` |
| Modes | `/play/` | `/en/play/` | `/zh/play/` | `/ko/play/` |
| Story stage guide | `/stages/` | `/en/stages/` | `/zh/stages/` | `/ko/stages/` |
| Glyph collection | `/glyphs/` | `/en/glyphs/` | `/zh/glyphs/` | `/ko/glyphs/` |
| Comparison lab | `/compare/` | `/en/compare/` | `/zh/compare/` | `/ko/compare/` |
| Strongest/weakest research | `/strongest/` | `/en/strongest/` | `/zh/strongest/` | `/ko/strongest/` |
| Beginner guide | `/how-to-play/` | `/en/how-to-play/` | `/zh/how-to-play/` | `/ko/how-to-play/` |

The sitemap contains 28 canonical URLs: one Japanese homepage, three localized homepages, and six intent pages in each of four locales. Local battle profile, prepare, result and hash-only views are not promoted as independent search landing pages because they are device-specific or transient.

## Implementation

- Added path-based TanStack Start routes for `/play/`, `/stages/`, `/glyphs/`, `/compare/`, `/strongest/`, `/how-to-play/` and localized equivalents under `/en/`, `/zh/`, `/ko/`.
- Set SEO landing routes to `ssr: true`; configured static prerendering with link crawling so content can be emitted as HTML during build. This is configured but could not be executed in this runtime because Vite dependencies are not installed.
- Replaced the root route's client-only placeholder with the actual `R9Shell` markup during server rendering; gameplay boot still runs in `useEffect` after hydration.
- Added unique title, description, Open Graph, canonical, `hreflang` alternates, `x-default`, `WebPage` JSON-LD and per-route HTML language.
- Added ordinary HTML anchors from both React and standalone home pages to every indexable search intent. Added localized labels in the existing four-language client dictionary.
- Added a stable base-path setting from `VITE_SITE_URL` / `VITE_BASE_PATH`, with a repository default based on the existing canonical URL. `src/router.tsx` derives the router base path from `import.meta.env.BASE_URL` and normalizes trailing slashes.
- Added `public/robots.txt`, a 28-URL sitemap at `public/games/moji-blade/sitemap.xml`, and `scripts/r26-generate-sitemap.mjs`. The build script regenerates sitemap/robots and synchronizes the standalone home canonical/hreflang tags before invoking Vite.
- Invalid localized slugs/locales throw a not-found response rather than rendering a generic page with HTTP 200.

## Build and deployment

1. Copy `.env.example` to `.env` and confirm the production URL/path. For the existing canonical, keep `VITE_SITE_URL=https://tsukuruum.pages.dev/games/moji-blade/` and `VITE_BASE_PATH=/games/moji-blade/`.
2. Install dependencies with the repository's locked pnpm version.
3. Run `npm run audit:r26`, `npm run test:r25`, `npm run check:r9`, `npm run check:r25`, and `npm run audit:r25`.
4. Run `npm run build`. TanStack Start SSR and static prerender should emit independently addressable HTML pages under the configured base path.
5. Verify a direct HTTP GET (not just client navigation) for `/stages/`, `/glyphs/`, `/compare/`, `/strongest/`, `/en/stages/`, `/zh/glyphs/` and `/ko/`. Inspect raw response source for page-specific H1, body copy, title, description, canonical and hreflang.
6. Verify `/robots.txt` and `/sitemap.xml` at the deployed base. Submit the sitemap in Google Search Console after deploy; a valid sitemap does not guarantee indexing.
7. Check 404 responses for unsupported localized slugs, and check that `?lang=en` on the game home remains canonicalized to the Japanese/default home while the interactive shell adopts the requested language.

## Verification limits

- `npm run test:r25`: **126 PASS, 3 licensed-font SKIP, 0 FAIL** after R26 additions.
- R26 route/SEO tests: **9 PASS, 0 FAIL**.
- `npm run check:r9`: PASS.
- `npm run check:r25`: 4 PASS.
- `npm run audit:r25`: PASS; exact Japanese `文字ブレード` density remains above 3% in static and localized home copy.
- `node --check` passed for modified JS/MJS scripts.
- **Production build/prerender was not run successfully**: the current environment has no installed Vite binary (`vite: not found`), and dependency installation was blocked by registry DNS/network (`EAI_AGAIN`). This release therefore does not claim that generated prerender HTML was inspected.
- Browser HTTP navigation, licensed original font loading and real WebGL/device gameplay remain unverified in this runtime.

## Git

R26 is committed on top of the R25 baseline; complete `.git` history is included in the cumulative ZIP. See `docs/R26_REGRESSION_RESULTS.txt` and `R26_MANIFEST_SHA256.txt` for audit details.
