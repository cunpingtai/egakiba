# Moji Blade R5 → R6 Handoff

## Snapshot: Oct 23, 2026

**Source baseline:** previous R4 cumulative project, copied intact before making changes. The R5 archive includes earlier screenshots/docs/modules and new R5 code. Do not treat R3/R4 archived engine modules as active entrypoints.

## Built and verified in R5

1. New `shape-contact-v5.mjs`: sampled collision contact and estimated normal from raster silhouette occupancy; basic overlap correction; hole/concavity respect inherited from R4.
2. New `shape-sim-v5.mjs`: 60Hz fixed-step deterministic-in-one-runtime progression, 1–4 substeps, estimated angular inertia/impulse; exposed collision event (`contact`, `normal`, `angular`) and version tuple.
3. First chapter: `01-01` intro / `字`, `01-02` minimum 65% power / `力`, `01-03` at least 0.15 rad (~9°) aim / `山`, `01-04` boss `剣`. Each stage has separate enemy HP/power/seed, completion criteria and time targets. Subsequent eight remain locked previews.
4. Sequence unlock, three-star max record, personal best and battle-count. R5-only local save key with version gate; losses/draws/failing objectives cannot unlock the next level.
5. Battle HUD presents mission objective. Finish UI distinguishes winning a round from clearing its mission. Homepage next-stage and record state react to saves.
6. Node test suite and restricted-environment Chromium smoke. Browser tests cover 320, 390, 768 and 1440 px, lock rejection and first-four-stage wiring. Sampled outcomes in `R5_BALANCE_SAMPLE.json` (15 actions × 4 levels) show varied local results; no claims of certified balance.

## Quality limitations / open risks

- Missing **actual V2 source files and versioned font assets**; cannot claim V2 physics parity, original skin/video/Scout migration, or platform-safe rankings.
- Glyph silhouettes rasterized from **device-dependent browser fonts**. No canonical font asset, no server verification, no cross-platform hash equivalence. Never upload R5 results as competitive/verified scores.
- Contact normal and impulse are **approximations**, broadphase/occupancy samples are not a certified robust collision algorithm. Penetration depth is heuristic; CCD, collision energy conservation, proper spin angular momentum, and long-run stability still require a real rigid-body solver or original V2 migration.
- Actual browser navigation to local HTTP modules blocked in this test environment; inlined browser smoke is not a live HTTP integration test. GPU preview & device tests outstanding.
- R5 4 stages are functional **offline prototypes**, not fully content-approved, difficulty-certified levels. Sampled with one character in one font only.
- Cloud saves, account binding, database migrations, rewards, ranked leaderboards, PvP, bot anti-cheat, video sharing and complete V2 feature parity are not implemented.

## R6 priority (do in order)

1. Obtain current complete **original V2.4.2+ repository/source archive** including physics, glyph, fonts, render, config, stages, resources and runtime license metadata. Run the retained non-destructive `scripts/v2_source_audit.py` to capture checksums and dependency manifest. Do NOT overwrite user V2 production files.
2. Record fixed V2 match vectors: same glyph/font pair + stage + actions + seed => full event/position snapshots, ordered hits, HP-less Classic winner. Implement independent ClassicV2BattleAdapter; add parity tests. Keep R5 experimental simulator available for side-by-side A/B only.
3. Bundle **licensed canonical outline assets** in a separate asset pipeline (do not distribute local/system font files); compare source outline, preview, collider and level stats using golden geometry fixtures. Establish signature/version and cross-browser tests.
4. Design a production rigid-body/contact solution, choose whether to retain V2 Bullet/Ammo or move to a tested engine; exact rotating glyph collider and CCD need verified performance on mobile and determinism story. No server verification until cross-platform fixed-vector consistency is achieved.
5. Tune 01-01..04 on production physics across a broad glyph/font matrix. Expand 02-01 only after QA. Teach shape-speed-power-HP relationships with actual data; avoid misleading labels.
6. Add a local-only signed-out save account migration design, with an actual cloud store later (Worker + D1 if production ownership is confirmed). Revisioned updates, conflict UI, outbox, offline; authentication comes before any server mutation. Build verified replay endpoint before leaderboards.
7. Multiplayer ranked only after server-owned rules, anti-cheat, rematch/cancellation, disconnection, recovery and latency QA.

## Exact test commands

```sh
node --test tests/r3-engine.test.mjs tests/r4-shape.test.mjs tests/r5-engine.test.mjs
python3 static_check.py
python3 tests/browser_r5_inline.py
python3 tests/r5_balance_audit.py
python3 tests/r5_result_capture.py
```

**Never say R5 finished V2 migration.** Its value is real, cumulative code for improved experimental local collision and a verified interactive first chapter without faking missing source equivalence.
