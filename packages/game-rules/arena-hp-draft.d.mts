export const ARENA_HP_DRAFT: {
  readonly version: string
  readonly maxHp: number
  readonly forceUnit: number
  readonly criticalMultiplier: number
  readonly minForce: number
  readonly maxDamagePerHit: number
}

export function damageAmounts(
  impact: { force: number; critical?: boolean; criticalAttackers?: readonly number[] },
  draft?: typeof ARENA_HP_DRAFT,
): [number, number]

export function applyArenaHp(
  impacts: readonly { tick: number; force: number; critical?: boolean; criticalAttackers?: readonly number[] }[],
  draft?: typeof ARENA_HP_DRAFT,
): {
  version: string
  maxHp: number
  hp: [number, number]
  applications: {
    tick: number
    target: number
    amount: number
    hpAfter: number
    sourceContactId: string
  }[]
  ended: { tick: number; reason: 'hp-depleted'; winner: 0 | 1 | null } | null
}

export function summarizeArenaHp(testCase: {
  id: string
  steps: number
  result: { winner: 0 | 1 | null; reason: string }
  legacyEvents: { impacts: readonly { tick: number; force: number; critical?: boolean; criticalAttackers?: readonly number[] }[] }
}): {
  id: string
  classic: { tick: number; winner: 0 | 1 | null; reason: string }
  arena: ReturnType<typeof applyArenaHp>
}
