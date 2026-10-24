# Moji Blade V3 — R7 handoff, next R8

Date: 2026-10-23. Branch from R6 cumulative copy. R7 does **not** change the active R5 experimental physics algorithm or local save key. `01-01`–`01-04` remain playable; the other 8 planned stages remain preview-only.

## R7 delivered

1. Deterministic candidate glyph-pack builder and verifier (SHA-256, license declaration, strict mask validation, release manifest, same-origin URL with pin in the client).
2. Shared geometry resolver for 3D preview, visible stats and local collider; local-font fallback with explicit provenance.
3. Stable physics adapter interface and baseline comparison reporter; intentionally absent original V2 implementation.
4. Fail-closed ranked gate, tested against client-supplied approval-looking flags.
5. Browser regression and replay check; Chapter 1 selection and input remain wired. Generated screenshots retained under `assets/r7-*`.

## Tests executed

```
node --test tests/r3-engine.test.mjs tests/r4-shape.test.mjs tests/r5-engine.test.mjs tests/r6-replay.test.mjs tests/r7-assets-and-parity.test.mjs
python3 static_check.py
python3 tests/browser_r7_inline.py
python3 tests/browser_r7_replay.py
```

Passes: 5 Node test files, static audit, Chromium inline UI at widths 320/390/768/1440, replay at widths 320/390/1440 with exported JSON independently checked by Node. These are regression/smoke tests and **not** certified player-device QA. Actual HTTP module browser test was attempted but blocked by Chromium environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); neither WebGL GPU nor real-world hosting tested.

## Known incomplete

- Current V2 physics, glyph asset, renderer and original font sources unavailable and therefore not migrated.
- Official 3D colliders, physical parity, authorized production assets and live backend not implemented.
- R7 pack builder tests use synthetic rectangles/rings only; there is no real licensed font asset inside this ZIP.
- License metadata is self-declared; only evidence review and authorized input can ensure rights.
- Current exported local replay, even with an asset hash, is NOT a security token for ranking.
- Cloud save, rankings, authentication, real multiplayer and Chapter 2 still not implemented.

## R8 production order

P0: Obtain latest authorized V2 repository + font/mesh assets, license evidence and V2 reference battle traces. Run `scripts/v2_source_audit.py` and record hashes and physics version; do not silently fetch or ship copyrighted resources.

P1: Build real `ClassicV2BattleAdapter`, implement full 3D per-step trace comparison, test 20 glyph/font configurations × launch vectors with repeatability and mobile profiling. Mark divergences and preserve V2 classic as a separate ruleset.

P2: Create an audited canonical release from authorized fonts/outlines and compare visual mesh, measurements and colliders. Freeze approved release hashes independently of browser sources.

P3: Migrate the four Chapter 1 experimental stages to production HP V3 with calibrated stats and regression-backed objectives. Keep previous R5 save via migration, not overwrite.

P4: Guest → authenticated cloud save with conflict handling, server result verification, ranked season schema, then PvP rooms/reconnections.
