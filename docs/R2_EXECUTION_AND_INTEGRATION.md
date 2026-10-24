# Moji Blade V3 — R2 Production UI Integration Handoff

## 0. Version and scope

R2 uses the exact HOME V1 HTML/CSS/JS as its starting point. We preserve the HOME layout and add production-shaped navigation for MODE → STAGE → GLYPH → PREPARE → BATTLE HANDOFF. This does not modify the live V2 website.

This package does **not** contain production glyph.js, render.js, fonts, stage physics, or a V3 HP ruleset. Thus R2 is **not** integrated with the verified physics collider, cloud saves, matchmaking, or rankings. The battle button emits a bridge contract and shows a transparent handoff screen when no engine is registered. The provided external V2 link opens the existing playable game, but **does not carry over the R2-selected glyph** across origins.

## 1. Work completed in R2

| Function | Implementation | Honest state |
|---|---|---|
| HOME V1 continuity | reused original layout and 4-language controls | working prototype |
| Home 3D preview | `preview3d.js` triangulates a rendered font mask into a WebGL extruded mesh with depth and visible side faces | real 3D preview, NOT production outline / collision geometry |
| Interactive preview | pointer drag y-axis view, glyph switch, font switch | working by design; manual browser QA outstanding |
| 12-stage concept | three 4-level chapter sections, selection, rival, arena and objective labels | **design-only** level data |
| Glyph atelier | editable glyph, 4 font style choices, mesh preview, stats card | stats are **sample values**; unknown chars display `—` |
| Preparation | chosen glyph, level, rival, arena, sample stats | UI-only; no battle initialization |
| Start battle handoff | CustomEvent `moji:v3-battle-request` + optional `window.MojiBladeV3Bridge.launchStage` | production bridge interface, not a running engine |
| V2 local settings | read only `tsukuruum.moji-blade.v2` for `character` if on same origin | **no migration of gameplay progress** |
| R2 local UI settings | separate key `moji-blade.v3.r2.preview`, stores only char + font | local mock selection only |
| Cloud/rank/multiplayer | old HOME design panels with disabled / coming-soon state | not connected |

## 2. Dependency tree

```
index.html
  ├── styles.css (HOME V1)
  ├── flow.css (R2 design layer)
  ├── app.js (HOME V1 handlers, now route into R2 via event)
  └── r2-flow.js (navigation/state)
       └── preview3d.js (dependency-free glyph voxel-extrusion WebGL)
```

No CDN runtime or foreign fonts are loaded. Host system fonts change the **visual** preview, which is why this renderer must never be used as a physics collider.

## 3. Route/state contract

```
HOME
 ├── Main CTA -> STAGES
 ├── Modes -> MODES
 │       ├── story -> STAGES
 │       └── quick, streak, scout -> GLYPH
 ├── STAGES -> GLYPH -> PREPARE -> HANDOFF
 └── V2-style collection/settings/ranking/profile informational panels
```

Route object:

```ts
interface R2Selection {
  mode:'story'|'quick'|'streak'|'scout';
  levelId:string|null;
  player:{char:string;fontId:'gothic'|'mincho'|'pop'|'gyosho'};
  ruleset:'arena-hp-v3';
  rulesetVersion:null;
  physicsVersion:null;
  source:'R2-prototype';
  verified:false;
}
```

Only the production host can convert this **display/navigation request** into an authoritative `BattleSetup` after obtaining ruleset version, level seed, glyph outline and calibrated stats.

### Integration A — Production glyph geometry

1. Copy R2 into the same origin and path of the production game or configure supported cross-origin assets with explicit CORS.
2. Create a `HomeShowcaseRenderer` wrapper around production `GlyphLibrary.get(char, regulation)` and its physics-independent mesh builder. This code is currently **not** supplied.
3. Reuse geometry cache and materials with the battle scene; DO NOT advance `Battle` on HOME.
4. Swap `GlyphPreview3D` calls in `r2-flow.js` for the production showcase renderer.
5. Compute three display attributes from versioned glyph features, not random or stored example values. New `HP` must be calculated by your V3 ruleset and load-tested.
6. Test fallback when no font outline or WebGL context is available.

### Integration B — V2 preferences, campaign and cloud

- Read existing `tsukuruum.moji-blade.v2` preferences using an explicit, audited schema. Do not write to this key until a migration is tested and reversible.
- A V2 selected **stage** is an arena, not a V3 story level. Never map it silently to chapter progress.
- Initialize V3 campaign progress with an empty guest save, not fabricated `Chapter 2 / 12 stars` values.
- Add a schema `SaveSlot` with `revision`, `lastMutationId`, cloud conflict policy, guest account linking, and idempotent mutations.
- Visual `sync-status` is **R2 LOCAL DEMO** until a real cloud response proves sync.

### Integration C — Stage → Battle

Production implementation must load these dependencies prior to actual execution:

```
V3 StageDefinition (with version)
+ GlyphRef (outline hash + font version)
+ GlyphStats (calibrated; HP new in V3)
+ ArenaDefinition (stage geometry and modifiers)
+ BattleRuleset (arena-hp-v3)
+ Combatant AI + deterministic random seed
    -> BattleSetup
    -> Simulation.create / stepFixed
    -> BattleResult + trace hash
```

A runnable contract example exists in `integration/v3-bridge.example.js`; it deliberately returns not-implemented.

### Integration D — Future multiplayer and ranked

Never put demo level ID, local browser-rendered glyph mesh, sample stat values, or unverified client battle results on a public leaderboard. Complete fixed-step, deterministic physics validation and authoritative server replay before PvP.

## 4. R2 QA matrix

| Check | Target | Result |
|---|---|---|
| JS syntax | `node --check *.js` | checked |
| Markup IDs and route wiring | structural script | checked |
| Source package | ZIP exists and passes CRC | checked |
| Chromium DOM/CSS UI with bundled inline scripts | 320, 390, 768, 1024, 1440 | **PASS**: navigation, input, backward navigation, no horizontal overflow, 0 JS exceptions |
| Standalone HTML ESM over HTTP / Safari real device | native module request and mobile touch | **NOT verified**: browser URL navigation blocked by runtime policy |
| Canvas WebGL rendering | GPU shader rendering and context-loss recovery | **NOT verified**: Chromium instance has WebGL disabled; static fallback verified |
| Font/render equivalence with V2 | same outline under each font | **NOT possible** without production assets |
| Local migration | V2 settings + actual campaign | preferences only; no campaign migration |
| Cloud save | real data | not connected |
| Gameplay | HP damage / battle | not connected |

## 5. Exact next engineering work

1. Obtain the complete V2 repository/assets (especially glyph, physics, view, stage and fonts), freeze its SHA/revision.
2. Implement production `GlyphMeshAdapter` so one verified mesh can be shown in HOME, atelier, battle and collection. Preserve the V2 collision code until baseline tests pass.
3. Build `GlyphStatsSelector` with V2 speed/power/balance and newly calibrated V3 HP in the same versioned domain schema.
4. Create the real Stage 01-01 with actual objective, enemy/arena setup, fixed-tick battle, telemetry and results.
5. Connect the UI's `moji:v3-battle-request` to battle state machine (no fake local result).
6. Add IndexedDB guest campaign progress, cloud sync and server-validated ranking incrementally.
7. Run end-to-end browser and device QA with screenshots and gameplay proof. Do NOT claim production readiness without it.
