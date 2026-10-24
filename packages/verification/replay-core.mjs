import { createLegacyBattleAdapter } from '../simulation/legacy-battle-adapter.mjs'

export const sampleEvery = 480
export const stepCap = 25000

export async function playCase(testCase, createBattle) {
  const battle = await createBattle(testCase)
  const adapter = createLegacyBattleAdapter(battle)
  try {
    const hashAtRest = adapter.stateHash()
    if (!adapter.launch(testCase.actions)) throw new Error(`${testCase.id} did not launch`)
    const samples = [adapter.stateHash()]
    while (adapter.running) {
      adapter.step()
      if (adapter.steps % sampleEvery === 0) samples.push(adapter.stateHash())
      if (adapter.steps > stepCap) throw new Error(`${testCase.id} exceeded ${stepCap} steps`)
    }
    samples.push(adapter.stateHash())
    const battleEvents = adapter.battleEvents()
    if (battleEvents.some((event) => event.type === 'damage')) throw new Error(`${testCase.id} emitted damage`)
    if (adapter.result?.reason === '転倒' && battleEvents.some((event) => event.reason === 'spin-exhausted')) {
      throw new Error(`${testCase.id} mapped 転倒 to spin-exhausted`)
    }
    return {
      id: testCase.id,
      hashAtRest,
      steps: adapter.steps,
      time: battle.time,
      result: adapter.result,
      samples,
      legacyEvents: adapter.legacyEvents(),
      battleEvents,
    }
  } finally {
    adapter.dispose()
  }
}

export async function replayFixture(fixture, createBattle) {
  const runs = []
  for (const testCase of fixture.cases) {
    const first = await playCase(testCase, createBattle)
    const second = await playCase(testCase, createBattle)
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      const error = new Error(`${testCase.id} diverged between consecutive runs`)
      error.first = first
      error.second = second
      throw error
    }
    runs.push(first)
  }
  return runs
}

export function compareCases(expected, actual) {
  const mismatches = []
  for (const golden of expected) {
    const run = actual.find((item) => item.id === golden.id)
    if (!run) {
      mismatches.push({ id: golden.id, field: 'missing' })
      continue
    }
    for (const field of ['hashAtRest', 'steps', 'time']) {
      if (run[field] !== golden[field]) mismatches.push({ id: golden.id, field, expected: golden[field], actual: run[field] })
    }
    if (JSON.stringify(run.result) !== JSON.stringify(golden.result)) {
      mismatches.push({ id: golden.id, field: 'result', expected: golden.result, actual: run.result })
    }
    if (JSON.stringify(run.samples) !== JSON.stringify(golden.samples)) {
      mismatches.push({ id: golden.id, field: 'samples', expected: golden.samples, actual: run.samples })
    }
    if (JSON.stringify(run.legacyEvents) !== JSON.stringify(golden.legacyEvents)) {
      mismatches.push({ id: golden.id, field: 'legacyEvents', expected: golden.legacyEvents, actual: run.legacyEvents })
    }
    if (JSON.stringify(run.battleEvents) !== JSON.stringify(golden.battleEvents)) {
      mismatches.push({ id: golden.id, field: 'battleEvents', expected: golden.battleEvents, actual: run.battleEvents })
    }
  }
  return mismatches
}
