export function mapClassicEndReason(reason: string): 'ring-out' | 'spin-exhausted' | 'double-ko' | 'timeout' | null
export function quantizeLegacyAction(action: { angle: number; power: number; spinDirection?: -1 | 1 }): never
export function createLegacyBattleAdapter(battle: {
  readonly running: boolean
  readonly result: { winner: 0 | 1 | null; reason: string; losses: readonly (string | null)[] } | null
  readonly events: unknown[]
  readonly boostEvents: unknown[]
  readonly ropeEvents: unknown[]
  launchPair(actions: readonly { angle: number; power: number; spinDirection?: -1 | 1 }[]): boolean
  step(): void
  stateHash(): string
  dispose(): void
}): {
  readonly running: boolean
  readonly steps: number
  readonly result: { winner: 0 | 1 | null; reason: string; losses: readonly (string | null)[] } | null
  stateHash(): string
  launch(actions: readonly { angle: number; power: number; spinDirection?: -1 | 1 }[]): boolean
  step(): unknown[]
  legacyEvents(): {
    impacts: {
      tick: number
      position: { x: number; y: number; z: number }
      strength: number
      force: number
      critical: boolean
      criticalAttackers: number[]
    }[]
    boosts: unknown[]
    ropes: unknown[]
  }
  battleEvents(): {
    type: string
    tick: number
    reason?: string | null
    classicReason?: string
  }[]
  dispose(): void
}
