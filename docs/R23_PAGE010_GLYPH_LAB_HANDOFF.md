# R23 / Page #010 + Feature #010 — Two-Glyph Comparison Lab

- Date: 2026-10-24
- Single inherited baseline: R22 Git `8aa70b7`; no fresh project, no regenerated old physics code
- Project version chain: R13 → R14 → R15 → R16 → R17 → R18 → R19 → R20 → R21 → R22 → R23

## What this release does

1. New standalone **Glyph Lab** (`lab` screen) opens from the mode center, R21 collection and R22 glyph details. Validated shareable hash: `#lab/%E9%BE%8D/gothic/%E5%89%A3/mincho`. Hashes are **SPA client-only links**, not SSR/crawlable URLs.
2. Two independently editable Unicode graphemes. Each can use Gothic, Mincho, POP or Gyosho. Both use the **existing native V2 library**, via `loadClassicLibrary → supports → get('mixed') → classicGlyphMetrics → deriveNativeStats`. No invented stats or font fallbacks. Missing/unsupported glyphs display explicit states; battle CTA stays disabled.
3. Clear A/B comparison of Speed, Power, Balance and reference **Story HP**, with signed A−B numerical differences and per-side readouts. Derived values are not empirical win rates, matchup odds, or an automatic winner claim. Classic still has **no HP**.
4. Swap A/B and fonts; re-verify after changing either one. Each async request is invalidated when changed/navigation occurs, so a stale result cannot unlock battle. Edited field focus/caret is restored across DOM updates. Links may be copied from the current validated selection.
5. Verified **Battle this pair** action copies both glyphs and **independent font IDs** into the original Classic preparation flow. `statePayload`, `battleDraft`, `prepare` and the opponent-font selector all use `model.opponentFont` when set. Existing strict R17 preflight still checks both. Classic Rapier adapter already supports separate `opponentFont`; it has not been changed.
6. Japanese/Chinese/English/Korean localized labels, caveats, errors and actions. Standalone `r9-index.html` and React styles both import R23 CSS. All R13–R22 pages, rules and local save keys remain in place.

## Changed / added files

- NEW `engine/r23-glyph-lab.mjs`: selection validation, canonical hash, two independent real font reads, cancellation gate, safe renderer, translations
- NEW `r23-glyph-lab.css`: 320px+ responsive comparison page
- UPDATED `r2-flow.js`: new lab screen, hash support, entries, batch verification, stale-response handling, Classic opponent font flow
- UPDATED `engine/r21-glyph-collection.mjs`, `engine/r22-glyph-detail.mjs`: lab entry buttons
- UPDATED `r9-index.html`, `src/styles.css`: both shells load styles
- UPDATED `package.json`: `test:r23` and `fixture:r23`
- NEW `tests/r23-glyph-lab.test.mjs`, `scripts/r23-lab-fixture.mjs`, `scripts/r23-lab-visual-check.py`, R23 assets and `docs/R23_LAB_VISUAL_RESULTS.json`

## Verification

- Full automated test: **103 total / 100 PASS / 3 SKIP (licensed font-dependent) / 0 FAIL**
- `python3 static_check.py`: PASS
- `node --check r2-flow.js` and new modules: PASS
- UI-only Chromium fixtures (actual R23 page HTML renderer, mocked measurements for layout only): **320, 390, 800, 1440 px, no overflow; both inputs/fonts/battle CTA in viewport; missing-font state cannot battle.** Screenshots are *not actual gameplay or original-font attribute evidence.*
- Original separately licensed fonts **not redistributed**, so live font-backed results and native Rapier/WebGL fights remain to be validated locally. Full-site HTTP navigation remains restricted in this environment; renderer-based Playwright does not establish an end-to-end WebGL success.

## Local acceptance checklist

1. Supply your authorized original V2 font pack privately (follow existing `scripts/install_font_assets.py` instructions). Serve the main game over localhost HTTP.
2. Open `/r9-index.html`, go **Modes → Glyph Lab**. Type `龍` Gothic vs `剣` Mincho; verify the two fonts load independently, no mock numbers remain, A−B differences are correct.
3. Change A, change B, switch fonts quickly and leave the page during loading. No stale attributes should show; an invalid or unsupported glyph disables the CTA.
4. Test direct hash load/reload, language changes, swap, copy link, browser history; confirm one-character validation and correct Unicode handling.
5. Verify **Battle this pair** opens actual Classic prepare page showing both distinct font IDs and verifies both. Start a real Rapier match; inspect the actual opponent glyph and font. Classic HUD has no HP, even though Story HP reference is available in Lab.
6. Verify R22 font detail, R21 favorites, R20 history, R19 results, R18 HUD and R15/R14 campaign progress still work. Check mobile Safari/Chrome/iOS/Android touch and keyboard input with IME. Check denied clipboard and missing localStorage.

## Non-goals

- No online ranking, social, cloud save, accounts, seasonal league, paid upgrades or real statistical winner prediction.
- No changed V2 collision formulas, Rapier physics, Story rewards, ruleset, level catalog or existing save schemas.
- No independent SEO/SSR URLs for pair combinations; this remains a client-side research tool.
