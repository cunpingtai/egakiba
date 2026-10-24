import type { FighterStats, ShapeFeatures } from './types.ts';

export const BALANCE_VERSION = 'balance-v2a' as const;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : a));

/**
 * First-pass competitive budget. Extracted shape gives a recognizable style
 * WITHOUT unbounded extra limbs/area granting extra overall power.
 * Exact coefficients are deliberately provisional and require play testing.
 */
export function statsFromShape(raw: ShapeFeatures): FighterStats {
  const mass = clamp(raw.mass, 0, 1);
  const reach = clamp(raw.limbReach, 0, 1);
  const limbs = clamp(raw.limbCount, 0, 1);
  const slender = clamp(raw.slenderness, 0, 1);
  const hpDelta = 0.12 * (mass - 0.5) - 0.04 * (slender - 0.5);
  const speedDelta = -0.11 * (mass - 0.5) + 0.07 * (slender - 0.5);
  const reachDelta = 0.15 * (reach - 0.5);
  const defenseDelta = 0.12 * (mass - 0.5);
  // Compensate range, durability, defense and speed with attack budget.
  const powerDelta = -0.45 * hpDelta - 0.55 * speedDelta
    - 0.35 * reachDelta - 0.4 * defenseDelta - 0.025 * (limbs - 0.5);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    maxHp: Math.round(100 * (1 + hpDelta)),
    power: round(clamp(1 + powerDelta, 0.85, 1.15)),
    speed: round(clamp(1 + speedDelta, 0.85, 1.15)),
    defense: round(clamp(1 + defenseDelta, 0.85, 1.15)),
    reach: round(clamp(0.74 * (1 + reachDelta), 0.64, 0.84)),
    radius: round(clamp(0.32 + 0.045 * (mass - 0.5), 0.29, 0.35)),
  };
}

export function validateStats(s: FighterStats): void {
  const nums = [s.maxHp, s.power, s.speed, s.defense, s.reach, s.radius];
  if (nums.some(x => !Number.isFinite(x)) || s.maxHp < 1 || s.maxHp > 200
      || s.power < 0.75 || s.power > 1.25
      || s.speed < 0.75 || s.speed > 1.25
      || s.defense < 0.75 || s.defense > 1.25
      || s.reach < 0.3 || s.reach > 1.2
      || s.radius < 0.2 || s.radius > 0.5) {
    throw new Error('Invalid fighter stats');
  }
}
