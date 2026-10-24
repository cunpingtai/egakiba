# Moji Blade V3 — R11 Game Feel / Gameplay Polish

## R11 goals and delivery

This round works on the **latest R10 cumulative base** rather than building an unrelated visual mockup. It preserves the genuine uploaded V2 Rapier code, R9 HP story campaign, first four stages, typed glyphs and two-glyph strength comparison, and local save namespace.

### Implemented

- Aim gestures: pull-to-launch for quick mode and hold-to-aim for precision mode, with a pure testable `pullAim` mapping and movement dead zone. Live angle/power readouts remain tied to the selected action.
- Directional Dash: player can tap the Dash button for forward motion or swipe on it to select a direction, with a prominent direction preview. Duplicate click after swipe is suppressed.
- Keyboard: A/D adjust angle, W/S adjust power, Q switches spin, Enter launches, Space or D during battle uses Dash, Escape pauses. Gameplay shortcuts do not steal focus from form fields.
- Hit feedback: transient arena flash, stronger critical cue, contextual HP damage for both combatants, HUD glyph hit emphasis, original 3D hit response and native audio cue. Honors reduced-motion preference.
- Results: game-style VICTORY/DRAW/DEFEAT, visual hit/dash/HP summary, local-save feedback, and technical replay export moved into expandable match details.
- Cleanup: timers, handlers and GPU objects are disposed on exit. Existing gameplay flow and comparisons are retained.

### Important nonclaims

- This is **not** pixel-for-pixel reproduction of the third-party website. The other game's assets/code, audiovisual design and service ranking are not copied.
- The native Rapier solver and HP game rules remain as they were. Dash is **already part of the R10 local-only ruleset** and uses an unverified local replay; none of these results are authoritative competitive scores.
- R11 HTTP/Chromium test was blocked by the test sandbox's `ERR_BLOCKED_BY_ADMINISTRATOR`; WebGL, Safari and real mobile haptics remain pending manual acceptance.
- Cloud saves, production verified rankings, multiplayer, collectible achievements, and full shatter effects are not implemented in this round.

## Run

```sh
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
python3 -m http.server 8000
```

Open `http://localhost:8000/r9-index.html` for the cumulative static-game entry. The TanStack application entry remains `npm run dev` / `src/routes/index.tsx` (after installing Node dependencies).

## Automated verification

```sh
python3 static_check.py
MOJI_V2_FONT_PATH=./legacy-v2/fonts/mplus1-medium.ttf node --test tests/r3-engine.test.mjs tests/r4-shape.test.mjs tests/r5-engine.test.mjs tests/r6-replay.test.mjs tests/r7-assets-and-parity.test.mjs tests/r8-native.test.mjs tests/r9-native-hp.test.mjs tests/r11-input.test.mjs tests/r11-arcade.test.mjs
```

## R12 next

Real-browser GPU smoke with browser that can reach the served site, mobile touch/haptic acceptance, camera shakes/particle palette and mid-battle controls; then integrate additional game content only after the core loop is validated. Provide cloud save and verified rankings as independent later milestones.
