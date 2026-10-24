# R26 — Independent SEO URLs, SSR and prerendering (cumulative R13–R26)

**Current development baseline: R26.** This release turns the main search intents into path-based, server-rendered routes with localized equivalents. It adds `/play/`, `/stages/`, `/glyphs/`, `/compare/`, `/strongest/`, and `/how-to-play/`, plus `/en/`, `/zh/`, `/ko/` and their localized intent pages. SEO routes render real copy during SSR, use unique title/description/Open Graph metadata, self-canonical URLs, `hreflang` alternates and `WebPage` JSON-LD. The root now renders its full home content during SSR instead of sending only a client-side placeholder. Ordinary anchors connect the homepage to every intent page. Static prerendering with link crawling is enabled; a 28-URL sitemap and robots file are generated from the configured public base URL. See `docs/R26_CRAWLABLE_URLS_SSR_HANDOFF.md`.

- R26 route tests: **9 PASS / 0 FAIL**. Full suite after R26 additions: **126 PASS / 3 licensed-font SKIP / 0 FAIL**.
- `npm run check:r9`, `npm run check:r25`, `npm run audit:r25`, and JS/MJS syntax checks pass. The exact Japanese `文字ブレード` density remains above 3% under the R25 `Intl.Segmenter('ja')` metric.
- Production build/prerender could not be executed in this runtime because Vite is not installed (`vite: not found`) and pnpm installation was blocked by registry DNS (`EAI_AGAIN`). Therefore generated prerender HTML and live direct HTTP route responses still require deployment/local verification. Licensed-font/WebGL/device gameplay also remains unverified here.

---

# R25 — Sitewide Content Cleanup & SEO Audit (historical version; cumulative R13–R25)

R25 cleaned user-facing copy and navigation based on four Google Trends CSV exports, localized client-view metadata, and measured the Japanese homepage's exact `文字ブレード` density at **3.13% static / 3.15% localized** under the documented `Intl.Segmenter('ja')` token metric. It removed unfinished online leaderboard/account/local-2P entries, disabled Streak/Scout cards, planned Chapter 2/3 tabs, fake handoff pages and development-only UI. R26 supersedes R25 by adding independent crawlable URLs and SSR/prerender configuration. See `docs/R25_SITEWIDE_CONTENT_SEO_AUDIT.md`.

- Historical R25 suite: `npm run test:r25` (**117 PASS / 3 licensed-font SKIP / 0 FAIL** before R26 tests were added); `npm run check:r9`; `npm run check:r25`; `npm run audit:r25`.
- Browser smoke was blocked in that runtime; production build was not claimed as passing. No original authorized font files are included, so native WebGL/device battle acceptance remains local-only.

---

# R24 — Strongest Glyph Research (historical version; cumulative R13–R24)

**Historical R24 baseline.** Page #011 / Feature #011 adds a local, font-specific attribute research page reachable from the home footer, modes, collection, detail and lab. It ranks only the existing curated set of 34 candidate glyphs for one selected original font by Speed, Power, Balance or Story HP reference; supports category/search and ascending/descending order; ties use competition ranks. Only finite metrics verified by the native V2 GlyphLibrary are ranked. Unsupported outlines and missing fonts never receive guessed values. This is not a global Unicode strongest list, empirical battle win rate, or online player leaderboard. R25 later removes the unfinished online player-leaderboard entry from user-facing navigation; the local attribute research remains separate. See `docs/R24_PAGE011_GLYPH_RANKING_HANDOFF.md`.

- Tests: `npm run test:r24` (94 PASS); `node --test tests/*.test.mjs` (113 PASS / 3 licensed-font SKIP / 0 FAIL); `python3 static_check.py` PASS.
- UI fixtures: `npm run fixture:r24 && python3 scripts/r24-ranking-visual-check.py` (320 / 390 / 800 / 1440px, zero overflow; fixture values are deliberately mocked for layout only).
- Build limitation: `npm run build` could not run because Vite is not installed in the current runtime. Local HTTP browser navigation is blocked here; live native-font ranking and WebGL gameplay remain for local acceptance with the authorized original font pack.

---

# R23 — Two-Glyph Native Comparison Lab (cumulative R13–R23)

**Current development baseline: R23.** Page #010 / Feature #010 builds a standalone verified A/B glyph lab with two independent input glyphs and original typefaces (Gothic/Mincho/POP/Gyosho), real geometry-derived attributes, signed deltas and direct Classic preflight using **both actual fonts**. Accessible through Mode Center / Collection / Glyph Details and client-side `#lab/...` URLs. Unsupported glyphs or unavailable licensed-font assets fail closed; no dummy stats, win odds or online rankings. The original physics engine and saves are unchanged; complete Git history R13–R22 remains intact.

- `npm run test:r23` and `node --test tests/*.test.mjs` (100 PASS, 3 licensed-font SKIP, 0 FAIL), `python3 static_check.py`
- `npm run fixture:r23 && python3 scripts/r23-lab-visual-check.py` (320, 390, 800, 1440px zero overflow; **visual fixture numbers are fake, for layout only**)
- Full handoff including local original-font/WebGL acceptance: `docs/R23_PAGE010_GLYPH_LAB_HANDOFF.md`

---

# R22 — Glyph Details / Cross-Font Native Comparison (cumulative R13–R22)

**Current development baseline: R22.** Page #009 is a working glyph detail view opened from R21 collection or a shareable `#glyph/<encoded-glyph>/<font>` deep link. Feature #009 compares **four original font variants** with native Speed/Power/Balance/Story HP metrics. Every font is verified independently; unsupported/missing font variants show explicit states and no guesses. Selected font supports local favorite, use-in-battle, compare delta and share URL. The detail is a **client-side hash view, not an independently crawlable SSR SEO page**. No new Story unlocks, native physics modifications, cloud ranking or online social. Full handoff: `docs/R22_PAGE009_GLYPH_DETAILS_HANDOFF.md`.

- Tests: `node --test tests/*.test.mjs` (**88 PASS, 3 licensed-font SKIP, 0 FAIL**); `python3 static_check.py` PASS.
- Visual: `npm run fixture:r22` plus Chromium layout fixtures at 320/390/800/1440px (no horizontal overflow). Screenshots have **deliberately mocked stats for layout only**, never evidence of physical measurements.
- Parent Git R21: `169e156`. Previous R13–R21 commits inherited unmodified.

---

# R21 — Glyph Collection / Favorites (cumulative R13–R21)

**Current development baseline: R21.** Page #008 is the working glyph collection, and Feature #008 supports searched, categorized discoveries and font-specific favorites. A curated suggestion is not a discovered glyph; only recent R19 Story evidence and actually started R21+ battles are counted. Original-font attributes display only after native verification, and never use fake fallback stats. Four locales, `#collection`, standalone and React shell, no rankings/social/cloud. Full handoff: `docs/R21_PAGE008_GLYPH_COLLECTION_HANDOFF.md`.

- Tests: `npm run test:r21` (**58 PASS**), `node --test tests/*.test.mjs` (**77 PASS, 3 original-font SKIP, 0 FAIL**), `python3 static_check.py` PASS.
- Visual: `npm run fixture:r21` + Chromium fixture check, 320/390/800/1440px zero overflow; **renderer-only screenshots**, not live WebGL.
- R20 Git `7b87a28` preserved along with all previous version commits.

---

# R20 — Local Player Profile / Recent Story Matches (cumulative R13–R20)

**Current production development baseline: R20.** Page #007 and Feature #007: working local player record page, with authoritative R10 stage progress and lifetime Story battle count, and separate **last-30-R19-matches-only** stats (win rate, used glyphs, filterable record list). Four locales, responsive mobile UI, profile entry from account/nav, old-record empty state and storage failure notice. No online ranking, social, cloud sync, or Classic results fabricated; no physics changes. Full handoff: `docs/R20_PAGE007_PLAYER_PROFILE_HANDOFF.md`.

- Tests: `npm run test:r20`, `node --test tests/*.test.mjs` (**70 pass / 3 licensed-font skips / 0 failures**), `python3 static_check.py`.
- Screenshots: `npm run fixture:r20 && python3 scripts/r20-profile-visual-check.py` (320/390/800/1440px; **renderer-based UI-only fixture**, not live 3D/real HTTP flow).
- R20 builds directly on R19 (`6b65ecd`) with complete cumulative Git history preserved.

---

# R18 — Live Battle HUD / Stage Feedback (cumulative R2–R18)

**Current version: R18.** Page #005 is the battle view (Story HP and Classic V2); Feature #005 provides a localized battle-phase HUD, genuine Dash cooldown/availability messages, snapshot-derived low-HP warnings, phase-aware launch/pause controls and safe two-step match exit. Classic additionally receives native fixed-step pause/resume **without adding HP or changing physics**. Built directly on R17, retaining all earlier source and Git history.

- Tests: `npm run test:r18` or `node --test tests/*.test.mjs` (**55 passed, 3 original-font skips, 0 failed**); `python3 static_check.py` PASS.
- Layout: `npm run fixture:r18 && python3 scripts/r18-visual-check.py` (320 / 390 / 800 / 1440px, no overflow). **UI-only screenshots; not live WebGL footage.**
- Full handoff, real device acceptance, changes and known limitations: `docs/R18_PAGE005_BATTLE_HANDOFF.md`.

---

# R17 — Battle Prepare / Native Preflight (cumulative R2–R17)

**Current version: R17.** Page #004 battle preparation screen, Feature #004 strict two-glyph native preflight with validated font support, stage locking, mode-aware HP display, single-flight launch and recovery from failed start. **R13–R16 retained in the same Git history**; no physics, level rewards, saved progress or online ranking changes.

- Verification: `npm run test:r17` (28 pass), `node --test tests/*.test.mjs` (47 pass, 3 licensed-font skips), `python3 static_check.py` PASS.
- Layout fixtures: `npm run fixture:r17 && python3 scripts/r17-visual-check.py` (320 / 390 / 800 / 1440px, zero overflow). Layout screenshots are not real WebGL gameplay.
- Full change map and required real-browser / licensed-font checks: `docs/R17_PAGE004_PREPARE_HANDOFF.md`.

---

# R16 — Glyph Forge / Validated Native Attributes (cumulative R2–R16)

**Current version: R16.** Page #003 Glyph selection & forge; Feature #003 strict single visible glyph selection, real per-font V2 glyph support/attributes, guarded continuation and pre-launch revalidation. The new status and stats share one native measurement source, while Story HP and Classic remain separate. UI is responsive and bilingual Japanese/Chinese plus English/Korean. No fonts bundled; no live WebGL claim. **All R13–R15 source and Git commits retained.**

- **New tests:** `npm run test:r16` (20 pass). Full related/core suite: 39 passed, 3 font-dependent skipped, 0 failed. `python3 static_check.py` passed.
- **Layout fixtures:** `npm run fixture:r16 && python3 scripts/r16-visual-check.py` (320/390/800/1440px, no overflow). Fixture screenshots are **not** actual 3D gameplay screenshots.
- Full scope, environment limitations, acceptance steps and file map: `docs/R16_PAGE003_GLYPH_FORGE_HANDOFF.md`.

---

# R15 — Story Stage Select / Mission Clarity (cumulative R2–R15)

**Historical version: R15.** Page #002: Chapter 01 stage selector. Feature #002: validated stage availability and data-backed three-star mission contract. This release is **built directly on R14** and retains the complete project and Git history.

- Four actually playable Chapter 01 stages now have selectable cards, locked/cleared/next states, earned stars and validated local best times. Chapters 02 and 03 are clearly marked **Coming Soon** and disabled.
- Every stage shows the real win condition, HP-based second-star threshold and per-stage time limit. Same objectives in ja/zh/en/ko and in the existing battle mission caption. No physics or saved-game rules were changed.
- Both the static `r9-index.html` and React/Vite shell load `r15-story.css`; the single shared `r2-flow.js` renders the page.
- **Test:** `npm run test:r15`; broader tests, QA fixture commands, limitations and exact changed modules: `docs/R15_PAGE002_STORY_HANDOFF.md`. CSS fixtures run at 320, 390, 800 and 1440px. The **real Rapier WebGL / on-device gameplay was not executed** due browser restrictions and missing licensed fonts; fixture screenshots are not real in-game screenshots.

---

# R14 — Home / Chapter Resume (cumulative R2–R14)

**Historical version: R14.** Page #001: Home (`r9-index.html` and the equivalent TanStack route). Feature #001: real Chapter 01 resume and progression card driven by the existing R10 Rapier local save. The underlying Classic and Arena HP combat rules, glyph calculations, older source and tests remain untouched.

- The large home CTA now routes to the first stage for new players, the next unlocked story stage for returning players, or the chapter stage picker after all four stages have been cleared.
- Show a validated 0–4 stage progression bar, stars earned out of 12, the next stage, and an honest storage-unavailable status. No claims of Chapter 02 playability or cloud save.
- Same home UI for standalone HTML **and** TanStack React/Vite entry. Mobile home min-content overflow is fixed.
- New isolated pure data projection (`engine/r14-campaign-progress.mjs`), six unit tests and independent DOM/CSS fixture checks across four viewport sizes.

**Run:** `python3 -m http.server 8000` → `http://localhost:8000/r9-index.html` after locally installing your licensed fonts. Unit test: `node --test tests/r14-campaign-progress.test.mjs`; broader previous check: `python3 static_check.py`. See `docs/R14_PAGE001_HOME_HANDOFF.md` for acceptance/limitations. **Full WebGL gameplay could not be tested here because local browser navigation is blocked.**

---

# R13 — Mobile Gameplay / Adaptive Performance (cumulative R2–R13)

This cumulative project keeps the authentic native Rapier Classic physics, V3 HP Chapter 1 (4 stages), free Unicode glyph entry, font-based attribute comparison, local save and replay. R13 focuses on real interaction code: responsive touch HUD, Auto/High/Balanced/Battery visual quality, effect and audio limits, optional vibration, and consistent win/lose/draw/retry transitions.

**Entry:** `r9-index.html` over HTTP, with original fonts privately installed from `source.zip`. **Fonts are not distributed.** See [R13 detailed handoff](docs/R13_MOBILE_PERFORMANCE_HANDOFF.md). Core tests: **22 pass, 0 skip, 0 fail** with a local font. Inlined Chromium DOM/CSS checks cover 8 responsive sizes; native HTTP/WebGL and iOS/Android physical-device testing remain outstanding.

# R12 CORE LOOP POLISH — cumulative from R11

R12 improves actual Rapier story gameplay presentation and deliberate mobile gestures. See [R12 handoff](docs/R12_GAMEPLAY_POLISH_AND_HANDOFF.md). The R9 story entry is `r9-index.html`; launch with a local HTTP server after installing your separately provided original fonts. No fonts are shipped. Full test run with fonts: 17/17 pass. **Browser/GPU/iOS device acceptance remains unverified due to local-browser access restrictions.**

---

# Moji Blade V3 — R11 Game Feel (Cumulative R2–R11)

Latest version includes original Rapier-backed Classic VS COM and local-only Arena HP Chapter 1, freely typed supported glyphs, font-dependent stats and two-glyph comparison. R11 refines launch input, directional Dash, keyboard, collision feedback, and the full-screen results experience.

Install original fonts locally (not included): `python3 scripts/install_font_assets.py --source-zip /absolute/path/source.zip`. Then serve: `python3 -m http.server 8000` and open `/r9-index.html`. TanStack entry remains in `src/routes/index.tsx` for development with `npm run dev`.

Read `docs/R11_GAME_FEEL_AND_HANDOFF.md` for verification, limitations, and next steps. Do not treat local test results as verified leaderboard records.

## R19 · Battle result page / local record (2026-10-24)

Page #006 / Feature #006. The full cumulative repo now includes R13–R19 Git history. R19 expands Story's real Rapier/HP result view with mission-by-mission star results, actual battle measurements, previous-best comparison, verified local progress status and an isolated, capped recent Story journal. Classic has a localized unranked result summary without HP/stars. No original font binaries, ranking backend or changed physics. See `docs/R19_PAGE006_RESULTS_HANDOFF.md`.

Quick checks: `npm run test:r19`, `node --test tests/*.test.mjs`, `python3 static_check.py`, `npm run fixture:r19 && python3 scripts/r19-result-visual-check.py`. The last step renders **UI-only test fixtures**, not genuine 3D/WebGL combat.


# R26 — Independent SEO URL architecture (cumulative R13–R26)

Page routes: `/`, `/play/`, `/stages/`, `/glyphs/`, `/compare/`, `/strongest/`, `/how-to-play/`; localized routes are available under `/en/`, `/zh/`, and `/ko/`. Route modules set `ssr: true`; Vite/TanStack Start static prerendering crawls ordinary links. The home page renders its full React shell on the server, and client gameplay boot happens after hydration. `robots.txt`, a 28-URL sitemap, canonical/hreflang links, and per-route `WebPage` JSON-LD are included. Invalid locale/slug combinations return not-found instead of a generic 200 page.

Run `npm run audit:r26`, `npm run test:r25`, `npm run check:r9`, `npm run check:r25`, and `npm run audit:r25`. See `docs/R26_CRAWLABLE_URLS_SSR_HANDOFF.md`. Set `VITE_SITE_URL` and `VITE_BASE_PATH` together before production build if the deployment base differs from the repository's existing canonical. **Build/prerender is not verified in the current runtime** because Vite is missing and package installation was blocked by registry DNS.
