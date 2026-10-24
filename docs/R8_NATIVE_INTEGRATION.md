# Moji Blade V3 — R8 actual V2 source integration

Date: 2026-10-23. Input: user-provided `source.zip` (117 ZIP entries, original game modules and fonts) and latest R7 cumulative ZIP (96 entries). R8 is a **full cumulative project**, not a delta patch.

## What R8 actually delivered

1. `legacy-v2/`: 46 transitive original JavaScript dependencies rooted at `physics.js`, `glyph.js`, `render.js`. The original source of these JS modules is preserved unchanged and covered by `docs/R8_ORIGINAL_MODULE_MANIFEST.json` SHA-256 hashes. Includes the original Rapier WASM-JS bundle, Three.js and OpenType/Clipper modules.
2. `engine/classic-v2-adapter.mjs`: a thin, testable wrapper around **original** `initPhysics`, `GlyphLibrary`, `Battle`, `statGauges` and `getStage`. It does not replace original physics with the experimental R5 simulator.
3. `r8-classic-screen.mjs`: native Classic VS COM path from V3 HOME → mode selection → glyph → battle preparation → actual Rapier simulation → outcome (with original 3D `ArenaView` when supported; simple 2D *visual fallback only* when WebGL is not available). Does not show HP for Classic.
4. `r8-classic-stats.mjs`: reads actual Gothic/Mincho/POP/Brush V2 glyph properties in the Classic glyph selector. Speed/Power/Balance from original `statGauges`; **no HP in Classic**.
5. Native regression tests: three player/opponent action configurations compare original `Battle` directly with the new adapter at sampled ticks and on final outcome; four locally owned fonts are checked against frozen SHA-256 and results in `scripts/verify_v2_parity.mjs`.
6. The existing R7 experimental HP Chapter 1 (`01-01`–`01-04`), replay, local save and Japanese-style UI remain intact and unmodified in behavior. The Classic battle is explicitly unranked, and it does not write Chapter 1 progress.

## Native source findings

- Original physics version: `moji-blade-rapier021-r16-app-inner1` in `legacy-v2/config.js`.
- Physical timestep: `1/240`, original frame simulation rate multiplier `2.1`; benchmark/adapter calls `advance(1/60)` using the original engine's accumulator (not swapping to an arbitrary 60Hz physics solver).
- Real 3D rigid bodies, convex glyph compound colliders, inertia, stage geometry, floor, critical strikes, ring-out/tilt/stop results.
- 4 configurable font sources: Gothic `mplus1-medium.ttf`, Mincho `NotoSerifJP-Regular.ttf`, POP `RoundedMplus1c-ExtraBold.ttf`, Brush `KouzanGyousho.ttf`. **All four are present in the full uploaded source archive.** The original code uses font key `brush`, while R7 UI called that choice `gyosho`; adapter maps the key.

## Font handling and licensing

**No font file is included in the R8 deliverable ZIP.** The original fonts were read strictly for local testing. To use the fonts already in the user's `source.zip`, install them locally:

```bash
python3 scripts/install_font_assets.py --source-zip /absolute/path/to/source.zip
```

This copies locally from your own ZIP into `legacy-v2/fonts/`. The POP file is present. Confirm font rights and licenses before public distribution; don't assume every font is automatically redistributable. Never rezip or publish the local `legacy-v2/fonts/*.ttf` files as part of this R8 source artifact.

## Local launch

```bash
cd moji-blade-v3-r8
python3 scripts/install_font_assets.py --source-zip /path/to/source.zip
python3 -m http.server 8000
```

Open `http://localhost:8000`, choose **VS COM**, choose glyph and font, then battle. Opening `index.html` as `file://` may fail ESM import/fetch security; use an HTTP server. Do not mix the original native physics CSS/JS with unrelated React/HUD modules without smoke testing.

Run:

```bash
npm test
node scripts/verify_v2_parity.mjs
MOJI_V2_FONT_PATH=/absolute/path/to/mplus1-medium.ttf node --test tests/r8-native.test.mjs
python3 static_check.py
```

`npm test` skips asset-dependent native comparison when `MOJI_V2_FONT_PATH` is not set. The separate golden parity tool **requires** all four local fonts.

## Verified vs not verified

| Area | Verification |
|---|---|
| Original V2 modules parsed and imported in Node | PASS |
| Three native engine scenarios: adapter vs direct original V2 `Battle` | PASS — stepwise state hashes and final result |
| Four font builds (Gothic/Mincho/POP/Brush) | PASS — original Rapier results |
| Four frozen golden native traces and font hashes | PASS |
| R3–R7 automated core tests | PASS |
| Browser R7 layout/flow at 320/390/768/1440 | PASS via inline test |
| HTTP browser test of new Classic V2 WebGL | **BLOCKED**, Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` against local server |
| iOS Safari, actual GPU/WebGL, mobile performance | NOT TESTED |
| Cross-device bitwise deterministic physics | NOT CERTIFIED |
| Cloud saves, leaderboard validation and PvP | NOT IMPLEMENTED |

Original compiled native JS code is supplied by the user and reused as an input baseline; this report does not establish ownership or sublicensing rights over any third-party assets or code.

## What R8 does NOT claim

- R8 does not replace the experimental four-story HP levels with Rapier-backed HP combat yet; Classic V2 and experimental HP V3 are deliberately separate rulesets.
- R8 Classic mode is local **unranked** VS COM; it is not authenticated or authoritative multiplayer.
- SHA-256 hashes verify file consistency but do not prove ownership or block client-side replay tampering.
- R8's 2D rendering fallback is only a presentation fallback for genuine 3D Rapier state, not a new 2D combat simulation.

## Next R9 contract

1. Implement `ArenaHpV3RapierAdapter` *using the native V2 Battle contact force events*, keeping HP as a separate versioned game rule and reproducing old V2 Classic without HP changes.
2. Create damage calibration from impulse/contact strength and explicit termination ordering: ring-out, stopped top, knockout, timeout. Define whether double-KO is a draw. Do not invent damage numbers without benchmarking.
3. Migrate `01-01`–`01-04` to Rapier-backed HP V3 on a **new save/rules version**, with explicit migration from R5. The old R5 level bests should remain accessible as legacy results; do not silently convert them into ranked.
4. Profile WebGL visual rendering on actual Safari/iOS and Android; verify font file loading through production deployment.
5. Only after server-side reproduction and identity/cloud save, start validated ranking; PvP after state-sync and reconnect planning.
