import type { BattleEndReason } from '../../contracts/src/v3-contracts.ts'
import {
  createLegacyBattleAdapter as createRuntimeAdapter,
  mapClassicEndReason as mapRuntimeReason,
  quantizeLegacyAction as quantizeRuntimeAction,
} from '../legacy-battle-adapter.mjs'

export interface LegacyLaunchAction {
  angle: number
  power: number
  spinDirection?: -1 | 1
}

export interface LegacyBattleResult {
  winner: 0 | 1 | null
  reason: string
  losses: readonly (string | null)[]
}

export interface LegacyImpactRecord {
  tick: number
  position: { x: number; y: number; z: number }
  strength: number
  force: number
  critical: boolean
  criticalAttackers: number[]
}

export interface LegacyBattlePort {
  readonly running: boolean
  readonly time: number
  readonly result: LegacyBattleResult | null
  readonly events: unknown[]
  readonly boostEvents: unknown[]
  readonly ropeEvents: unknown[]
  launchPair(actions: readonly LegacyLaunchAction[]): boolean
  step(): void
  stateHash(): string
  dispose(): void
}

export interface ClassicBattleEvent {
  type: 'classic-launch' | 'collision' | 'boost' | 'ring-out' | 'finished'
  tick: number
  reason?: BattleEndReason | null
  classicReason?: string
}

export interface LegacyBattleAdapter {
  readonly running: boolean
  readonly steps: number
  readonly result: LegacyBattleResult | null
  stateHash(): string
  launch(actions: readonly [LegacyLaunchAction, LegacyLaunchAction]): boolean
  step(): readonly ClassicBattleEvent[]
  legacyEvents(): { impacts: LegacyImpactRecord[] }
  battleEvents(): readonly ClassicBattleEvent[]
  dispose(): void
}

export function createLegacyBattleAdapter(battle: LegacyBattlePort): LegacyBattleAdapter {
  return createRuntimeAdapter(battle) as LegacyBattleAdapter
}

export function mapClassicEndReason(reason: string): BattleEndReason | null {
  return mapRuntimeReason(reason)
}

export function quantizeLegacyAction(action: LegacyLaunchAction): never {
  return quantizeRuntimeAction(action)
}
