# R4 Handoff — V2 Physics Boundary and R5

## Completed in R4

1. Whole R3 cumulative tree retained, not an incremental-only patch.
2. Browser-generated glyph masks centralized and consumed by WebGL extruded mesh preview, Canvas2D silhouette fighter sprites and local shape contact solver.
3. Local mask fingerprints, bounds, contact tests including holes/concavity and deterministic fixture-based simulation added.
4. Stage 01-01 is still playable with HP, Spin, launch options, results and R4-isolated guest save.
5. Four browser widths pass inlined-asset smoke testing; no fatal JS exceptions.

## Precise outstanding issues

- V2 equivalence: **not achieved**, missing original source/assets/traces; don't use V2 production name for the new shape engine.
- Current R4 physics: approximate 2D mask overlap and center-line contact normal, with R3-style HP math, not accurate arbitrary-shape rigid-body response. Need real contact points/normals, torque, angular inertia and swept collision to remove tunneling.
- Font identity: browser rendering differs; requires packaged, licensed, versioned font outline assets plus validation of raster/mesh/collider and topology.
- Cross-platform determinism: tests show repeatable execution in one runtime, not verified replay across browsers/server.
- Online: no cloud sync, login, anti-cheat, leaderboards, ranked matches or live PvP.
- Content: only Stage 01-01 playable; chapters 2–3 are not playable yet.

## Proposed R5 implementation order

1. Obtain latest original source/asset package and audit manifest; do not overwrite R4 tree.
2. Run **Classic V2** side-by-side for fixed vectors and capture snapshots/events/hashes; write comparison tests.
3. Extract packaged font curves as deterministic geometry; replace browser-generated mask with canonical glyph asset loader.
4. Implement V2BattleAdapter against battle-port contract, verify exact unmodified classic behavior.
5. Add HP mode atop validated simulation, with separate V3 ruleset and explicit critical/damage standards.
6. Tune stage 01-01 with actual physics; unlock 01-02 only after tested enemy/conditions; then ship stages 01-03/04.
7. Define Cloudflare Worker/D1 ownership, revisioned cloud save, authenticated verified runs; do not accept client-computed HP or stats for ranking.
8. PvP after end-to-end deterministic checks and server-owned match state.

## Testing scope

- `node --test tests/r3-engine.test.mjs tests/r4-shape.test.mjs`: deterministic synthetic fixtures and local save behavior.
- `python static_check.py`: JS syntax/static DOM contracts.
- `python tests/browser_r4_inline.py`: page path/interaction on 320,390,768,1440 widths under restricted chromium; does not mean real HTTPS ES modules or GPU 3D is validated.

## Source-provenance note

Original public version noted during R4 work: Moji Blade V2.4.2 released 2026-10-23, with match-video sharing improvements. Previous uploaded main script was older; future integration must use the *newest actual original* code to retain video sharing, skins, Scout and latest bug fixes.
