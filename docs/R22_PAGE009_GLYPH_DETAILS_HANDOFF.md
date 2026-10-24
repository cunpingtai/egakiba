# R22 · Page #009 / Feature #009 — Glyph Details and Font Comparison

**Release:** 2026-10-24. **Only inherited baseline:** cumulative R21 Git `169e156`. Source history R13–R21 retained. This is **one new content page + one new feature**, not a redesign of physics, rewards or previous routes.

## What is shipped

- New independent SPA detail view for one validated Unicode grapheme (`detail` screen), deep-linkable at `#glyph/%E9%BE%8D/gothic` (example: 龍 Gothic). Accessible through a new **Full detail** button in R21 glyph collection. Back returns to R21 collection. Refreshing a valid hash opens details. Deep-link validation rejects multi-glyph drafts, unsupported font IDs, malformed percent encoding and route fragments.
- Shows the selected glyph as a large hero, played/not-played and favorite status **only from existing R21/R19 local evidence**. Does not retroactively invent discoveries. Favorites use existing versioned local store (`moji-blade.r21.glyph-collection.v1`); never overwrite R10 Story or R19 battle journal.
- Native comparisons across `gothic`, `mincho`, `pop`, `gyosho`, using existing `loadClassicLibrary(font) → lib.supports(glyph) → lib.get(glyph, 'mixed') → classicGlyphMetrics(shape) → deriveNativeStats`. Story HP is a derived attribute; Classic remains no HP. Each of four font loads is independently settled. Unsupported glyph and unavailable font have separate visible states, with **no simulated replacement stats**. Variant difference values require that both variants were genuinely measured.
- Selecting font updates visual focus and shareable hash; the **Use glyph** action is disabled until the *selected* font is actually supported/measured. Once ready it routes into R16 verified font/character selection; final R17 preflight still protects Battle launch. Share link is copy-to-clipboard, with failure message. Both static (`r9-index.html`) and React/TanStack shell import R22 stylesheet without modifying underlying battle engine.
- Four fully authored UI languages: Japanese, Simplified Chinese, English, Korean. Escaped user text, one-grapheme validation, font allowlist, stale-response cancellation on page change and refresh.

## Files

- `engine/r22-glyph-detail.mjs`: validated hash route, four-font native measurements, per-font errors, safe comparison/delta, localized HTML.
- `r2-flow.js`: `detail` screen, hash and back routing, R21 entry, native asynchronous inspection, variant selection, favorite, use and share actions, cancellation revisions.
- `engine/r21-glyph-collection.mjs`: adds detail action in existing sidebar, preserving all R21 functions.
- `r22-glyph-detail.css`, `r9-index.html`, `src/styles.css`: responsive R22 styles in two application shells.
- `tests/r22-glyph-detail.test.mjs`, `scripts/r22-detail-fixture.mjs`, `assets/r22-*`, `docs/R22_VISUAL_RESULTS.json`.
- `package.json`: `test:r22`, `fixture:r22` scripts.

## Verification and known constraints

- Full `node --test tests/*.test.mjs`: **91 total, 88 PASS, 3 SKIP (licensed font assets not present), 0 FAIL**.
- `python3 static_check.py`: PASS. `node --check r2-flow.js` and `engine/r22-glyph-detail.mjs`: PASS.
- Chromium/Playwright **visual-only** fixtures: 320px / 390px / 800px / 1440px, 0 horizontal overflow, all four variant rows and buttons visible. **Fixture values are invented exclusively to check layout, never claim them as game-native measurements.**
- This environment has not completed true HTTP/Vite routing, original separately licensed-font loading, actual Rapier WebGL runtime battle, or mobile-device touch testing. Native data will show the unavailable state until the user supplies an authorized original font locally; no fonts are distributed.
- `#glyph/...` is a client-side hash deep link, not a separate crawlable SEO URL with SSR. A later SEO pass should establish real server-rendered `/glyph/.../` routes based on verified content, with canonical/hreflang as needed. **Do not present R22 as server-indexable detail pages yet.**

## Local acceptance checklist

1. Restore authorized original V2 fonts privately. Serve `r9-index.html` via HTTP or start the React application.
2. Open R21 collection, choose `龍` in Gothic, press **Full detail**. Confirm the hash, refresh it, use browser Back / collection action, and change UI locale.
3. Select all four fonts. Verify differences read from *actual* original glyph geometry, and unsupported/missing fonts never print numerical estimates or enable Use.
4. Toggle favorite in a specific font, reload and inspect R21 collection. Confirm discovery state remains unchanged.
5. Choose a verified font and use the glyph; confirm native R16 and R17 checks then a real 3D fight. Confirm Classic has no HP despite the detail's Story HP comparison.
6. Check old R10 progress, R19 journal, R20 profile, R21 collection, and both mobile/desktop builds. Test denied localStorage and Clipboard permissions; test rapid navigation during font reads.
