# Moji Blade V3 — R3 handoff / next code migration

## 1. Delivery status

R3 establishes the first *playable local* reference ruleset. It is NOT a migration of original V2 physical geometry and must not be used as a trusted multiplayer/ranking ruleset. R2 UI and modes remain in the cumulative source package.

**Complete**
- R2 flow integrated with working Stage 01-01 launch.
- Browser-font raster measurements for speed, power, balance and HP (not V2's original glyph metrics).
- No-DOM fixed-step 60Hz reference simulation using discs, impact impulse, HP damage, Spin drain, ring-out, no-contact draw and timeout.
- Launch drag/release/cancel, fine aim controls, keyboard support, responsive battle HUD, result/stars.
- Separate versioned local save; safe failure / no V2 key writes.
- Four UI locale strings for the battle flow.
- Automated engine and inlined browser checks.

**Not complete**
- Actual V2 mesh/collision shape, canonical font hash, original power/speed formulas, damage balance for all Unicode, real GPU 3D battle renderer.
- Levels 01-02 through 03-04; actual story unlock dependencies and validated rewards.
- Cloud save, authentication, server-side leaderboard verification, PvP, real video replays / export.
- Production-origin WebGL/Safari/mobile performance testing, persistent reload-on-device testing, WCAG audit.

## 2. Immutable R3 version labels

- simulation: `r3-reference-disc-0.2`
- rules: `arena-hp-r3-local-0.2`
- raster-derived stats: `r3-local-raster-0.1`
- save schema: 1, key `moji-blade.v3.r3.local-save.v1`

These reference values must not be uploaded to old V2 rankings.

## 3. Actual V2→V3 migration priority (R4)

1. Obtain the actual **latest** full deployed V2 package, including `glyph.js`, font assets, `physics.js`, `config.js`, `render.js`, `stages.js` and dependent physics assets. The previously supplied ~1,070-line entry script alone cannot reproduce the original collision model.
2. Freeze current V2 fixed test vectors: glyph + font + arena + pull angle/power + spin direction + seed. Record collision events, state hashes, frame traces and winners.
3. Create versioned canonical `GlyphGeometry` from bundled outline, shared by `preview` and `collider`; compute area, COM, inertia, silhouette and checksum from the identical outline.
4. Implement `V2BattleAdapter` against `engine/battle-port.mjs` to preserve Classic V2 behavior first, without HP changes. Compare V2 traces before shipping.
5. Add HP and deterministic damage under new ruleset `arena-hp-v3` without modifying archived Classic V2 results. Define collision cooldown, critical rules, ring-out, double KO and timeout, then balance-test each glyph/font and arena using reproducible inputs.
6. Move battle renderer from circular Canvas2D placeholder to a production 3D renderer sharing glyph geometry. Keep the temporary renderer only as an explicit low-quality fallback.
7. Implement real 01-02→01-04 difficulty tests, prerequisites and star computations; only then expand chapters 2 and 3.
8. Design Cloudflare Worker + D1 player profile/sync schema and authoritative replay-verification endpoint; verify identity and merging policies before enabling public leaderboards.
9. PvP after cross-runtime determinism, replay verification, disconnect handling, version-gated matchmaking and anti-cheat review.

## 4. Cloud-save proposed contract (NOT connected)

`POST /api/v3/save/sync` with `playerId`, `saveSchema`, `revision`, `lastMutationId`, changed progress/skin collection and latest local device mutation log. Server responds with authoritative revision, accepted changes or conflict records. Idempotent writes, ownership authentication and mutation-log de-duplication mandatory. Story stage progress can merge highest stars and lowest best time; ongoing Scout runs require explicit conflict choice. Never silently overwrite newer saves.

## 5. Ranking proposed contract (NOT connected)

`POST /api/v3/runs/submit` requires version tuple (physics, geometry, stats, rules, arena, protocol), seed, canonical glyph font IDs and hashes, quantized actions, claimed state/result hash and replay log; Worker queue reruns simulation, validates source and score before placing verified runs on category-specific leaderboards. Local R3 reference data cannot be submitted. Re-runs must not trust user-provided computed HP.

## 6. Acceptance criteria for R4

- One source of truth for visual glyph mesh and physical collider.
- 100% legacy Classic V2 baseline tests or documented intended changes.
- V3 HP damage and victory proofs from replayable event logs.
- Identical simulation result hashes on supported browser/server runtimes.
- 01-01 fully functioning on desktop/mobile/Safari with sensible low-end fallback.
- 01-02 battle/content unlocked only once its gameplay and tests are complete.
- Save load, refresh, rollback and storage-conflict tests on HTTPS deployed origin.

## 7. How to start the next chat

Upload the **latest R3 full cumulative ZIP**, plus the latest original V2 whole source/asset pack; request `R4 — Canonical Glyph/Physics Adapter`, not another cosmetic homepage redesign. Do not discard R2 and R3, and do not claim the reference disc solver is the original physical engine.
