# Moji Blade · R18 · Page #005 / Feature #005

**Released:** 2026-10-24. **Single cumulative baseline:** R17 `04a3b34`, with preserved Git history R13 → R14 → R15 → R16 → R17 → R18. The change is scoped to the **in-battle screens (Story HP + Classic V2)** and **stage/input/Dash/pause phase feedback**. No new game modes, stages, leaderboard, server, third-party fonts, pricing or social features. All original battle rules, Rapier body creation, impulses, collision math, saves and unlocked stages stay unchanged.

## Actual implementation

1. Introduced a shared, deterministic, four-language UI projection (`engine/r18-battle-hud.mjs`) for **loading / ready / battle / paused / settling / result**. This supplies concise progress cues and relevant touch/keyboard help; it never guesses actual physical outcomes.
2. **Story Arena HP**: in-game phase badge under the match clock; new low-height HUD info strip above action buttons with stage/action hints, a real mechanical Dash state (ready, cooldown from `DASH_COOLDOWN_FRAMES` and current frames, low spin, speed or unavailable), and low-HP warning derived from the existing match snapshot and max HP. Announcements are triggered on threshold change, rather than every simulation frame.
3. Story fixes the premature clickable-but-inert pause button: it remains disabled until successful `match.launch`. Pause/resume continue to gate the native fixed-timestep loop. The pause overlay adds **two-tap confirm to leave**, with a notice that abandoning a match does not create a saved result; it returns to existing Story stage selection.
4. **Classic V2**: added a compact, non-HP battle-phase strip and a real pause button. Classic pausing gates the existing Rapier `stepFixed` loop; resume resets frame timing to avoid simulating the time spent paused. Escape works during a match, and leave also requires two actions. Classic physics remains original and HP-free.
5. UI styles in `r18-battle.css` loaded by both the standalone `r9-index.html` and the React/Vite `src/styles.css`. Desktop, tablet, 390px and 320px states have safe-area-respecting controls. Reduced-motion styles included. Existing accessibility/status labels stay in place.
6. Existing story results, local save, SVG/Canvas preview, Dash mechanics, launch gesture, scene rendering, localized preparation pages, quest progress and all previous versions remain intact. R18 does **not** promise real online multiplayer, authoritative ranking or network verification.

## Files changed/added

- `engine/r18-battle-hud.mjs` pure four-locale status contracts and mechanical Dash/health projections.
- `r9-story-screen.mjs` live R18 story HUD state, gated pause, safe leave.
- `r8-classic-screen.mjs` Classic phase strip and native simulation pause/leave.
- `r18-battle.css`, plus stylesheet inclusion in static and React entries.
- `tests/r18-battle-hud.test.mjs`, `scripts/r18-battle-fixture.mjs`, `scripts/r18-visual-check.py`.
- `assets/r18-battle-*.png` screenshots, `docs/R18_BATTLE_VISUAL_RESULTS.json`.
- `README.md`, `package.json`, `R18_MANIFEST_SHA256.txt` and the release ZIP.

## Automated tests (this environment)

- `node --test tests/*.test.mjs`: **55 pass / 3 skip / 0 fail**, total 58 cases. The three skipped cases require original licensed font data absent from this delivery.
- `node --test tests/r18-battle-hud.test.mjs`: 8 pass / 0 skip / 0 fail.
- `python3 static_check.py`: PASS.
- `npm run fixture:r18 && python3 scripts/r18-visual-check.py`: rendered actual battle-template HTML for Story/Classic in Chromium as UI-only fixtures at **320 / 390 / 800 / 1440px**, no horizontal overflow, visible battle Dash/pause controls inside viewport, no fixture JS errors. Story launch control is intentionally hidden **after** launch, so invisible controls are not counted as failures.
- `node --check` on changed JS modules and `git` integrity checks: PASS.

**Testing limitation:** the fixture places an illustrated CSS background behind the arena; it does **not** execute Rapier or a WebGL session and is **not** a screenshot of live play. The licensed original V2 fonts are not bundled. Genuine mouse/touch gesture input, actual WebGL frame rendering, physics hit feedback, Dash correctness in a live match and iOS/Android device testing are still **unverified in this execution environment**. R18 tests check the pure status calculation and runtime hook presence; they do not replace live integration acceptance.

## Hands-on acceptance checklist on developer machine

1. Install original licensed fonts locally: `python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip`. Do not redistribute font files.
2. Start `python3 -m http.server 8000`, open `http://localhost:8000/r9-index.html` in a browser with functional WebGL, enter Story Chapter 1.
3. Verify phase goes **loading → ready** and pause is disabled until launch. Aim with finger/mouse; fire; observe **battle** phase and Dash state. In a real cooldown, verify its number decreases at the real frame rate; spin/speed lock warnings must match physics.
4. Pause with the button or Escape, confirm the battle actually freezes, resume without a time jump. Test first click of **Leave stage** only changes the confirmation label, second returns to stages without recording a result. Cancel by resuming and ensure confirmation state resets.
5. Let Story reach settling and result, verify previous earned stars/progress/local save and replay unchanged. Try both win and loss, Android Chrome and iOS Safari, small portrait and landscape devices.
6. Launch Classic Free Battle: confirm **no HP gauges**, fire, pause/resume, keyboard Escape and leave confirmation; Classic time should not advance while paused. No leaderboard entry should be created.
7. Simulate missing fonts, WebGL failure, missing local storage, and slower device graphics. Ensure previous R14–R17 flows still function.

## Next planned release

**R19: Page #006 (battle results screen) + Feature #006 (meaningful round summary, clear retry/next actions and local battle history hooks)**. Start only from this R18 Git HEAD, keep all history and package the complete repository as a new version. Do not pretend local results are authoritative rankings.
