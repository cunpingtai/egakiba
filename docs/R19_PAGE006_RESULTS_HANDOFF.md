# Moji Blade R19 · Page #006 / Feature #006 · Battle results and local record

**Release date:** 2026-10-24  
**Only production baseline:** R18 Git `d18a828` (unmodified R13–R18 commit chain preserved).  
**Scope:** story result screen and Classic result treatment; story-only local recent match journal. No engine, physics, collision, font assets, stages, ruleset, unlock, online leaderboard, social, payment or login changes.

## Implemented

1. Story result UI projects **actual R10 trace** and the **existing `evaluateLevelResult` result** into four-localized (ja/zh/en/ko) result views: winning condition, bonus HP threshold `>=55%`, per-stage time threshold, star count, duration `frames / 60`, actual remaining/max HP, actual Dash log count, and actual native impact event count. These are *contact events*, not estimated damage.
2. Historical best comes from **progress *before* the battle was saved**, and new-best chips appear **only after confirmed successful local progress persistence**. Existing R10 best-time and max-star merge rules remain unchanged. A match win with an unmet stage objective is explicitly **not a stage clear**. Loss or draw never grants bonus stars.
3. A separate **non-authoritative recent Story match journal** under `moji-blade.r19.story-result-history.v1`, capped at 30 compact summaries. Journal read/write is failure-safe, does **not** modify R10 save, and cannot unlock stages or submit scores. If the main progress cannot be saved, the optional journal is not written and the UI reports the limitation. Compact summaries intentionally omit complete contact logs and raw physics frames; full locally downloadable trace export remains available via the existing button.
4. Results retain original **Retry / Next stage (only when legitimately cleared and saved) / Stages / Export** handlers and original restart transition and focus behavior. Old game-specific result overlays are replaced only in final rendering.
5. Classic V2 results share the typography, time, true per-frame returned contact-event count and end reason; **no HP/stars/journal/leaderboard** for Classic. Classic uses the existing original physics, not Story HP mechanics.
6. CSS adapts the results page to desktop and 800/390/320px, with a sticky action row on small Story screens, an appropriately-sized high-contrast Classic dialog, reduced-motion support and overflow-safe scroll regions. Both static `r9-index.html` and React/Vite stylesheet paths reference `r19-result.css`.

## Added/changed source

- `engine/r19-result-report.mjs`: one shared report projection, localized copy, escaped HTML rendering and capped optional journal.
- `r9-story-screen.mjs`: create R19 report after R10 result commit, read prior record, save optional history, render report, keep existing handlers and trace export.
- `r8-classic-screen.mjs`: contact event count during real Rapier steps, shared local Classic result layout; no new game rules.
- `r19-result.css`, `r9-index.html`, `src/styles.css`.
- `tests/r19-result-report.test.mjs`, `scripts/r19-result-fixture.mjs`, `scripts/r19-result-visual-check.py` and example fixture/screenshot artifacts under `assets/`.
- `docs/R19_RESULT_VISUAL_RESULTS.json`, `docs/R19_PAGE006_RESULTS_HANDOFF.md`, `package.json`, `README.md`, `R19_MANIFEST_SHA256.txt`.

## Validation in this runtime

- `node --test tests/*.test.mjs`: **63 PASS / 3 SKIP / 0 FAIL** (66 tests). The 3 skips require separately licensed original game fonts not present in this ZIP.
- `python3 static_check.py`: PASS; no duplicate HTML ids.
- `node --check` R19 engine + Story and Classic browser entry: PASS.
- `npm run fixture:r19 && python3 scripts/r19-result-visual-check.py`: Chromium rendering via `set_content` of UI fixtures extracted from **actual Story and Classic template markup** and the shared R19 report function. Tested 1440×900, 800×900, 390×844 and 320×700, plus Story loss and Classic result variants. 0 horizontal overflow and buttons have positive size and are within screen width.
- **No claim of a completed live WebGL/Rapier battle session or native mobile-device verification.** File and local network navigation are sandbox-restricted; fixtures are UI-only with CSS arena backgrounds.

## Developer device acceptance

1. Install licensed original game font assets locally; do not redistribute. Serve project over local HTTP as described in R18 docs.
2. Story level 01-01: win with all goals; verify star breakdown, HP, time, actual Dash/contact counters, new-best chips on first clear, next stage access and local `R10_SAVE_KEY` progression.
3. Replay slower and earn fewer stars: confirm prior highest stars and best time never decrease. Replay faster and confirm record chip. On stage 01-02 win below 65% power and on 01-03 win below 0.15 radians angle: expect **win but objective unmet and 0 stars**.
4. Defeat or draw: no mission clear, 0 stars, no inappropriate Next stage. Journal may log these outcomes only when the main save succeeds. Verify <=30 recent entries and clear separation from R10 progress.
5. Disable localStorage in browser: verify graceful warning and no false claims of persistence/new record. Retry and return actions remain available.
6. Classic V2: verify no HP, stars, story journal or ranking claim; pause and Rapier physics remain as R18. Test keyboard and touch on 320/390px and long translated labels.

## Next release proposed

R20 · Page #007: Personal player archive / battle history view and Feature #007: filterable offline records & progress (no accounts/social). Always continue from **R19 Git** cumulative ZIP with preserved history.
