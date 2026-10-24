# Moji Blade · R14 — Page #001 Home + Feature #001 Chapter Resume

Date: 2026-10-24. **Full cumulative source:** R2–R14. This release is intended as the **only base for R15**. No earlier files have been removed or replaced with placeholder gameplay.

## Scope of this increment

- **Page #001 — Home**: `r9-index.html`, matching React route `src/routes/index.tsx`, and `r14-home.css` / `src/styles.css`.
- **Feature #001 — Continue Chapter 01**: `engine/r14-campaign-progress.mjs` reads the authoritative `moji-blade.v3.r10.rapier-arcade.local.v1` save using `loadArcadeSave`, and uses the existing `LEVEL_ORDER`/`isUnlocked` gate. `r2-flow.js` provides one read-only UI adapter (`window.MojiBladeR14Campaign`) and emits `moji:campaign-ready`. `app.js` renders progress and dispatches the existing `moji:navigate` event.
- **New**: chapter progress card with 4-stage progress, stars earned, next opponent and translated labels (ja/zh/en/ko). Desktop/tablet/mobile home layout correction, particularly ≤390px.
- **Unchanged**: original Rapier physics, collision code, HP rule, Dash, Classic screen, story screen, all other mode paths, old save keys and prior handoffs.

## Functional behavior

| Existing native progress | Home display | Primary CTA action |
|---|---|---|
| New/no save | 0/4; next 01-01 | `moji:navigate` `glyph`, story `01-01` |
| 01-01 cleared | 1/4; next 01-02 | `prepare`, story `01-02` |
| 01-01..01-03 cleared | 3/4; boss 01-04 | `prepare`, story `01-04` |
| All 4 cleared | 4/4 complete, stars earned | `stages`, story `01-04` (replay selection) |
| Storage unavailable | 0/4, explicit warning | `glyph`, story `01-01` (progress may not persist) |
| Invalid/out-of-order progress | Only contiguous real clears counted | First legally playable stage |

The projected progress is **local device progress only**, not a leaderboard, account, cloud save or verified server match. Disabled streak/scout modes stay disabled. Chapters 02 and 03 remain previews, not falsely unlocked.

## Verification performed

1. `node --test tests/r14-campaign-progress.test.mjs`: 6 tests passed (new, one clear, three clears, full clear, broken ordering, unavailable storage).
2. `node --test tests/r14-campaign-progress.test.mjs tests/r13-experience.test.mjs tests/r11-input.test.mjs tests/r12-feel.test.mjs`: 16 passed, zero fail/skip.
3. `python3 static_check.py`: PASS.
4. Chromium's `page.set_content` *DOM/CSS fixture* using the real full homepage HTML/CSS and `app.js` with a mocked native-progress adapter: 320×568, 390×844, 800×390, 1440×900; no horizontal overflow, successful resume route to `01-03`, and chapter-complete route to the stage picker. See `R14_LAYOUT_FIXTURE_RESULTS.json`, `assets/r14-home-*-layout-fixture.png` (**UI fixtures, without live 3D WebGL**).
5. Attempted actual local HTTP game navigation, but the runtime blocked it with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. **Real WebGL frame, physical mobile touch and full gameplay handoff remain unverified**, not accepted as production-ready.

## How to run locally

```bash
# install only the fonts you have separately licensed; this ZIP includes no font files
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
python3 -m http.server 8000
# open http://localhost:8000/r9-index.html

node --test tests/r14-campaign-progress.test.mjs
python3 static_check.py
# For TanStack/Vite route, install dependencies and then npm run dev.
```

## R15 next suggested single increment

**Page #002 — Story Stage Select**, **Feature #002 — true stage selection/mission clarity**. Upgrade the existing story-stage chooser with one-page stage card design, real 01-01..01-04 objectives, boss identification, locked/previews states, and consistent back/continue routing. Do not enable Chapter 02 content until real playable levels are implemented. Use this exact R14 archive as the sole input.

## Version rules for following increments

1. Unzip R14 as the next working root; never restart from the original R13.
2. Keep cumulative project, assets, documentation, tests and `.git` history intact.
3. Implement exactly one page and one meaningful feature per version unless asked otherwise.
4. Run targeted and applicable regressions; disclose missing fonts or blocked live-device validation.
5. Commit once per increment and deliver a full-source ZIP **including `.git`**, README, handoff, manifest and verified hash.
