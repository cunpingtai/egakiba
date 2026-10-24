# R25 — Sitewide content cleanup and SEO audit

**Baseline:** R24 / Git `aa6bd39` (R13–R24 cumulative source).  
**Scope:** Copy and page regression only. No combat physics, stage rules, save schema, glyph metrics, or battle reward logic changed.

## 1. Search evidence used

Four user-provided Google Trends CSV exports were reviewed: the 30-day worldwide top/rising query files and the last-day worldwide top/rising query files. Trends' `search interest` is a normalized relative index, **not absolute monthly search volume**. `Breakout` is not a numeric volume estimate.

| Query cluster | 30-day evidence | Last-day evidence | R25 placement |
|---|---:|---:|---|
| `文字 ブレード 最強 文字` | 100 / Breakout | 100 / +7% | Home title, hero, strongest-glyph research |
| `文字 ブレード 最強` | 96 / Breakout | 99 / +5% | Home and research page |
| `漢字 ブレード` | 81 / Breakout | 50 / +4% | Home title and related copy |
| `文字 ゲーム` | 50 / Breakout | related intent | Home title, description, visible copy |
| `文字 ブレード 最強 の 文字` | 21 / Breakout | 49 / +10% | Home and research page |
| `文字 ぶれーど` | 18 / Breakout | 16 / +200% | Brand spelling remains visible in Japanese content; canonical spelling stays 文字ブレード |
| `文字 バトル` | 9 / Breakout | 8 / +30% | Mode, setup, battle and result copy |
| `文字 ブレード ブラウザ` | 8 / Breakout | 7 / -50% | Home title/description states free browser game |
| `文字 ブレード tier` | — | 9 / +30% | Research page explains attribute data as a Tier-list reference, not a real win-rate ranking |
| `文字 ブレード 最弱` | — | 6 / +150% | Research page supports ascending/descending attribute comparison and uses strongest/weakest candidate wording |
| `画数 が 多い 漢字` | 17 / Breakout | 11 / +20% | Home FAQ explains that font support is validated before battle |
| `文字 陀螺` | 5 / Breakout | 6 / Breakout | Chinese locale copy includes 文字陀螺-related wording |

Queries about unrelated games/topics were not added just to increase keyword count. Negative day-over-day movement was not treated as proof of no demand; it only informed prioritization.

## 2. Page-by-page copy and keyword map

| Actual page/view | Main query intent and revised copy |
|---|---|
| Home | `文字ブレード`, `漢字ブレード`, `文字ゲーム`, `無料ブラウザゲーム`, `文字バトル`, `最強の文字`; visible explanatory content and four FAQs |
| Mode selection | `文字ブレードの遊び方`, `文字バトル`, `VS COM`; only actual Story and VS COM choices remain |
| Story stage selection | `文字ブレードのステージ攻略`, Chapter 1's four playable stages, mission and star conditions |
| Glyph selection | `文字ブレードの文字選び`, kanji/kana/letters, typefaces, validated glyph support |
| Battle setup | `文字ブレードの対戦準備`, both glyphs/typefaces, actual rules and attributes |
| Story/Classic battle | Localized Moji Blade battle heading and page title; original rules remain separate |
| Battle result | Localized `文字ブレードのバトル結果` heading; actual Story objectives and Classic's no-HP/no-ranking semantics remain distinct |
| Player profile | `文字ブレードのプレイ記録`; device-local save scope is explicit |
| Glyph collection | `文字ブレード文字図鑑`; searches, discovered glyphs and favorites remain distinct |
| Glyph detail | `文字ブレードの文字詳細`; four typefaces and original-geometry measurements |
| Glyph comparison lab | `文字ブレード文字比較ラボ`; two glyphs, independent fonts and metric deltas |
| Attribute research | `文字ブレード最強・最弱文字研究`, Tier-list reference language, candidate-set limitation and no win-rate claims |
| Settings / guide overlay | Replaced stale future promises with current controls and real gameplay instructions |

Titles and descriptions are localized for Japanese, Chinese, English and Korean. OpenGraph metadata and truthful `WebApplication` JSON-LD were added to both the standalone HTML and React shell. The homepage FAQ remains visible and addresses free browser play, strongest-glyph claims, mobile use, and font support for complex kanji.

## 3. Unfinished user-facing entries removed

- Removed the unimplemented online leaderboard link/placeholder. The local attribute research page remains separate and is not described as a player leaderboard.
- Removed the non-functional account/guest destination.
- Removed the non-functional local VS 2P destination.
- Removed disabled Streak/Scout mode cards that had no playable flow.
- Removed planned Chapter 2/3 tabs and their “coming soon” state from the visible stage selector and removed the unused planned-chapter catalog. Only the four actual Story stages are shown.
- Removed the generic handoff/integration-boundary page and its external Classic-game link. Unknown client-side screen names now fall back to the real mode selector.
- Removed the floating prototype/language bar, hidden first-time/returning-user toggle, and React devtools UI from the site shell. Language selection remains available in the global header.
- Removed the old settings mock note and replaced the outdated guide copy that claimed HP/SPIN were future features.

Existing playable pages remain: Story stages, VS COM, glyph selection, preparation, battle/result, profile, collection, detail, comparison lab and attribute research. The native physics and save logic were not changed.

## 4. Homepage keyword density check

The primary keyword is the exact Japanese phrase `文字ブレード`. Density is computed on the homepage body (not title/meta) as **exact phrase occurrences / Japanese word-like tokens × 100**, using `Intl.Segmenter('ja', { granularity: 'word' })`. This treats the full exact phrase as one target occurrence while using the Japanese segmenter's word-like token count as denominator.

- Static HTML fallback: **19 / 608 = 3.13%**
- Localized Japanese copy after applying `data-t` translations: **19 / 604 = 3.15%**
- Automated threshold: at least 3%; an upper guard at 4.5% prevents accidental over-stuffing.

This is a repeatable content QA metric, **not a promise of ranking**. The visible copy is spread across the hero, mode descriptions, feature cards and FAQs instead of hidden text or repeated keyword-only sentences. Do not add more repetitions without a new density check.

## 5. Regression and known limits

- `npm run test:r25`: **117 PASS, 3 SKIP, 0 FAIL** across the full `tests/*.test.mjs` suite.
- `npm run check:r9`: PASS — static check, 36 JS modules, no duplicate HTML IDs, native story bridge and CSS balance.
- `npm run check:r25`: PASS — keyword density, localized SEO copy, placeholder removal and page metadata checks.
- `node --check` on changed JavaScript modules: PASS.
- Browser smoke attempt: blocked by the environment with `net::ERR_BLOCKED_BY_ADMINISTRATOR` for local HTTP; no browser-runtime pass is claimed.
- `npm run build`: could not execute because this runtime does not have Vite installed (`vite: not found`). This is an environment limitation, not a successful build.
- Three original-font-dependent tests remain skipped. The authorized font pack is not included, so real WebGL/physical battles still require local acceptance.

## 6. SEO architecture limitation

The game views remain a client-side application with hash/deep-link views. R25 sets unique localized `document.title` and meta descriptions when switching views, but **these hash views are not independent crawlable landing pages**. This round improves the copy and metadata without inventing new routes. If separate Google rankings are required for the stage guide, glyph collection, strongest/weakest research and comparison lab, those intents need real path-based/SSR pages or equivalent crawlable landing pages in a separate architecture task.
