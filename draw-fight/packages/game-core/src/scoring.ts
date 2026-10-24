import type { MatchState, Side } from './types.ts';

export interface LevelScoringRules {
  levelId: string;
  /** Baseline benchmark in authoritative gameplay ticks. */
  parTicks: number;
}
export interface ScoreResult {
  levelId: string;
  score: number;
  stars: 0 | 1 | 2 | 3;
  finishedTicks: number;
  remainingHp: number;
}
/** Server must rerun a replay; never trust a client-reported result. */
export function scorePveMatch(state: MatchState, playerSide: Side, rules: LevelScoringRules): ScoreResult {
  if (state.phase !== 'finished') throw new Error('Cannot score unfinished match');
  if (!rules.levelId || rules.parTicks <= 0) throw new Error('Invalid scoring rules');
  const player = playerSide === 'p1' ? state.p1 : state.p2;
  const won = state.winner === playerSide;
  if (!won) return { levelId: rules.levelId, score: 0, stars: 0, finishedTicks: state.tick, remainingHp: player.hp };
  const hpPct = player.hp / player.definition.stats.maxHp;
  const timeBonus = Math.max(0, rules.parTicks - state.tick);
  const score = Math.max(0, Math.round(1000 + 600 * hpPct + Math.min(900, timeBonus * 1.3)));
  const stars: 1 | 2 | 3 = hpPct >= 0.6 && state.tick <= rules.parTicks ? 3 : hpPct >= 0.25 ? 2 : 1;
  return { levelId: rules.levelId, score, stars, finishedTicks: state.tick, remainingHp: player.hp };
}
