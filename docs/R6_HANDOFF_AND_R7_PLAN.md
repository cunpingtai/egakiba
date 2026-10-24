# Moji Blade V3 — R6 Technical Handoff → R7

Date: 2026-10-23. Cumulative code base: R5 complete folder copied, then extended. Active physics/rules remain R5 experimental silhouette collision; R6 changes the portable input/recording and battle UX, not the original V2 production solver.

## Implemented in R6

- `engine/glyph-snapshot-v6.mjs` converts a 16–256px binary glyph mask to tightly packed bit-base64 plus size/glyph/font/source/version/fingerprint and restores it with checksum validation. Mask holes/concavity remain intact, and restored masks have the same R5 physics features and geometry IDs.
- This snapshot is **locally captured and NOT canonically licensed/authenticated**. It freezes the output of one device's rasterization and makes it portable; it does not make the source glyph rendering consistent across all devices before capture. No font files bundled.
- `engine/replay-v6.mjs` records self-contained two-glyph battle input, action vectors, stage, version tuple, event transcript, deterministic frames, result and a noncryptographic diagnostic digest. It independently recomputes outcomes using the same R5 simulator, then compares the transcript/digest. It rejects malformed/edited input and incompatible version tuples.
- `r5-battle.mjs` retains the original R5 entrypoint and storage key (no physics/save schema changes). Added actual battle summary derived from damage and collision events, pauseable replay viewer with timeline scrub/back-to-results, and user-initiated JSON export with a local consistency check.
- Fixed result card clipping on 320/390px by presenting it as a viewport dialog/overlay rather than clipping its final action row to the arena height.
- `scripts/verify_replay.mjs` verifies an exported local JSON independently under Node 22; no server or credentials needed.

## Validation

```
node --test tests/r3-engine.test.mjs tests/r4-shape.test.mjs tests/r5-engine.test.mjs tests/r6-replay.test.mjs
python3 static_check.py
python3 tests/browser_r6_inline.py
python3 tests/browser_r6_replay.py
```

- R6 geometry snapshots preserve bit-identical masks/hole behavior, reject invalid sizes, invalid base64, mismatched geometry IDs.
- R6 matching re-simulation from original result matches; editing a replay frame or mask fails local verification.
- Browser UI smoke tested at 320/390/768/1440px for launch and stage selection, plus complete match review/replay/seek/back/export at 320/390/1440px.
- Exported replay JSON independently re-simulated in Node, without installed browser font dependency, across the same captured snapshots.
- Browser testing uses inline modules due to test environment network restrictions. It does **not** prove real HTTP module loading, Safari, GPU/WebGL, mobile performance or original V2 physics compatibility.

## No-fake claims

The 32-bit diagnostic digest plus 2D simulator replay is not a signature or proof of an honest player. Entire capsules can be fabricated and recalculated by the client. Do not upload or use them as server-authoritative leaderboard results. A legitimate rank path requires signed/authenticated account identity, server-owned canonical assets and rule versions, trusted initial conditions, server replay or authoritative validation, and fraud protection.

R6 physics is not V2 production; 3D angular momentum, CCD, accurate collision resolution, Bullet/Ammo parity, and server determinism are outstanding. The four R5 first-chapter stages remain experimental.

## Priority for R7

1. Acquire the current, authorized V2 repository/source assets (`physics.js`, `glyph.js`, `render.js`, outlines/fonts, complete dependencies). Run `scripts/v2_source_audit.py`. Obtain reference traces for at least 20 glyph×font pairs, multiple launch actions, and all active arenas.
2. Build `ClassicV2BattleAdapter` and a strict V2 vs V3 parity test harness. Never replace working public V2 physics until reference tests and mobile performance pass.
3. Produce canonical, versioned and appropriately licensed outline assets independently of local system fonts. Publish immutable asset hashes and use one geometry source for preview, stats and collider; do not use local capture for competitive game modes.
4. Migrate with explicit `classic-v2` vs `hp-v3` rulesets; do not mix historic score tables. Verify first four stage outcomes on actual final physics across hundreds of glyph/action cases.
5. Establish a guest/local save migration protocol, then implement real authenticated cloud storage and conflict reconciliation. Preserve on-device progress on failures. Build server ranking validation after authoritative physics and asset alignment.
6. Maintain story UI experience; add Chapter 2 only after mechanical reference QA. Remote multiplayer comes after server truth, rollback/reconnect design and anti-cheat.
