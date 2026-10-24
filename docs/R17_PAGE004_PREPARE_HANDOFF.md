# Moji Blade · R17 · Page #004 / Feature #004

**Baseline:** inherited R16 `f016e49`. **Release date:** 2026-10-24. **Scope:** one page (the battle preparation screen) plus one feature (strict native pre-launch verification). R13–R16 files and commits are preserved; no change to game rules, physics simulation, stage unlock/save structure, rankings or payment.

## Implemented

1. Replaced the old preparation page with responsive two-sided player/opponent cards, actual measured glyph attribute slots, clear font tags, Story mission goals and stars, Classic no-HP notice, and an explicit unranked/local indication. Story opponents (including 01-03 Mincho) come from the **actual LEVEL_CATALOG**, not decorative stage data. Classic opponents use the selected player's font, as the existing Classic adapter does.
2. Story vs Classic rules remain separate; the Classic UI visibly displays `HP —`, never invented health. All player/rival native attributes are derived through `loadClassicLibrary` + `classicGlyphMetrics` + `deriveNativeStats` with each side's correct font.
3. On entry, check saved stage unlock, supported mode/font, a single valid player/opponent glyph and the existence of **both** genuine font glyphs. Start is disabled until both native inspections have resolved. The opponent input in Classic no longer silently truncates multiple characters. Clear contextual messages in ja/zh/en/ko distinguish invalid input, unsupported glyph, missing font and locked stage.
4. Versioned asynchronous preflight cancels stale results after text edits or navigation; a launch lock prevents multiple simultaneous physics bridge invocations. Before launch, recheck the R16 player's native validation and the current story lock, preventing changes from bypassing preparation. Preparation and physics use the same payload; failed startup returns to preparation, clearing the partially opened combat screen, with a visible retry action.
5. Same `r2-flow.js` UI and `r17-prepare.css` consumed by both standalone `r9-index.html` and React/Vite `src/styles.css`. Original combat engines and Rapier formulas unchanged.

## Core files

- New `engine/r17-preflight.mjs`: pure config, unlock and grapheme checks, async cancellable validation gate, launch lock.
- New `engine/r17-native-preflight.mjs`: both glyphs measured via shipped adapters; no fictitious attributes.
- Modified `r2-flow.js`: data-driven preparation UI, Classic opponent validation, native preflight and single-flight launch.
- New `r17-prepare.css`, imported by HTML and Vite entry.
- `r8-classic-screen.mjs` / `r9-story-screen.mjs`: cleanup partially opened arena on launch error; no physics changes.
- `r8-classic-stats.mjs` / `r9-story-stats.mjs`: do not race R17's native preparation labels when R17 is active.
- New tests `tests/r17-preflight.test.mjs`, fixture scripts `scripts/r17-*`, screenshots and `docs/R17_PREPARE_VISUAL_RESULTS.json`.

## Automated verification

- `node --test tests/*.test.mjs`: **47 passed, 3 skipped, 0 failed**. Skips depend on separately licensed V2 font files.
- `npm run test:r17`: **28/28 passed** across R14, R15, R16, R17.
- `python3 static_check.py`: PASS.
- `npm run fixture:r17 && python3 scripts/r17-visual-check.py`: four viewport tests (320/390/800/1440px); no horizontal overflow, eight native stat positions, initial launch disabled, no page script error. **These are UI-only fixtures rendering the actual preparation markup with stubs for licensed fonts, physics and engine state.** The numerical stat dashes are correct unverified placeholders; this is not proof of live native battle.
- Live local HTTP browser navigation attempted; browser refused the loopback URL with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore **full WebGL/on-device battle was NOT tested here**.

## Local integration acceptance for developer

1. Install original licensed V2 fonts locally (never distribute them) using `python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip`.
2. Serve via `python3 -m http.server 8000` or `npm run dev` and open the actual game.
3. Story: choose Stage 01-03 (after unlocking it), use any valid player font, verify opponent `山 / MINCHO` even when the player uses GOTHIC, complete battle and preserve current save data.
4. Classic: set rival `字`; confirm both sides verified and HP dashes displayed; change rival to `文剣` or unsupported glyph and verify launch disabled / accurate feedback; correct it and ensure start works.
5. Rapid edits and clicks: verify slower pending checks never re-enable an invalid selection; double-tap launch issues one bridge request; test valid glyph with missing font, and deliberate battle startup failure.
6. Test navigation and live WebGL on real iPhone/Android 320–390px as well as desktop Chrome.

## Next page

R18 Page #005: battle HUD / active fight interface. Feature #005: battle launch and battle-phase clarity with touch/keyboard accessibility, without changing core physics. Work only from R17, retain Git history, produce new complete cumulative ZIP.
