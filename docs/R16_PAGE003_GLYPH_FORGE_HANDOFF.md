# Moji Blade — R16 Page #003 Glyph Forge + Feature #003 Real Glyph Validation

**Release:** 2026-10-24 · **Base:** R15 `436b4fc` · **Deliverable:** R16 cumulative ZIP including original R13/R14/R15 Git history.

## Scope shipped

- **One page: Glyph selection / forge** (`r2-flow.js`'s `glyph()` view). Keep the existing 3D spinning glyph preview, four font choices, suggested characters, side-by-side glyph comparison and original prepare page. Refresh its hierarchy, form controls, native-stat panel and mobile/desktop readability with `r16-glyph.css`. The same CSS is loaded by static `r9-index.html` and React/Vite `src/styles.css`; both use the same flow controller.
- **One feature: a validated glyph selection contract**, not a simulated property calculator. `engine/r16-glyph-contract.mjs` validates a **single NFC-normalized visible grapheme** and known font/mode, rejecting empty/invisible/multi-grapheme inputs. The existing `loadClassicLibrary(font)` + font glyph support check + `deriveNativeStats` source supplies **actual native V2 glyph geometry-derived** attributes for the chosen font. **Classic has no HP**; Story displays HP from the existing Arena HP rules. Comparison indices are indicative shape-based scores and not win probabilities.
- On every glyph/font change, the CTA is disabled while font data is being checked, and only enabled for the current confirmed choice. Slower earlier requests cannot overwrite later results. Missing fonts and unsupported glyphs show distinct, localized errors (ja/zh/en/ko); they do not display invented stats or permit continuing. Invalid input disables the CTA and clears stale numerical attributes. A launch-time verification checks the selection again.
- Removed competing glyph-page stat display writers from `r8-classic-stats.mjs` and `r9-story-stats.mjs`; **their existing prepare-page native summaries stay intact**. Glyph forge's stat display, score, status and CTA are updated together by `glyph-compare-r10.mjs`, reusing the established comparison library/cache. Preserves Classic and HP physics, font backend, local saves, stage unlocks, navigational flow and URLs.
- The home input now refuses multi-character entries instead of silently accepting only the first visible glyph; it prompts the user to choose one glyph.

## Test verification

- New test file `tests/r16-glyph-contract.test.mjs`: NFC, whitespace/invisible/multi graphemes, font/mode validation, waiting-gate state, stale async races, missing font / unsupported glyph, and invalidation. `npm run test:r16`: **20/20 passed** (R16 + R15 + R14 tests).
- Full existing Node test battery: **39 passed, 3 skipped, 0 failed** (missing separately licensed V2 fonts). File: `../r16-regression.log` during development; the release copy is `docs/R16_REGRESSION_RESULTS.txt`.
- `python3 static_check.py`: PASS.
- UI-only layout fixture generated from the **actual R16 `glyph()` markup** plus shipped styles: 320×690, 390×844, 800×920, 1440×960 all had **0 horizontal overflow**, four stat slots, disabled CTA before validation and working button selection in fixture. Screenshots `assets/r16-glyph-*-layout-fixture.png`, test results `docs/R16_GLYPH_LAYOUT_FIXTURE_RESULTS.json`. This fixture uses a **static glyph placeholder** in place of WebGL and does not validate actual physics, licensed fonts or physical-device behavior.

## Local production acceptance still required

1. Install the separately licensed original `source.zip` font resources. **No font files are included**: `python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip`.
2. Serve with `python3 -m http.server 8000`, open `http://localhost:8000/r9-index.html` (or use `npm run dev` for the React/Vite shell).
3. In both Story and Classic, test `龍`, `文`, a known unsupported glyph, and rapid Gothic → Mincho → POP → Gyosho switches. Check that stats, comparison scores and 3D mesh correspond to the chosen font; verify *Start* cannot activate before support confirmation, and that the actual battle receives matching `char`/`fontId`.
4. Test 320px Android and iOS Safari touch rotation, IME input and full native Rapier fight. The tool environment could not complete a live WebGL/full battle browser test; the fixture must not be misrepresented as one.

## Change map

- New: `engine/r16-glyph-contract.mjs`, `r16-glyph.css`, `tests/r16-glyph-contract.test.mjs`, `scripts/r16-glyph-fixture.mjs`, `scripts/r16-visual-check.py`, `docs/R16_GLYPH_LAYOUT_FIXTURE_RESULTS.json`, R16 screenshots.
- Modified: `r2-flow.js`, `glyph-compare-r10.mjs`, `r8-classic-stats.mjs`, `r9-story-stats.mjs`, `r9-index.html`, `src/styles.css`, `package.json`, `README.md`.
- No changes to physical combat algorithms, stage catalog, saved progress format, backend, account services, or leaderboard.

## Next recommended R17

**Page #004 — Battle preparation screen**, **Feature #004 — preflight integrity and opponent verification**: live opponent glyph font-support feedback for Classic, consistent preparation stats, robust double-click/launch failure handling, focused mobile CTA and explicit ruleset difference. Again inherit **R16 only**, no restart.
