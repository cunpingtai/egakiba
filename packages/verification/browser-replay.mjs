import { parse } from '../../source/vendor/opentype.js'
import { FONTS } from '../../source/fonts.js'
import { GlyphLibrary } from '../../source/glyph.js'
import { Battle, initPhysics } from '../../source/physics.js'
import { summarizeArenaHp } from '../game-rules/arena-hp-draft.mjs'
import { compareCases, replayFixture } from './replay-core.mjs'

const status = document.querySelector('#status')
const libraries = new Map()

async function libraryFor(fontId) {
  if (libraries.has(fontId)) return libraries.get(fontId)
  const spec = FONTS[fontId]
  const response = await fetch(new URL(`../../source/fonts/${spec.file}`, import.meta.url))
  if (!response.ok) throw new Error(`Font ${spec.file} returned ${response.status}`)
  const library = new GlyphLibrary(parse(await response.arrayBuffer(), { lowMemory: true }), spec, {
    randomPools: { all: [], kanji: [], nonKanji: [] },
  })
  libraries.set(fontId, library)
  return library
}

async function createBattle(testCase) {
  const glyphs = []
  for (let index = 0; index < testCase.glyphs.length; index++) {
    glyphs.push((await libraryFor(testCase.fonts[index])).get(testCase.glyphs[index]))
  }
  return new Battle(glyphs, testCase.actions[1], { stageId: testCase.stageId })
}

try {
  status.textContent = 'loading physics'
  const [fixtureResponse, goldenResponse, samplesResponse] = await Promise.all([
    fetch(new URL('../../docs/v3/m0/legacy-battles.json', import.meta.url)),
    fetch(new URL('../../docs/v3/m0/legacy-battle-results.json', import.meta.url)),
    fetch(new URL('../../docs/v3/m3/arena-hp-draft-samples.json', import.meta.url)),
  ])
  const fixture = await fixtureResponse.json()
  const golden = await goldenResponse.json()
  const samples = await samplesResponse.json()
  await initPhysics()
  status.textContent = 'replaying'
  const cases = await replayFixture(fixture, createBattle)
  const mismatches = compareCases(golden.cases, cases)
  const hpMismatches = cases.flatMap((testCase) => {
    const expected = samples.cases.find((item) => item.id === testCase.id)
    return JSON.stringify(summarizeArenaHp(testCase)) === JSON.stringify(expected) ? [] : [testCase.id]
  })
  const report = {
    ok: mismatches.length === 0 && hpMismatches.length === 0,
    runtime: navigator.userAgent,
    mismatches,
    hpMismatches,
    cases,
  }
  window.__REPLAY__ = report
  status.textContent = JSON.stringify(report, null, 2)
} catch (error) {
  const report = { ok: false, error: String(error?.stack || error) }
  window.__REPLAY__ = report
  status.textContent = report.error
}
