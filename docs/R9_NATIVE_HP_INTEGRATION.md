# Moji Blade V3 R9 — Native Rapier HP Integration

Date: 2026-10-23. Base: the **latest R8 cumulative project**, supplemented by user-supplied `source.zip`. All R2–R8 source files are retained. R9 is a local-only **production architecture candidate**, not an audited competitive release.

## R9 delivered

- `engine/native-hp-rules.mjs`: pure bounded HP rule layer from original Rapier contact force. `arena-hp-rapier-r9-local-v1`, `impact-log-v1`, `moji-blade-rapier021-r16-app-inner1`. No edits to `legacy-v2/physics.js`.
- `engine/classic-v2-adapter.mjs`: existing original-Rapier adapter now retains **raw force** and `criticalAttackers` metadata from V2 events. No modification to original simulation. Existing Classic mode remains no HP and unranked.
- `engine/native-hp-adapter.mjs`: native `Battle` wrapped with damage, HP KO and clear finish ordering; same original geometry, inertia, stage, contact force and motion.
- `engine/r9-native-save.mjs`: a separate local R9 save schema/key. R5–R7 experimental progress is **not silently migrated**. Historical files and save keys are left untouched.
- `r9-story-screen.mjs`: real Rapier story battle with HP, spin HUD, mouse/touch drag release or precise sliders, keyboard action, pause, retry, postgame stars, local trace export, next-stage navigation. When WebGL cannot initialize, 2D **display projection** of the *native* Rapier state; no replacement 2D solver.
- `r9-story-stats.mjs`: native glyph Speed/Power/Balance plus R9 HP in story selection and preparation; async load with version check to prevent stale updates.
- `scripts/verify_native_hp_trace.mjs`: offline replay comparison, **not server certification**.
- `docs/R9_BALANCE_SAMPLE.json`: engineering sample, 6 angles/powers against each Chapter 1 enemy with `田` Gothic; single glyph only.

## Native rule contract

HP stat from the authentic V2 `statGauges`:

```
maxHp = round(66 + 34*balance + 10*power)
```

All three normalized V2 gauge components are clamped 0–1; UI shows integer percentages. Opponent HP receives an isolated level multiplier (`.74/.83/.86/1.05`, from existing Level Contract) and a floor of 30 HP.

Only **resolved V2 contact-force events** contribute HP damage. Original Rapier contact metadata is still subject to V2's hit-event cooldown, so a continuous contact is not treated as hundreds of independent strikes. Damage is mutually inflicted and bounded:

```
base = 5 + 9*ln(1 + force/600)
modifier = clamp(1 + (attackerPower-defenderBalance)*.0035, .72, 1.28)
criticalMultiplier = (attacker in criticalAttackers) ? 1.38 : 1
hitDamage = clamp(round(base*modifier*criticalMultiplier), 1, 48)
```

The sample observed raw `force` from ~159 to ~6,116, supporting nonlinear normalization; **calibration is preliminary**. `power`, `balance` are UI percentages (0–100).

Finish priority per fixed display-frame: native ring-out, tilt, stop or simultaneous-native finish → V3 HP double KO / KO → native timeout; double HP KO counts as draw. Physics version is kept distinct from HP ruleset version.

R9 does not rewrite V2 Classic logic, `ClassicV2Match` motion, geometry, launch, walls or environment. It extends event metadata for consumers. Stage missions and stars preserve the original Chapter 1 objectives; none are submitted to a ranking server.

## Verification completed

- `npm test` with `MOJI_V2_FONT_PATH` set to local Gothic: 11/11 tests passed, including original direct-versus-adapter stepwise native parity and R9 deterministic HP/replay.
- `node scripts/verify_v2_parity.mjs`: **all four fonts and frozen original Classic outcome hashes pass**.
- SHA-256 of `legacy-v2/physics.js` identical to the uploaded original/R8 baseline: `96a5a966fd6cda7b1641d661adfeea0d84aff6cc719492933c5940fc3adad26b`.
- Native local replay sample 307 steps, hash `a2539810`: reproduced using the verifier, modified HP rejected.
- Balance pilot: `田` Gothic, 6 action pairs per level: L01 4W/0L/2D; L02 5W/1L/0D; L03 4W/1L/1D; L04 1W/5L/0D. The Boss is tougher but not impossible in this narrow sample.
- `python3 static_check.py` and all targeted Node syntax checks passed.

**Not verified**: browser loading via real HTTP (Chromium returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this environment), GPU/WebGL render, iOS Safari / Android gesture and device perf, cross-device bitwise native physics identity, licensed public font distribution, cloud storage, server validation, rankings, multiplayer.

## Local use

Extract the cumulative R9 ZIP (fonts deliberately omitted). Copy fonts **locally** from the user-owned `source.zip`:

```sh
cd moji-blade-v3-r9
python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip
python3 -m http.server 8000
```

Browse `http://localhost:8000` (HTTP is required for JS modules and font fetch). Choose **Stage** → **01-01** → glyph/font → Battle; **VS COM** still runs original Classic V2 without HP.

Run regression tests:

```sh
MOJI_V2_FONT_PATH=./legacy-v2/fonts/mplus1-medium.ttf npm test
node scripts/verify_v2_parity.mjs
python3 static_check.py
node scripts/verify_native_hp_trace.mjs /path/to/r9-local-trace.json
```

A local ZIP containing `source.zip` fonts must **not** be re-shared until rights for every font have been individually verified. Existing bundled original vendor JS was supplied by the user; this document does not independently establish sublicensing rights.

## Remaining blockers

1. Verify full real browser/GPU interaction; diagnose any canvas/input or lifecycle issues on production-like HTTP.
2. Build comprehensive balance certification across multilingual glyphs and fonts; characterize native contact-force statistics, double KO and low/zero-contact outcomes.
3. Version-pin native geometry/font hashes and compare across Chrome/Safari / hardware before creating replay-verified rankings.
4. Define identity, D1 migration / conflict-safe cloud sync; use server-owned inputs & per-user auth before any ranked reward.
5. Investigate further input quality and presentation at 320px, low-end phone, reduced motion.

## Important boundary

`r5-battle.mjs`, `shape-sim-v5.mjs`, and R6 replay modules remain in the archive for regression/history but are **no longer linked as the active story battle script** in `index.html`. Never treat R5 results as native-R9 progress or submit them to a competitive leaderboard.
