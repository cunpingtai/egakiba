# Moji Blade V3 — R12 Core Loop Polish / Handoff

Date: 2026-10-23. Basis: **R11 cumulative release** (`moji-blade-v3-r11-game-feel-cumulative.zip`).

## Delivery and scope

R12 specifically tightens the core loop **type/select glyph → launch → dash → impact → finish → retry**. This is a functional change to the genuine `r9-story-screen.mjs` production-bound UI, not a new concept mock. R12 keeps glyph/free text selection, two-glyph attribute comparisons, level 01-01–01-04, HP/Spin, local records, Rapier physics, and the reference engine parity tests from R11.

- `engine/r12-feedback.mjs`: browser presentation controller with independently bounded hit strength tiers, ambient-safe audio layering (brief tonal transient + short filtered noise), impact-dependent effects, and canvas debris/ring sprites. Distinct finishing burst. **Presentation only**; never writes to `Battle` physics or HP. Original WebGL `ArenaView.hit()` still handles physical-location sparks and its real scene fracture; `ArenaView.finish()` remains the original 3D end-of-round fracture.
- `r9-story-screen.mjs`: wires actual native physics hit positions to presentation effects (when available); existing WebGL camera response and a small screen impulse reinforce contact weight. Sound enabled state follows the actual app mute button. Finish presentation happens before result layout; on retry, all effects resources are disposed and recreated.
- `engine/r12-touch.mjs`: deliberate launch-handle hit testing, armed/cancel states, deadzone mapping, precision aim behavior. R12 touches must originate near the player's blue top; pulling back toward the anchor cancels. Pointer cancel or loss of capture never fires.
- `game-experience-r10.css`: transparent no-hit-testing effects layer; mobile safe-area buttons >=48px; touch-action reserved to the arena; impact and results animation hierarchy; reduced-motion/low-motion accommodation.
- `tests/r12-feel.test.mjs`: pure unit tests for force-to-tier mapping, cancellation, deliberate touch, and precision.

## Rules and compatibility

- Original Rapier physics and the R10 local dash rule contract **unchanged**.
- No new unverified score is ever submitted to public rankings.
- The existing R9/R10 local save namespace and replay trace schema **unchanged**.
- Presentation particles are deliberately **not** part of authoritative replay hashes; they use cosmetic randomness.
- No third-party competitive website's copyrighted images, music, brands or other assets are incorporated.

## Test evidence

With the original four fonts temporarily installed locally from the user-supplied `source.zip` (not packaged), the full test command below finished **17 passing, 0 skipped, 0 failures**. `python3 static_check.py` passes. JavaScript module syntax checked. An HTTP server was started, but Chromium navigation to `http://127.0.0.1:9183/r9-index.html` returned `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore **mobile browser/GPU, iOS Safari, real haptics, and full end-to-end UX are unverified**. Do not call this a production quality sign-off.

```
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
python3 static_check.py
MOJI_V2_FONT_PATH=./legacy-v2/fonts/mplus1-medium.ttf node --test \
 tests/r3-engine.test.mjs tests/r4-shape.test.mjs tests/r5-engine.test.mjs \
 tests/r6-replay.test.mjs tests/r7-assets-and-parity.test.mjs \
 tests/r8-native.test.mjs tests/r9-native-hp.test.mjs \
 tests/r11-input.test.mjs tests/r11-arcade.test.mjs tests/r12-feel.test.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/r9-index.html`, pick **STORY**, choose/enter a supported glyph, launch chapter 1.

## Manual release gate

1. **Mobile Safari** iPhone 375/390 wide: drag blue glyph and release; a tap outside does not launch; pull back to origin cancels; precision mode holds aim, then `発射！` launches; device keyboard does not disrupt touch and safe-area buttons stay tappable.
2. **Android Chrome** 320/360/412 wide: same; swipe Dash in all four directions; tap Dash applies forward action; returns from background without duplicate actions.
3. **Desktop** keyboard A/D, W/S, Q, Enter, Space; focus in text fields never hijacked.
4. **Visual QA** inspect actual GPU hit sparks, reaction time, camera shake, WebGL recovery, final 3D fracture, win/lose pacing, 30/60 FPS performance, and a low-end device.
5. **Sound QA** mute remains muted, unmute starts only on user gesture, overlapping impacts are not excessively loud; reduced motion keeps outcome readable.
6. **Replays** verify native simulation hashes and results identical to R11 for identical actions.

## Following stage

R13 should perform real-device acceptance and visual calibration. Do not add more modes until the existing first four Rapier/HP stages are reliably polished on mobile and desktop. Then add reliable cloud saves and verified rankings as separate workstreams.
