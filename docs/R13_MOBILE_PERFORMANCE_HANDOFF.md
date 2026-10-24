# Moji Blade V3 — R13 Mobile Controls & Performance Handoff

Date: 2026-10-23. Basis: **R12 full cumulative source** (`moji-blade-v3-r12-core-loop-cumulative.zip`). R13 is **an actual code change** to the original Rapier-backed V3 story game, not a static mock.

## What shipped

1. `engine/r13-quality.mjs`: device-informed quality defaults and a rolling frame-time controller. Auto quality drops after two slow samples and recovers only after eight good samples; a 12-second cooldown prevents oscillation. Manual `HIGH / BALANCED / BATTERY` mode blocks auto decisions. Rendering tier only—physics remains a fixed 60 Hz simulation. Render tiers: High (pixel ratio 1.7, shadows), Balanced (1.25, shadows), Battery (1, no shadows and 30 FPS drawing). Effect tiers further limit particles to 130 / 66 / 26 and redraw to 60 / 40 / 24 FPS.
2. `engine/r13-feedback-policy.mjs`: independent collision visual/audio/haptic cooldowns, intensity grading, optional vibration disabled by default, reduced-motion handling. `engine/r12-feedback.mjs`: per-quality particle caps, mixing gain plus compressor, user-adjustable SFX volume, GPU-safe effects throttling, no changes to collision results. Original `ArenaView` 3D geometry fragments remain the actual shatter result.
3. `engine/r13-mobile.mjs`: device-independent (CSS pixel) hit-radius rules and explicit touch utility contracts. `r9-story-screen.mjs`: quick-pull / precision aim still available, only touches that start near the player top may begin quick dragging; release/cancel still safe; Dash is directional from the right-thumb control. All existing keyboard input retained.
4. `game-experience-r10.css`: HUD and controls responsive across narrow phones and short landscape, safe-area insets, thumb-scale hit targets (mostly >=48px), scroll-safe result, quality and feedback settings popover. `r9-story-screen.mjs` includes controls with Auto/High/Balanced/Battery, Full/Standard/Quiet/Off, SFX volume, vibration opt-in. Global mute is respected.
5. Win, loss and draw share the same result card layout and rematch/stage actions. Rematch uses a short fade then returns to the same text/font/stage. Reduced-motion removes animated transitions.

## Engineering validation done

- `npm run check:r9` passed.
- `MOJI_V2_FONT_PATH=./legacy-v2/fonts/mplus1-medium.ttf npm run test:core` resulted **22 pass, 0 fail, 0 skip**, including original native Rapier parity, HP, Dash and R13 quality/mobile/feedback unit tests. Original `legacy-v2/physics.js` SHA-256 remains `96a5a966fd6cda7b1641d661adfeea0d84aff6cc719492933c5940fc3adad26b`.
- Chromium `page.set_content` using the actual generated battle HTML structure and CSS verified 320×568, 360×640, 390×844, 430×932, 800×390, 844×390, 768×1024, 1440×900 with no horizontal overflow, HUD/control overlap or settings-panel horizontal clipping. This tests **layout only**. Artifacts: `docs/R13_LAYOUT_MEASUREMENTS.json` and `assets/r13-layout-*.png` (these are CSS/HTML fixture captures with placeholder text, NOT live gameplay screenshots).
- Using the same CSS fixtures, result/retry checks at 320×568, 390×844, 844×390 found the replay button visible and keyboard focusable.
- Local localhost/file navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR` in Chromium. Therefore live GPU 3D rendering, real frame-time figures, WebGL context loss, Safari iOS and Android haptics/touch interactions **have not been independently tested in the target environment**. This is not a production release sign-off.

## Actual device release gates

- On iPhone SE-class 320px, 375/390px iPhone, 412px Android, iPad and short landscape: pull/release from player, drag back to cancel, precision-mode click-to-launch, Dash tap and 8 directional swipes, switch to background and return. Confirm no double-fire or accidental Dash.
- Performance: 60 Hz physics consistency regardless of 30 FPS rendering; record device, GPU, dPR, median/P90 frame duration and maximum effects-memory growth for at least 5 minutes per device. Watch for thermal throttling and quality tier transitions. Verify no quality switch during slow loading/paused/hidden frames.
- Visual QA: metal/3D fragments, level-appropriate camera shake, no excessive flashing, result card safe-area fit, keyboard and switchable motion/sound preferences.
- Sound: check mute, 0–100% SFX, clipping/mixing under sustained collisions, background audio/suspension and user-gesture autoplay policy in mobile Safari.
- Accessibility: reduced motion, clear result reason with audio off, touch target size, focus order and landscape orientation.

## Run

```bash
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
MOJI_V2_FONT_PATH=./legacy-v2/fonts/mplus1-medium.ttf npm run test:core
npm run check:r9
python3 -m http.server 8000
# visit http://localhost:8000/r9-index.html
```

Fonts from the user-supplied original source are required locally, and are **not included in release artifacts**. No backend leaderboards or cloud saves were added.
