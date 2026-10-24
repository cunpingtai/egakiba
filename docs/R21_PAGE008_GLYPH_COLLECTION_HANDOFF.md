# R21 · Page #008 / Feature #008 · Glyph Collection and Discoveries

Date: 2026-10-24. **Baseline:** R20 Git `7b87a28`. Source and Git history inherited without reset: R13 → R14 → R15 → R16 → R17 → R18 → R19 → R20 → R21. Production rule engines, Story unlock/save authority, Classic physics, and prior saved keys are unchanged.

## What shipped

- The previous collection placeholder is now the real client-side **Glyph Collection** at `#collection`, accessible through the existing desktop nav and the home footer entry in **both standalone HTML and React/TanStack shell**. Return to home, search entries, filter by Han/Kana/Latin/symbols, filter by played vs favorite, and select glyph-font variants.
- 34 curated suggestions shown as **unplayed recommendations**, never automatically counted as discoveries; verified gameplay glyphs are logged only if the native battle bridge reports `status: 'started'`, using the **captured, preflight-verified launch glyph and font**. All records are **local only**.
- Older R19 *last 30 Story match* journal entries contribute observed discoveries (when the stored entry has a valid single glyph and font). It does not reveal all discoveries before R19; older R10 save does not contain full usage records. Discoveries from Classic games are only tracked for new successfully started matches from R21 onward.
- Favorite toggles store a glyph + font pair in a new bounded versioned key `moji-blade.r21.glyph-collection.v1`. Marking a favorite **does not** mark it as played/discovered; un-favoriting never removes real discovery status. Does not overwrite R10 progress, R19 history, or R20 read-only personal statistics.
- Detail panel has an **on-demand native measurement** button. Only the original `loadClassicLibrary` and `deriveNativeStats` produce Speed/Power/Balance/Story HP values. If the original licensed font is unavailable or the glyph unsupported, the panel shows an honest unavailable state instead of fabricated metrics. Using a collected glyph redirects to R16 selection and its native validation, with the selected font.
- Four complete UI locales: Japanese, Simplified Chinese, English, Korean. User text is escaped; only valid one-grapheme selections and approved font IDs are persisted. No monetization, unverified rankings, social or cloud sync.

## Changed/new files

- `engine/r21-glyph-collection.mjs`: bounded persistent records, validation, R19 observation merge, filtering, locale HTML, rendering of native stats.
- `r2-flow.js`: native `collection` screen, URL `#collection`, selection/filter/favorite events, verified battle start discovery, async native stats panel, go-to-glyph action.
- `app.js`: existing `data-panel="collection"` links navigate to the real collection screen, not a placeholder overlay.
- `r9-index.html`, `src/styles.css`: CSS includes in both entry points; `src/routes/index.tsx` already contained the original nav link and was deliberately retained unchanged.
- `r21-collection.css`: responsive standalone collection layout and accessible states.
- `tests/r21-glyph-collection.test.mjs`: data truth/filters/favorites/corruption/escaping/locales/wiring.
- `scripts/r21-collection-fixture.mjs`, `assets/r21-*`, `docs/R21_COLLECTION_VISUAL_RESULTS.json`: fixture and layout evidence only. Generated with representative local test data, **not genuine battle measurements**.
- `package.json`: new `test:r21` and `fixture:r21` commands.

## Verified

- `node --test tests/*.test.mjs`: **77 passed, 3 skipped because original separately licensed fonts were absent, 0 failed; 80 total**.
- `npm run test:r21`: **58 passed / 0 failed** (targeted related suite).
- `python3 static_check.py`: PASS.
- `node scripts/r21-collection-fixture.mjs` and Chromium/Playwright **renderer-based fixture** at 320, 390, 800, 1440 px; no horizontal overflow, filter and action controls visible. See `R21_COLLECTION_VISUAL_RESULTS.json`.
- Full HTTP page navigation attempted again but sandbox Chromium gave `net::ERR_BLOCKED_BY_ADMINISTRATOR` on loopback; genuine WebGL and authorized-font battle launch are **not** yet verified. Do not confuse fixture screenshots with real runtime acceptance.

## Environment / acceptance before deploying

1. Authorize and locally install the original, separately licensed fonts. Never distribute them in ZIP.
2. Serve `r9-index.html` over HTTP in a permitted local browser, or run Vite React root. Open `#collection` from header/footer; reload hash directly; switch all four locales.
3. Search `龍`, filter Kana and favorites, add and remove favorites; refresh. Check glyph/font variant distinctions and browser with storage denied.
4. Click **Inspect native stats** for a supported glyph/font and verify exact original stats; inspect unsupported/missing fonts and confirm honest failure.
5. Click **Use this glyph** and confirm R16 validation. Complete an actual battle; return to collection and verify discovery; aborted/failed launches must **not** count.
6. Confirm R10 Story unlocks/ratings, R19 journal (30 max), and R20 statistics are unchanged. Test Classic and Story with real WebGL and touch controls.

## Proposed R22

Page #009: detailed glyph page / glyph analysis workbench (single glyph, validated per-font geometry, practical matchups), building on R21 **without inventing character strengths or converting bulk glyphs into low-value empty SEO pages**.
