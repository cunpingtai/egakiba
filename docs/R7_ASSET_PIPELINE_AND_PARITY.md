# R7 — Authoritative Asset Preparation (Not Yet Authoritative)

## 1. Problem solved in code

The R5/R6 prototype uses the current operating system's rendered glyph bitmaps. This is useful for rapid game prototyping but not reproducible before capture across font installations and devices. R6 could freeze a particular bitmap for replay. R7 adds an installable, content-addressed *candidate* glyph pack consumed through a shared resolver in three places: 3D extruded preview, character stat display and active silhouette contact solver. This removes a major source of accidental disagreement when an authorized pack is provided. No such actual production pack ships here.

## 2. External input contract

`build_glyph_pack.mjs` accepts a JSON file prepared from an outline or mask exporter that you have rights to redistribute. For example (synthetic square mask shown as pseudocode to avoid giant arrays):

```json
{
  "release": "release-2026-10",
  "license": {
    "name": "Example rights declaration",
    "publisher": "Your organization",
    "evidence": "Internal rights review or license document reference",
    "redistributionConfirmed": true
  },
  "assets": [{
    "glyph": "文",
    "font": "gothic",
    "size": 40,
    "mask": [0, 0, 1]
  }]
}
```

The `mask` must actually contain **size × size** binary values, not this abbreviated example. The CLI generates bit-packed `maskBits` snapshots, checksums for each snapshot, and a manifest checksum. Runtime verifies the SHA-256 digest and a SHA-256 pinned outside the pack. It rejects invalid sizes, duplicated glyph/font combinations, wrong source identity, corrupted bits, different release contents, oversized packs and incompatible schema.

**Integrity is not authenticity:** the publisher and permission fields are self-declared, not independently checked. Pack SHA-256 and its pin are not digital signatures. A malicious attacker can produce a new, internally consistent pack and client if neither server nor client distribution is trusted. Ranked still needs server-owned assets and server re-simulation.

## 3. Integration

All three components now consume `getGlyphGeometry(glyph,font)`:

- `preview3d.js`: extrudes the chosen silhouette into a preview mesh.
- `r2-flow.js`: derives `speed`, `power`, `maxHp`, `balance` from the same geometry.
- `r5-battle.mjs`: uses that geometry for active local collision and local replay capture.

The resolver loads an optional, **same-origin**, independently pinned package (the HTML `data-glyph-pack-url` and `data-glyph-pack-sha256` attributes). Missing or invalid packs never become official or ranked. With no pack configured the existing local browser glyph pipeline still works. If a configured pack fails validation the fallback is used and a console warning is emitted; deployment automation should treat such failure as a release blocker for official competitive services.

## 4. Physics parity contract

`engine/physics-parity-v7.mjs` contains:

- `ENGINE_CONTRACTS['experimental-hp-r5']` for the existing experimental prototype.
- `ENGINE_CONTRACTS['classic-v2']`, **unavailable** until legitimate V2 source/reference traces are obtained.
- `compareBattleTrace` to compare versioned summary states and report precise field differences.
- `runParityCases` to execute the same input with a supplied external simulation adapter.

What it does **not** contain: V2 physics implementation, 3D CCD, center of mass/inertia equivalence, reliable cross-device deterministic behavior, original V2 ranked rules, or original font outlines. Tests for this harness use synthetic reference outputs only and must not be read as 3D parity evidence.

## 5. Ranking and future multiplayer blockers

`engine/competitive-gate-v7.mjs` always returns `eligible:false` and `assertCanSubmitRankedResult()` throws. Server-side ranking architecture must be added separately, with authenticated identity, immutable approved packs, server-held random seeds, rules/physics version and independent simulation. A client-provided replay digest can be recomputed by an attacker and cannot serve as proof of a legitimate score.

## 6. Required to move to true production core

1. Authorized V2 source: `physics.js`, `glyph.js`, `render.js`, `config.js`, fonts/outlines and complete runtime dependencies.
2. 20+ glyph×font reference trajectories using multiple launch angles/powers/spin directions, each stage and relevant collision extremes.
3. Frozen approved release pack with evidence of redistribution rights, independent manifest pin and expected preview/collider geometry hashes.
4. V2 adapter implementing the shared test interface, independent replay/provenance checks, CI gating, and mobile performance profile.
5. Only after parity: production HP-v3 balancing, cloud identity/save, server rankings, realtime PvP.
