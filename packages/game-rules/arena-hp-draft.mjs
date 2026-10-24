/** Draft scale from the 128-fight contact batch. Not a ranked balance. */
export const ARENA_HP_DRAFT = Object.freeze({
  version: 'arena-hp-v3.0.0-draft.2',
  maxHp: 100,
  forceUnit: 121,
  criticalMultiplier: 1.5,
  minForce: 25,
  maxDamagePerHit: 30,
})

function hitDamage(force, critical, draft) {
  if (!Number.isFinite(force) || force < draft.minForce) return 0
  const scaled = Math.floor(force / draft.forceUnit) * (critical ? draft.criticalMultiplier : 1)
  return Math.max(0, Math.min(draft.maxDamagePerHit, Math.floor(scaled)))
}

export function damageAmounts(impact, draft = ARENA_HP_DRAFT) {
  const attackers = impact.criticalAttackers ?? []
  const critical = Boolean(impact.critical)
  return [
    hitDamage(impact.force, critical && attackers.includes(1), draft),
    hitDamage(impact.force, critical && attackers.includes(0), draft),
  ]
}

export function applyArenaHp(impacts, draft = ARENA_HP_DRAFT) {
  const hp = [draft.maxHp, draft.maxHp]
  const seen = new Set()
  const applications = []
  let ended = null
  for (const impact of impacts) {
    const sourceContactId = `${impact.tick}:0:1`
    if (seen.has(sourceContactId)) continue
    seen.add(sourceContactId)
    if (ended) continue
    const amounts = damageAmounts(impact, draft)
    for (const target of [0, 1]) {
      if (amounts[target] <= 0) continue
      hp[target] = Math.max(0, hp[target] - amounts[target])
      applications.push({
        tick: impact.tick,
        target,
        amount: amounts[target],
        hpAfter: hp[target],
        sourceContactId,
      })
    }
    if (hp[0] === 0 || hp[1] === 0) {
      ended = {
        tick: impact.tick,
        reason: 'hp-depleted',
        winner: hp[0] === 0 && hp[1] === 0 ? null : hp[0] === 0 ? 1 : 0,
      }
    }
  }
  return {
    version: draft.version,
    maxHp: draft.maxHp,
    hp: [...hp],
    applications,
    ended,
  }
}

export function summarizeArenaHp(testCase) {
  const arena = applyArenaHp(testCase.legacyEvents.impacts)
  return {
    id: testCase.id,
    classic: {
      tick: testCase.steps,
      winner: testCase.result.winner,
      reason: testCase.result.reason,
    },
    arena,
  }
}
