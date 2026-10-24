/** Moji Blade V3 domain contracts — design skeleton only, not a running game engine. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type RulesetVersion = Brand<string, 'RulesetVersion'>;
export type PhysicsVersion = Brand<string, 'PhysicsVersion'>;
export type OutlineVersion = Brand<string, 'OutlineVersion'>;
export type StageId = Brand<string, 'StageId'>;
export type LevelId = Brand<string, 'LevelId'>;
export type GlyphId = Brand<string, 'GlyphId'>;
export type FontId = Brand<string, 'FontId'>;
export type MatchId = Brand<string, 'MatchId'>;

export interface GameVersion {
  ruleset: RulesetVersion;
  physics: PhysicsVersion;
  glyph: OutlineVersion;
  stage: string;
  protocol: number;
}

export type RulesetKind = 'classic-v2' | 'arena-hp-v3';
export interface Ruleset {
  id: RulesetKind;
  version: RulesetVersion;
  maxDurationTicks: number;
  healthEnabled: boolean;
  scorePolicy: 'classic' | 'story' | 'streak' | 'scout';
}

export interface GlyphRef {
  glyph: GlyphId;             // exactly one validated Unicode grapheme cluster
  font: FontId;
  outlineVersion: OutlineVersion;
  outlineHash: string;        // canonical bundled geometry digest
}
export interface GlyphFeatures {
  area: number;
  hullArea: number;
  perimeter: number;
  centroidOffset: number;
  momentProxy: number;
  symmetryScore: number;
  pointinessScore: number;
  compactness: number;
}
export interface GlyphStats {
  speed: number;              // DISPLAY score: 0-100, calibrated, not physics velocity
  power: number;              // DISPLAY score: 0-100, calibrated
  maxHp: number;              // gameplay points; tested separately
  balance: number;            // DISPLAY score: 0-100
  statsVersion: string;
}
export interface CombatantState {
  slot: 0 | 1;
  glyph: GlyphRef;
  stats: GlyphStats;
  hp: number;                 // current actual HP
  spin: number;               // current spin energy, not HP
  ringOut: boolean;
}
export interface BattleAction {
  slot: 0 | 1;
  angleQ: number;             // fixed integer quantization; bounds validated
  powerQ: number;
  spinDirection: -1 | 1;
  requestId: string;
}
export interface BattleSetup {
  matchId: MatchId;
  version: GameVersion;
  ruleset: Ruleset;
  stageId: StageId;
  seed: string;
  players: readonly [GlyphRef, GlyphRef];
  actions: readonly [BattleAction, BattleAction];
}
export type BattleEndReason =
  | 'ring-out'
  | 'hp-depleted'
  | 'spin-exhausted'
  | 'double-ko'
  | 'timeout'
  | 'forfeit'
  | 'invalid';
export interface BattleResult {
  winner: 0 | 1 | null;
  reason: BattleEndReason;
  tick: number;
  states: readonly [CombatantState, CombatantState];
  resultHash: string;
}
export type BattleEvent =
  | { type: 'launch'; tick: number; actions: readonly [BattleAction, BattleAction] }
  | { type: 'collision'; tick: number; a: 0 | 1; b: 0 | 1 | 'arena'; impulse: number; critical: boolean }
  | { type: 'damage'; tick: number; target: 0 | 1; amount: number; hpAfter: number; sourceContactId: string }
  | { type: 'boost'; tick: number; slot: 0 | 1; effectId: string }
  | { type: 'ring-out'; tick: number; slot: 0 | 1 }
  | { type: 'finished'; tick: number; result: BattleResult };

export interface FrameSnapshot {
  tick: number;
  matchId: MatchId;
  position: readonly [readonly [number, number, number], readonly [number, number, number]];
  hp: readonly [number, number];
  spin: readonly [number, number];
  stateHash: string;
}
export interface Simulation {
  create(setup: BattleSetup): Promise<void>;
  stepFixed(): readonly BattleEvent[];   // no DOM, no requestAnimationFrame inside
  snapshot(): FrameSnapshot;
  result(): BattleResult | null;
  dispose(): void;
}

export interface ArenaDefinition {
  id: StageId;
  nameKey: string;
  geometryAssetId: string;
  physicsModifiers: readonly { id: string; params: Record<string, number> }[];
  arenaVersion: string;
}
export interface LevelDefinition {
  id: LevelId;
  chapter: number;
  order: number;
  arenaId: StageId;
  enemy: GlyphRef;
  seed: string;
  ruleset: RulesetVersion;
  objectiveIds: readonly string[];
  rewardIds: readonly string[];
  prerequisiteIds: readonly LevelId[];
}

export interface SaveSlot {
  ownerId: string | null;      // null before account binding
  slotId: string;
  schemaVersion: number;
  revision: number;
  lastMutationId: string;
  settings: Record<string, unknown>;
  storyProgress: Record<string, { stars: 0 | 1 | 2 | 3; bestTick?: number }>;
  unlockedGlyphKeys: readonly string[];
  cosmeticUnlocks: readonly string[];
  activeScoutRun: unknown | null;  // replace with audited V2-compatible run schema
}
export interface RankedSubmission {
  idempotencyKey: string;
  matchId: MatchId;
  version: GameVersion;
  seed: string;
  actions: readonly [BattleAction, BattleAction];
  claimedResultHash: string;  // candidate only; never authoritative
}
