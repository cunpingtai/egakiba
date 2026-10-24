# R24 / Page #011 + Feature #011 — Strongest Glyph Research

- Date: 2026-10-24
- Inherited baseline: R23 Git `e70198a`; no new project and no regenerated physics engine
- Cumulative history: R13 → R14 → R15 → R16 → R17 → R18 → R19 → R20 → R21 → R22 → R23 → R24

## Scope

R24 adds a local glyph-attribute research page, reachable from the home footer (`文字属性研究`), mode center, collection, glyph detail, and two-glyph lab. The client-only direct route is `#glyph-ranking`. The existing top navigation `ランキング` still refers to the future server-validated player leaderboard and is intentionally not repurposed as a local attribute rank.

### Real metric pipeline

- Candidate set is the existing curated `SUGGESTED_GLYPHS` collection (34 unique graphemes), not all Unicode.
- One typeface is selected at a time: Gothic, Mincho, POP or Gyosho.
- Each candidate is tested against the original V2 `GlyphLibrary`; supported glyph outlines pass through `classicGlyphMetrics` and the existing `deriveNativeStats` path.
- Metrics are Speed, Power, Balance and Story HP reference. User can filter category/query and sort ascending or descending.
- Only candidates with finite verified values receive a rank. Equal values use competition ranking (`1, 1, 3`). Unsupported glyphs and failed outlines receive no number or rank.
- If the selected original font fails to load, the page shows a clear unavailable state and produces no estimated values or ranking.
- Rank scope is always labelled: current curated candidates, selected typeface and selected attribute. Derived shape metrics are not empirical match win rates, matchup odds or a claim of universally strongest Unicode glyphs.
- Result row actions open the existing R22 glyph detail page or R23 two-glyph comparison lab. Back navigation preserves the originating screen.

## Changed / added files

- NEW `engine/r24-glyph-ranking.mjs`: option validation, native measurement, per-font ranking, tie handling, missing/unsupported states, stale async guard, localized renderer
- NEW `r24-glyph-ranking.css`: responsive desktop/mobile layout
- NEW `tests/r24-glyph-ranking.test.mjs`: 13 unit/integration tests
- NEW `scripts/r24-ranking-fixture.mjs` and `scripts/r24-ranking-visual-check.py`: renderer-only layout fixtures
- NEW `assets/r24-ranking-*-fixture.html`, screenshots and `docs/R24_RANKING_VISUAL_RESULTS.json`
- UPDATED `r2-flow.js`: `ranking` screen, filter controls, native scan, `#glyph-ranking`, detail/lab navigation and return context
- UPDATED `app.js`: home entry and four-language label; preserves the separate online leaderboard placeholder
- UPDATED `r9-index.html` and `src/styles.css`: load the R24 stylesheet in standalone and React shells
- UPDATED R21 collection, R22 detail, R23 lab: research entry points
- UPDATED `package.json`: `test:r24` and `fixture:r24`

## Verification

- `npm run test:r24`: 94 PASS / 0 FAIL
- `node --test tests/*.test.mjs`: 116 total, 113 PASS / 3 SKIP (licensed original-font-dependent) / 0 FAIL
- `python3 static_check.py`: PASS
- `node --check app.js`, `node --check r2-flow.js`, `node --check engine/r24-glyph-ranking.mjs`: PASS
- `npm run fixture:r24 && python3 scripts/r24-ranking-visual-check.py`: 320, 390, 800 and 1440px; no horizontal overflow, all filters present, action controls within viewport
- **Fixture screenshots use deliberately mocked numbers for layout only. They are not original-font measurements or gameplay evidence.**
- `npm run build` could not run because Vite is not installed in the current runtime (`vite: not found`). Local HTTP browser navigation was also blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so live page navigation and font-backed ranking are not claimed as accepted here.
- Original licensed font binaries are not redistributed. Native ranking must be validated locally after the owner installs the authorized font pack.

## Local acceptance checklist

1. Install the authorized original V2 font pack using the existing `scripts/install_font_assets.py` instructions.
2. Serve `r9-index.html` from a local HTTP server. Click Home → `文字属性研究`, or open `#glyph-ranking` directly.
3. Verify the selected font loads and the displayed candidates are measured through the original V2 library. Check each of the four typefaces separately.
4. Sort by Speed, Power, Balance and Story HP in both directions; test equal-value ties, script categories and glyph search.
5. Check unsupported glyphs, missing font assets and invalid outlines: they must not show guessed values or receive a rank.
6. Open a ranked glyph's detail page and return; open comparison lab and return; verify original source screen and current ranking filters remain intact.
7. Confirm the global player leaderboard remains a separate not-yet-connected server feature; no player wins, empirical win rates or online rankings are fabricated.
8. Test keyboard/IME and mobile Safari/Chrome at 320–390px; verify focus stays in the query field during filtering.

## Non-goals

- No online player leaderboard, server ranking, accounts, cloud sync or social features.
- No empirical win-rate claims, universal Unicode ranking or artificial ranking score.
- No changes to Rapier physics, collision formulas, Story unlocks/rewards or save schemas.
- No independently crawlable SSR SEO pages; `#glyph-ranking` remains a client-side route.
