/** Versioned wire-compatible, DOM-free game contracts. */
export type Side = 'p1' | 'p2';
export type Winner = Side | 'draw' | null;
export type AttackKind = 'light' | 'heavy';
export type BattlePhase = 'playing' | 'finished';
export type GameEventType =
  | 'attack_started' | 'hit' | 'blocked' | 'perfect_guard' | 'guard_break'
  | 'knockout' | 'timeout' | 'round_finished';

export interface ShapeFeatures {
  /** All normalized [0, 1]; extracted from a canonical drawing blueprint. */
  mass: number;
  limbReach: number;
  limbCount: number;
  slenderness: number;
}
export interface FighterStats {
  /** Fixed for an immutable fighter revision and balance version. */
  maxHp: number;
  power: number;
  speed: number;
  defense: number;
  reach: number;
  radius: number;
}
export interface FighterDefinition {
  id: string;
  revision: number;
  analyzerVersion: string;
  balanceVersion: string;
  stats: FighterStats;
  appearanceAssetId?: string;
}
export interface Command {
  /** World-space movement, range -1..1. Camera adapters convert screen axes. */
  moveX: number;
  moveZ: number;
  /** Held states. Attack is executed on release (light / charged heavy). */
  attackHeld: boolean;
  guardHeld: boolean;
}
export interface AttackState {
  kind: AttackKind;
  age: number;
  connected: boolean;
}
export interface Combatant {
  definition: FighterDefinition;
  hp: number;
  stamina: number;
  x: number;
  z: number;
  faceX: number;
  faceZ: number;
  stunTicks: number;
  cooldownTicks: number;
  regenDelayTicks: number;
  guardStartTick: number;
  perfectGuardCooldownTicks: number;
  guardHeld: boolean;
  attackHeldPrev: boolean;
  chargeTicks: number;
  attack: AttackState | null;
}
export interface GameEvent {
  tick: number;
  type: GameEventType;
  actor: Side;
  target?: Side;
  damage?: number;
}
export interface MatchState {
  rulesVersion: 'combat-v2a';
  tick: number;
  maxTicks: number;
  phase: BattlePhase;
  winner: Winner;
  seed: number;
  p1: Combatant;
  p2: Combatant;
}
export interface TickResult {
  state: MatchState;
  events: GameEvent[];
}
export const NEUTRAL_COMMAND: Readonly<Command> = {
  moveX: 0, moveZ: 0, attackHeld: false, guardHeld: false,
};
