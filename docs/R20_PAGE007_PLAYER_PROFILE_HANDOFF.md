# R20 · Page #007 / Feature #007 · Local Player Battle Profile

Date: 2026-10-24. **Baseline:** R19 Git `6b65ecd`. Cumulative repo history: R13 → R14 → R15 → R16 → R17 → R18 → R19 → R20. All development remains in the same source tree. No prior battle engine, ranking, locale, or story progress keys changed.

## Scope and functionality

- Adds a working **Player Record** page as a client-side flow screen (`#profile` on standalone `r9-index.html` and React/TanStack root). Click the existing avatar/account button, the new desktop top nav entry, or the mode-section record entry to open it. From the page, **Continue Story** opens current live stage selector; **Home** returns to home.
- Reads the validated R10 native Arcade save for authoritative *lifetime story battle count*, Chapter 1 cleared stages, stars, and best times. No new authority, replay validation, unlock logic or changes to R10 record contracts.
- Reads the capped existing R19 `moji-blade.r19.story-result-history.v1` journal for **only the last 30 saved Story matches**, recent win rate (W/(W+L+D)), wins/losses/draws, most-used glyphs and match list.
- Filters match list by four existing playable Chapter 1 stage ids and win/loss/draw without overwriting the underlying journal. Support locale `ja` / `zh` / `en` / `ko` and no-results, filtered-empty and inaccessible-storage states.
- Dedicated page: actual stage personal bests, four statistics, glyph frequency, saved matches, actions, and explanation of statistics' different sources. No social profiles, online leaderboard, account sync, fake Classic history, or invented old records.
- HTML escaper used for user-entered glyph data; local journal is an untrusted client-side input, not an authenticated score certificate.

### Data semantics

| Metric | Source | Truth limit |
|---|---|---|
| Lifetime story battles | R10 `moji-blade.v3.r10.rapier-arcade.local.v1` | Only successfully persisted R10 results; no Classic matches |
| Cleared stages, stars, fastest time | Validated R10 save + R14 campaign projection | Four actually playable Chapter 1 stages only |
| Recent win rate and most-used glyphs | R19 bounded Story result journal | Last 30 saved entries only; old runs cannot be recovered |
| Recent match list | R19 bounded Story result journal | Not authoritative or server verified |

When localStorage is unavailable, **do not show an inferred lifetime count** (use `—`), show warning and preserve empty-state behavior. A journal can exist without the authoritative R10 save; no progression should be inferred from a journal entry.

### Changed/new files

- `engine/r20-player-profile.mjs`: read-only projections, locale strings, filtering and HTML renderer.
- `r2-flow.js`: profile screen, URL `#profile` support, filter events, actions, campaign-independent page navigation.
- `app.js`: account/avatar and new player-record button open real page rather than stub overlay; four-locale nav text.
- `r9-index.html`, `src/routes/index.tsx`, `src/styles.css`: same new nav entry in both frontends + CSS loading.
- `r20-profile.css`: visual design, 320/390/800/1440px responsive layout, focus states, reduced-motion respect.
- `tests/r20-player-profile.test.mjs`: data-denominator, filters, legacy/empty, inaccessible/corrupt storage, glyph popularity, HTML escaping, UI wiring tests.
- `scripts/r20-profile-fixture.mjs`, `scripts/r20-profile-visual-check.py`, `assets/r20-*`, `docs/R20_PROFILE_VISUAL_RESULTS.json`: test-data-only screenshot fixtures and dimensions.
- `package.json`: `test:r20`, `fixture:r20` scripts; README release note.

### Validation

- `node --test tests/*.test.mjs`: **70 passed, 3 skipped (original licensed font asset unavailable), 0 failed, total 73**.
- `python3 static_check.py`: passed.
- `npm run fixture:r20 && python3 scripts/r20-profile-visual-check.py`: 320, 390, 800, 1440px + empty-case; no horizontal overflow, filter controls visible, four KPI cards rendered.
- Tests are functional module tests and **static local HTML screenshots generated from the real R20 profile renderer**. A real HTTP-hosted page check was attempted, but the sandbox browser returned `ERR_BLOCKED_BY_ADMINISTRATOR` on loopback. **Do not call this real client navigation, live WebGL or physical device acceptance**.

### Local acceptance required before production

1. Make original separately licensed glyph fonts available in the authorized local development environment. Never package font binaries.
2. Serve this repo locally with `python3 -m http.server 8000` and open `/r9-index.html` (or use `npm run dev` for the React shell).
3. Click avatar / player record; verify both language selection and Story actions; refresh `#profile` URL and switch between four locales.
4. Play and complete a genuine R10 battle; verify R19 new journal entry and the R20 recent-list counts update on page reentry.
5. Compare R10 battle count, per-stage stars and time with the existing stage selector; verify that R19 journal data never grants stage unlocks.
6. Check a browser without localStorage and a browser with old R10 saves but zero R19 history.
7. Check real 3D/physical-input behavior on mobile browsers and original fonts separately; this release does **not** modify the physics engine.

### Next focus

R21 Page #008: real glyph encyclopedia / saved glyph collection page, progressively enhanced from native geometric data without generating large empty SEO pages or assuming unlicensed fonts are available.
