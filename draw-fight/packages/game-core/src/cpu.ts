import { SeededRng } from './rng.ts';
import type { Command, MatchState, Side } from './types.ts';

export type CpuStyle = 'beginner' | 'aggressive' | 'defensive' | 'retreating' | 'circling';
export interface CpuBrain {
  readonly style: CpuStyle;
  readonly side: Side;
  /** All decisions are based on state and the seed owned by this CPU. */
  decide(state: Readonly<MatchState>): Command;
}

/** Basic seeded PVE controller. Profile tuning and telegraph animations are R2 work. */
export function createCpu(style: CpuStyle, side: Side, seed: number): CpuBrain {
  const rng = new SeededRng(seed);
  let nextDecisionTick = 0;
  let guardUntil = 0;
  let attackUntil = 0;
  let orbitDir = rng.next() > 0.5 ? 1 : -1;
  const baseThink = style === 'beginner' ? 42 : style === 'aggressive' ? 16 : 25;
  return {
    style,
    side,
    decide(state): Command {
      if (state.phase !== 'playing') return { moveX: 0, moveZ: 0, guardHeld: false, attackHeld: false };
      const self = side === 'p1' ? state.p1 : state.p2;
      const foe = side === 'p1' ? state.p2 : state.p1;
      const dx = foe.x - self.x, dz = foe.z - self.z;
      const d = Math.hypot(dx, dz) || 0.0001;
      const targetDistance = self.definition.stats.reach + self.definition.stats.radius
        + foe.definition.stats.radius + (style === 'retreating' ? 0.20 : -0.14);
      if (state.tick >= nextDecisionTick) {
        const reaction = style === 'defensive' ? 0.65 : style === 'aggressive' ? 0.1 : 0.3;
        if (foe.attack && rng.next() < reaction) guardUntil = state.tick + 16;
        if (d < targetDistance + 0.2 && rng.next() > (style === 'beginner' ? 0.55 : 0.25))
          attackUntil = state.tick + (style === 'aggressive' ? 4 : 2);
        if (style === 'circling' && rng.next() < 0.3) orbitDir *= -1;
        nextDecisionTick = state.tick + baseThink + Math.floor(rng.next() * baseThink);
      }
      const shouldGuard = state.tick < guardUntil;
      // Heavy charge is deliberately uncommon in this first playable core.
      const attackHeld = state.tick < attackUntil && !shouldGuard;
      let ux = dx / d, uz = dz / d;
      const radial = d > targetDistance + 0.08 ? 1 : d < targetDistance - 0.15 ? -0.6 : 0;
      const lateral = style === 'circling' ? 0.65 * orbitDir : 0;
      const mx = ux * radial - uz * lateral;
      const mz = uz * radial + ux * lateral;
      const mag = Math.max(1, Math.hypot(mx, mz));
      return { moveX: mx / mag, moveZ: mz / mag, guardHeld: shouldGuard, attackHeld };
    },
  };
}
