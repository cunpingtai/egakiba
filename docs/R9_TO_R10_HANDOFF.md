# Moji Blade V3 — R9 to R10 Handoff

## Snapshot

R9 is a full cumulative local web game. V3 homepage and Chapter 1 four stages are connected to **real original Rapier 3D rigid-body physics with independent V3 HP damage**, plus native no-HP Classic mode. Real GPU runtime has not been certified. Stage 02–03 remain 8 non-playable planning cards.

## Production next: R10 — Browser & Gameplay Hardening

1. Run an actual production-style HTTP/GPU pass on Chrome/Safari/Android, using legally licensed fonts, with separate low-performance and motion-reduced testing; fix any errors.
2. Collect 100+ seeded input samples per level/glyph archetype across four fonts. Freeze a balance dataset (wins, damage, native losses, HP KOs, durations). Change damage constants only via a new rule version.
3. Replace local browser font-dependent preview geometry with the same canonical original glyph data (currently R9 story combat uses the original library, but home preview may still use browser-generated local glyph masks).
4. Add native replay viewer, not just R9 JSON export / Node verifier. Keep old experimental replay player inactive on the new ruleset.
5. Improve HUD feedback: damage numbers, impact strength, critical timing, explanation of native stop vs HP KO.
6. Publish `R9_BUILD_MANIFEST` with pinned physics, dependency and glyph-asset hashes.

## Later: R11 Cloud Saves / R12 Server-Verified Rankings / PvP after authoritative verification

- Guest-first with IndexedDB, migration to account-bound cloud save and explicit merge conflicts.
- Worker/D1 storage, signed identities and strict per-user ownership; ranking requires server simulation with trusted font, ruleset and action inputs.
- Do not infer security from local SHA hashes; local JSON is trivially forgeable.
- Future PvP needs action deadlines, reconnects, deterministic server simulation and clear ranked season policy.

## Required inputs for R10

- **Use `moji-blade-v3-r9-native-hp-cumulative.zip`**, not older R5–R8 packages.
- Keep `source.zip` locally for the original four fonts; R9 ZIP deliberately does not embed the font binaries.
- Run `npm test` with `MOJI_V2_FONT_PATH` set; follow `docs/R9_NATIVE_HP_INTEGRATION.md`.
