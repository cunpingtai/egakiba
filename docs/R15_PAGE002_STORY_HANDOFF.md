# Moji Blade · R15 — Page #002 Story Stage Select + Feature #002 Missions

Release date: **2026-10-24**. **Cumulative base:** R14 commit `95ac537` from the user-provided R14 archive. **New release:** R15. No physics, asset, Classic battle or saved-game key was reset. Preserve this R15 package, including `.git`, as the sole base for R16.

## What was actually implemented

- **Page #002: story stage selector** replaces the existing 12-stage misleading selector with a finished chapter selection UI. Four actual V3 Chapter 1 native Rapier stages display as cards (01-01, 01-02, 01-03, 01-04). Chapter 02/03 are visible **disabled previews** and cannot be entered. On all devices the left/upper area shows stage status and earned stars; selected details show the enemy glyph, local best time, clear mission, three-star requirements and call to action.
- **Feature #002: data-backed stage mission display & gated selection.** `engine/r15-stage-board.mjs` is a pure read-only adapter around the **R10 native Rapier local save** (`readCampaignSnapshot`) and the real `LEVEL_CATALOG`. Stages may only be selected if marked `cleared` or `next`; invalid out-of-order saves do not unlock anything. The existing battle result evaluator is preserved, and this screen shows exactly its thresholds (victory plus mission requirement; >=55% remaining HP for second star; finishing within the stage target for third star).
- Stage-specific conditions are taken from existing evaluator data: 01-01 victory, 01-02 **>=65% launch power**, 01-03 **>=0.15 rad** (shown as **9°** because the precision slider uses whole degrees), 01-04 defeat 剣; target times 16/19/20/24 seconds respectively. HP and time stars are awarded only if the clear objective is satisfied, not independently on a lost round.
- Stage cards now display **verified local save projections**, never fabricated values: `state`, 0–3 stars, and stored `bestSeconds`. `engine/r14-campaign-progress.mjs` receives one backwards-compatible best-time property. Story screen mission text is aligned with the same contract in ja/zh/en/ko (`r9-story-screen.mjs` — textual display only).
- The existing event flow is preserved: select an available stage → choose glyph → prepare → original R10 Rapier fight → native local result commit. A locked stage cannot be launched by selecting its card or via an incoming `moji:navigate` stage ID. The `data-stage-start` CTA does not skip glyph configuration. Tab focus is restored to the newly rendered card after a selection.
- **Static + React/Vite parity:** both entrypoints load `r15-story.css`. `r2-flow.js` supplies the shared page for both; no React duplicate was introduced.

## Tests and QA

- `node --test tests/r15-stage-board.test.mjs tests/r14-campaign-progress.test.mjs`: logic tests for new/no progress, 2-stage progress, chapter complete, unavailable localStorage, forged/out-of-order progress, 4 localized mission contracts and parity with `evaluateLevelResult`.
- Broad suite: `node --test tests/r15-stage-board.test.mjs tests/r14-campaign-progress.test.mjs tests/r11-input.test.mjs tests/r11-arcade.test.mjs tests/r12-feel.test.mjs tests/r13-experience.test.mjs`. **24 passed, 1 skipped** (real Rapier font-dependent suite requires separately licensed local font). `python3 static_check.py` passed.
- CSS / DOM visual fixtures: `node scripts/r15-stage-fixture.mjs` then `python3 scripts/r15-visual-check.py`. Four viewports **1440×900 / 800×900 / 390×844 / 320×690**; all displayed 4 stage cards, had no horizontal overflow, and no in-page JS errors. Fixture card selection/CTA exercised on desktop/mobile. Screenshots in `assets/r15-stage-*-layout-fixture.png`; machine-readable results in `docs/R15_STAGE_LAYOUT_FIXTURE_RESULTS.json`.
- The browser runtime **blocked local `file://` and local HTTP navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`**. The fixtures use *the actual page renderer function and CSS* but mock the browser environment and **do not run live Rapier physics**, full bridge handoff, actual fonts, or physical mobile-device interactions. They must not be represented as complete end-to-end tests.

## Run locally

```bash
# The original licensed font archive is not bundled with this release.
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
python3 -m http.server 8000
# open http://localhost:8000/r9-index.html
node --test tests/r15-stage-board.test.mjs tests/r14-campaign-progress.test.mjs
python3 static_check.py
```

## Not included

- No extra 8 playable levels and no Chapter 02/03 battle unlocks.
- No additional missions persisted into a different save schema. The feature presents existing **real clear/star requirements**, not a new client-forged quest reward ledger.
- No cloud save, multiplayer, leaderboard or social system.
- No fonts; the user's licensed glyph source must be installed separately for real Rapier visuals.

## R16 suggested next increment

**Page #003 — Glyph selection/forge** + **Feature #003 — real-time validated glyph choice and clear battle attributes before launch**. Keep all existing R15 files and both previous Git commits. Do not rework physics or invent performance numbers from fallback geometry.
