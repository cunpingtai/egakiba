import type { Ruleset, RulesetVersion } from '../../contracts/src/v3-contracts.ts'

/**
 * Draft rulesets only. Coefficients are copied from the published V2 config
 * so Classic can be identified. Arena HP damage numbers are intentionally absent.
 */

export const CLASSIC_PHYSICS_STEP = 1 / 240
export const CLASSIC_SIMULATION_RATE = 2.1
export const CLASSIC_TIME_LIMIT_SECONDS = 45

/** Physics steps that advance game time to the V2 45 second draw. */
export const CLASSIC_MAX_DURATION_TICKS = Math.round(
  (CLASSIC_TIME_LIMIT_SECONDS * CLASSIC_SIMULATION_RATE) / CLASSIC_PHYSICS_STEP,
)

function rulesetVersion(value: string): RulesetVersion {
  return value as RulesetVersion
}

export const classicV2Ruleset: Ruleset = {
  id: 'classic-v2',
  version: rulesetVersion('classic-v2.4.1'),
  maxDurationTicks: CLASSIC_MAX_DURATION_TICKS,
  healthEnabled: false,
  scorePolicy: 'classic',
}

export const arenaHpV3Ruleset: Ruleset = {
  id: 'arena-hp-v3',
  version: rulesetVersion('arena-hp-v3.0.0-draft'),
  maxDurationTicks: CLASSIC_MAX_DURATION_TICKS,
  healthEnabled: true,
  scorePolicy: 'story',
}

export const RULESETS = {
  'classic-v2': classicV2Ruleset,
  'arena-hp-v3': arenaHpV3Ruleset,
} as const

/**
 * V2 loss strings observed in physics.js. `転倒` is a separate Classic outcome
 * and must not be stored as Arena HP `spin-exhausted`.
 */
export const CLASSIC_LOSS = {
  ringOut: '場外',
  tipped: '転倒',
  spinStopped: '回転停止',
  simultaneous: '同時決着',
  timeout: '時間切れ',
} as const

export type ClassicLossReason = (typeof CLASSIC_LOSS)[keyof typeof CLASSIC_LOSS]
