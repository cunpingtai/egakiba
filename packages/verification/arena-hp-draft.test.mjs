import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ARENA_HP_DRAFT, applyArenaHp, damageAmounts, summarizeArenaHp } from '../game-rules/arena-hp-draft.mjs'

const FINAL_HASHES = {
  'standard-bun-ji-gothic': '4573bd52',
  'standard-bun-ji-opposite-spin': '4c0317f5',
  'standard-light-vs-heavy': 'ce6720a1',
  'mincho-vs-brush': '745ebd50',
  'boost-bowl': '6eb4b3ac',
  'square-ring': 'a0603f98',
  'rotating-floor': '1e569534',
  'weak-com-default': '5217186f',
  'boost-bowl-contact': '1131c4cc',
  'square-rope-contact': '7d870540',
}

test('damage stays inside the draft cap and ignores weak contacts', () => {
  const probe = { ...ARENA_HP_DRAFT, forceUnit: 25, maxDamagePerHit: 35 }
  assert.deepEqual(damageAmounts({ force: 23, critical: true, criticalAttackers: [1] }, probe), [0, 0])
  assert.deepEqual(damageAmounts({ force: 250, critical: false, criticalAttackers: [] }, probe), [10, 10])
  assert.deepEqual(damageAmounts({ force: 250, critical: true, criticalAttackers: [1] }, probe), [15, 10])
  assert.deepEqual(damageAmounts({ force: 5000, critical: false, criticalAttackers: [] }, probe), [35, 35])
})

test('the live scale follows the contact-batch median', async () => {
  const batch = JSON.parse(await readFile(new URL('../../docs/v3/m3/arena-hp-contact-batch.json', import.meta.url), 'utf8'))
  assert.equal(batch.draft, 'arena-hp-v3.0.0-draft')
  assert.equal(batch.outcomes.cappedApplications, 452)
  assert.equal(ARENA_HP_DRAFT.version, batch.scaleDecision.nextVersion)
  assert.equal(ARENA_HP_DRAFT.forceUnit, Math.round(batch.force.p50 / 12))
  assert.equal(ARENA_HP_DRAFT.forceUnit, batch.scaleDecision.forceUnit)
  assert.equal(ARENA_HP_DRAFT.maxDamagePerHit, 30)
  assert.equal(Math.floor(batch.force.p50 / ARENA_HP_DRAFT.forceUnit), 11)
})

test('the same contact is applied once and HP stops at zero', () => {
  const draft = { ...ARENA_HP_DRAFT, maxHp: 20 }
  const impact = { tick: 4, force: 5000, critical: true, criticalAttackers: [0] }
  const result = applyArenaHp([impact, { ...impact }], draft)
  assert.deepEqual(result.hp, [0, 0])
  assert.equal(result.applications.length, 2)
  assert.deepEqual(result.ended, { tick: 4, reason: 'hp-depleted', winner: null })
})

test('classic golden hashes and end reasons stay put', async () => {
  const golden = JSON.parse(await readFile(new URL('../../docs/v3/m0/legacy-battle-results.json', import.meta.url), 'utf8'))
  const samples = JSON.parse(await readFile(new URL('../../docs/v3/m3/arena-hp-draft-samples.json', import.meta.url), 'utf8'))
  assert.equal(samples.status, 'draft-not-calibrated')
  for (const testCase of golden.cases) {
    assert.equal(testCase.samples.at(-1), FINAL_HASHES[testCase.id])
    assert.equal(testCase.battleEvents.some((event) => event.type === 'damage'), false)
    assert.ok(testCase.legacyEvents.impacts.every((impact) => Number.isFinite(impact.force)))
    if (testCase.result.reason === '転倒') {
      const finished = testCase.battleEvents.find((event) => event.type === 'finished')
      assert.equal(finished.reason, null)
      assert.equal(finished.classicReason, '転倒')
    }
    assert.deepEqual(summarizeArenaHp(testCase), samples.cases.find((item) => item.id === testCase.id))
  }
  const boost = golden.cases.find((item) => item.id === 'boost-bowl-contact')
  assert.deepEqual(boost.battleEvents.filter((event) => event.type === 'boost').map((event) => event.tick), [151, 326])
  assert.equal(boost.legacyEvents.ropes.length, 0)
  const rope = golden.cases.find((item) => item.id === 'square-rope-contact')
  assert.deepEqual(rope.legacyEvents.ropes.map((event) => event.side), [0, 2])
  assert.equal(rope.legacyEvents.boosts.length, 0)
  assert.equal(golden.cases.find((item) => item.id === 'boost-bowl').legacyEvents.boosts.length, 0)
  assert.equal(golden.cases.find((item) => item.id === 'square-ring').legacyEvents.ropes.length, 0)
})
