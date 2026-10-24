import { readFile, writeFile } from 'node:fs/promises'

import { parse } from '../../source/vendor/opentype.js'
import { FONTS } from '../../source/fonts.js'
import { GlyphLibrary } from '../../source/glyph.js'
import { Battle, initPhysics } from '../../source/physics.js'
import { replayFixture, sampleEvery } from './replay-core.mjs'

const battlesUrl = new URL('../../docs/v3/m0/legacy-battles.json', import.meta.url)
const resultsUrl = new URL('../../docs/v3/m0/legacy-battle-results.json', import.meta.url)
const checkOnly = process.argv.includes('--check')
const libraries = new Map()

async function libraryFor(fontId) {
  if (libraries.has(fontId)) return libraries.get(fontId)
  const spec = FONTS[fontId]
  if (!spec) throw new Error(`Unknown font ${fontId}`)
  const bytes = await readFile(new URL(`../../source/fonts/${spec.file}`, import.meta.url))
  const library = new GlyphLibrary(parse(bytes, { lowMemory: true }), spec, {
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

const fixture = JSON.parse(await readFile(battlesUrl, 'utf8'))
await initPhysics()
const runs = await replayFixture(fixture, createBattle)
for (const run of runs) console.error(`${run.id} ${run.result.reason} winner=${run.result.winner} steps=${run.steps} hash=${run.samples.at(-1)}`)

const output = {
  status: 'node-replay-deterministic',
  physicsVersion: 'moji-blade-rapier021-r16-app-inner1',
  ruleset: 'classic-v2.4.1',
  runtime: `node ${process.version}`,
  note: 'Consecutive runs match. Impact records now include the raw contact force. State hashes are unchanged. Browser parity is checked by packages/verification/browser-replay.html.',
  sampleEvery,
  cases: runs,
}

if (checkOnly) {
  const previous = JSON.parse(await readFile(resultsUrl, 'utf8'))
  const stable = structuredClone(output)
  const prior = structuredClone(previous)
  delete stable.runtime
  delete prior.runtime
  if (JSON.stringify(stable) !== JSON.stringify(prior)) {
    console.error('Golden results differ from docs/v3/m0/legacy-battle-results.json')
    process.exit(1)
  }
  console.error('Golden results match')
} else {
  await writeFile(resultsUrl, `${JSON.stringify(output, null, 2)}\n`)
  console.error(`Wrote ${runs.length} cases`)
}
