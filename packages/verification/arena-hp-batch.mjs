import { readFile, writeFile } from 'node:fs/promises'
import { parse } from '../../source/vendor/opentype.js'
import { FONTS } from '../../source/fonts.js'
import { GlyphLibrary } from '../../source/glyph.js'
import { Battle, initPhysics } from '../../source/physics.js'
import { ARENA_HP_DRAFT, applyArenaHp } from '../game-rules/arena-hp-draft.mjs'

const library = new GlyphLibrary(
  parse(await readFile(new URL(`../../source/fonts/${FONTS.gothic.file}`, import.meta.url)), { lowMemory: true }),
  FONTS.gothic,
  { randomPools: { all: [], kanji: [], nonKanji: [] } },
)
await initPhysics()

const opponent = { angle: 0.3, power: 0.82, spinDirection: 1 }
const cases = []
for (const stageId of ['standard', 'boost-bowl', 'square', 'rotating-floor']) {
  for (const glyphs of [['文', '字'], ['字', '文'], ['一', '龍'], ['龍', '一']]) {
    for (const angle of [-0.8, 0, 0.8, 1.5707963267948966]) {
      for (const power of [0.6, 1]) {
        cases.push({
          id: `${stageId}:${glyphs.join('')}:${angle}:${power}`,
          glyphs,
          fonts: ['gothic', 'gothic'],
          stageId,
          actions: [
            { angle, power, spinDirection: 1 },
            opponent,
          ],
        })
      }
    }
  }
}

function percentile(sorted, ratio) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

const fights = []
for (const testCase of cases) {
  const glyphs = testCase.glyphs.map((glyph) => library.get(glyph))
  const battle = new Battle(glyphs, testCase.actions[1], { stageId: testCase.stageId })
  battle.launchPair(testCase.actions)
  let steps = 0
  while (battle.running && steps < 25000) {
    battle.step()
    steps += 1
  }
  const impacts = battle.events.map((event, index) => ({
    tick: index,
    force: event.force,
    critical: Boolean(event.critical),
    criticalAttackers: [...(event.criticalAttackers ?? [])],
  }))
  const arena = applyArenaHp(impacts)
  fights.push({
    id: testCase.id,
    stageId: testCase.stageId,
    glyphs: testCase.glyphs,
    steps,
    time: battle.time,
    winner: battle.result?.winner ?? null,
    reason: battle.result?.reason ?? null,
    impacts: impacts.length,
    boosts: battle.boostEvents.length,
    ropes: battle.ropeEvents.length,
    forces: impacts.map((impact) => impact.force),
    cappedHits: arena.applications.filter((hit) => hit.amount === ARENA_HP_DRAFT.maxDamagePerHit).length,
    arenaEnded: arena.ended?.reason ?? null,
    hash: battle.stateHash(),
  })
  battle.dispose()
  if (fights.length % 16 === 0) console.error(`${fights.length}/${cases.length}`)
}

const forces = fights.flatMap((fight) => fight.forces).filter((force) => force >= 25).sort((a, b) => a - b)
const byGlyph = {}
for (const fight of fights) {
  const glyph = fight.winner === null ? null : fight.glyphs[fight.winner]
  const key = fight.glyphs.join('')
  byGlyph[key] ??= { fights: 0, wins: {}, reasons: {} }
  byGlyph[key].fights += 1
  byGlyph[key].wins[glyph ?? 'draw'] = (byGlyph[key].wins[glyph ?? 'draw'] ?? 0) + 1
  byGlyph[key].reasons[fight.reason ?? 'none'] = (byGlyph[key].reasons[fight.reason ?? 'none'] ?? 0) + 1
}

const report = {
  status: 'sample-batch-not-a-balance-claim',
  draft: ARENA_HP_DRAFT.version,
  grid: {
    stages: ['standard', 'boost-bowl', 'square', 'rotating-floor'],
    pairs: ['文/字', '字/文', '一/龍', '龍/一'],
    angles: [-0.8, 0, 0.8, 1.5707963267948966],
    powers: [0.6, 1],
    opponent,
  },
  fights: fights.length,
  force: {
    count: forces.length,
    min: forces[0] ?? null,
    p50: forces.length ? percentile(forces, 0.5) : null,
    p90: forces.length ? percentile(forces, 0.9) : null,
    max: forces.at(-1) ?? null,
  },
  outcomes: {
    noImpact: fights.filter((fight) => fight.impacts === 0).length,
    firstSecond: fights.filter((fight) => fight.time < 1).length,
    timeout: fights.filter((fight) => fight.reason === '時間切れ').length,
    tipped: fights.filter((fight) => fight.reason === '転倒').length,
    ringOut: fights.filter((fight) => fight.reason === '場外').length,
    spinStopped: fights.filter((fight) => fight.reason === '回転停止').length,
    arenaDepleted: fights.filter((fight) => fight.arenaEnded === 'hp-depleted').length,
    cappedApplications: fights.reduce((sum, fight) => sum + fight.cappedHits, 0),
    boostFights: fights.filter((fight) => fight.boosts > 0).length,
    ropeFights: fights.filter((fight) => fight.ropes > 0).length,
    meanSteps: fights.reduce((sum, fight) => sum + fight.steps, 0) / fights.length,
  },
  byGlyph,
  scaleDecision: {
    nextVersion: 'arena-hp-v3.0.0-draft.2',
    rule: 'forceUnit is round(median force / 12). A median contact removes about 12 HP before the critical multiplier. One hit is capped at 30.',
    forceUnit: forces.length ? Math.round(percentile(forces, 0.5) / 12) : null,
    maxDamagePerHit: 30,
    measuredWith: ARENA_HP_DRAFT.version,
  },
  cases: fights,
}
await writeFile(new URL('../../docs/v3/m3/arena-hp-contact-batch.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ fights: report.fights, force: report.force, outcomes: report.outcomes, byGlyph: report.byGlyph }, null, 2))
