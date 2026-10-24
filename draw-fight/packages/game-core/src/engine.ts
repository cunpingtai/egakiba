import { validateStats } from './balance.ts';
import type { AttackKind, Combatant, Command, FighterDefinition, GameEvent,
  MatchState, Side, TickResult, Winner } from './types.ts';

/** DOM/WebGL-free combat logic. Input order is p1, p2, then collision, then finish. */
export const TICK_RATE = 60;
export const RULES_VERSION = 'combat-v2a' as const;
const MAX_STAMINA = 100;
const STAMINA_REGEN = 38 / TICK_RATE;
const STAMINA_DELAY = 26;
const PERFECT_GUARD_WINDOW = 6;
export const HEAVY_CHARGE_TICKS = 28;
const GUARD_BREAK_STUN = 44;
const ATTACK_FRAME: Record<AttackKind, { windup: number; active: number; recover: number; cost: number; damage: number }> = {
  light: { windup: 7, active: 10, recover: 10, cost: 19, damage: 10 },
  heavy: { windup: 14, active: 9, recover: 20, cost: 36, damage: 20 },
};
const clamp = (x: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Number.isFinite(x) ? x : 0));
const round = (x: number): number => Math.round(x * 100000) / 100000;

function combatant(definition: FighterDefinition, z: number): Combatant {
  validateStats(definition.stats);
  if (!definition.id || definition.revision < 1) throw new Error('Invalid fighter identity');
  return {
    definition, hp: definition.stats.maxHp, stamina: MAX_STAMINA,
    x: 0, z, faceX: 0, faceZ: z > 0 ? -1 : 1,
    stunTicks: 0, cooldownTicks: 0, regenDelayTicks: 0, guardStartTick: -99999, perfectGuardCooldownTicks: 0,
    guardHeld: false, attackHeldPrev: false, chargeTicks: 0, attack: null,
  };
}
export function createMatch(p1: FighterDefinition, p2: FighterDefinition, seed: number, seconds = 90): MatchState {
  if (p1.balanceVersion !== p2.balanceVersion) throw new Error('Balance version mismatch');
  if (seconds < 10 || seconds > 300) throw new Error('Unsupported round duration');
  return {
    rulesVersion: RULES_VERSION, tick: 0, maxTicks: Math.round(seconds * TICK_RATE),
    phase: 'playing', winner: null, seed: seed >>> 0,
    p1: combatant(p1, 1.35), p2: combatant(p2, -1.35),
  };
}
function validateCommand(c: Command): Command {
  return {
    moveX: clamp(c.moveX, -1, 1), moveZ: clamp(c.moveZ, -1, 1),
    attackHeld: c.attackHeld === true, guardHeld: c.guardHeld === true,
  };
}
function startAttack(f: Combatant, kind: AttackKind, side: Side, tick: number, events: GameEvent[]): void {
  const frame = ATTACK_FRAME[kind];
  if (f.attack || f.stunTicks > 0 || f.cooldownTicks > 0 || f.guardHeld || f.stamina < frame.cost) return;
  f.stamina -= frame.cost;
  f.regenDelayTicks = STAMINA_DELAY;
  f.attack = { kind, age: 0, connected: false };
  events.push({ tick, type: 'attack_started', actor: side });
}
function applyCommand(f: Combatant, cmd: Command, side: Side, tick: number, events: GameEvent[]): void {
  const c = validateCommand(cmd);
  if (f.stunTicks > 0) f.stunTicks--;
  if (f.cooldownTicks > 0) f.cooldownTicks--;
  if (f.regenDelayTicks > 0) f.regenDelayTicks--;
  if (f.perfectGuardCooldownTicks > 0) f.perfectGuardCooldownTicks--;
  const able = f.stunTicks <= 0 && !f.attack;
  const nextGuard = c.guardHeld && able && !c.attackHeld;
  if (nextGuard && !f.guardHeld) f.guardStartTick = tick;
  f.guardHeld = nextGuard;

  if (c.attackHeld && !f.attackHeldPrev) f.chargeTicks = 0;
  if (c.attackHeld && able && !f.guardHeld) f.chargeTicks++;
  if (!c.attackHeld && f.attackHeldPrev) {
    const kind: AttackKind = f.chargeTicks >= HEAVY_CHARGE_TICKS ? 'heavy' : 'light';
    startAttack(f, kind, side, tick, events);
    f.chargeTicks = 0;
  }
  f.attackHeldPrev = c.attackHeld;

  if (f.regenDelayTicks === 0 && !f.attack)
    f.stamina = Math.min(MAX_STAMINA, f.stamina + STAMINA_REGEN * (f.guardHeld ? 0.2 : 1));

  const mag = Math.hypot(c.moveX, c.moveZ);
  const speed = 2.75 * f.definition.stats.speed * (f.guardHeld ? 0.46 : 1);
  const factor = f.stunTicks > 0 ? 0 : mag > 1 ? 1 / mag : 1;
  f.x = round(f.x + c.moveX * factor * speed / TICK_RATE);
  f.z = round(f.z + c.moveZ * factor * speed / TICK_RATE);
  const len = Math.hypot(f.x, f.z);
  if (len > 3.75) { f.x = round(f.x / len * 3.75); f.z = round(f.z / len * 3.75); }
}
function separate(a: Combatant, b: Combatant): void {
  let dx = b.x - a.x, dz = b.z - a.z;
  let dist = Math.hypot(dx, dz);
  if (dist < 0.00001) { dx = 1; dz = 0; dist = 1; }
  const needed = a.definition.stats.radius + b.definition.stats.radius;
  if (dist < needed) {
    const push = (needed - dist) / 2;
    a.x = round(a.x - push * dx / dist); a.z = round(a.z - push * dz / dist);
    b.x = round(b.x + push * dx / dist); b.z = round(b.z + push * dz / dist);
  }
}
function face(a: Combatant, b: Combatant): void {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  if (len > 0.00001) { a.faceX = round(dx / len); a.faceZ = round(dz / len); }
}
function resolveHit(a: Combatant, b: Combatant, actor: Side, tick: number, events: GameEvent[]): void {
  if (!a.attack || a.attack.connected) return;
  const frame = ATTACK_FRAME[a.attack.kind];
  const age = a.attack.age;
  if (age < frame.windup || age >= frame.windup + frame.active) return;
  const dx = b.x - a.x, dz = b.z - a.z;
  const distance = Math.hypot(dx, dz);
  if (distance > a.definition.stats.radius + b.definition.stats.radius + a.definition.stats.reach) return;
  const facing = (a.faceX * dx + a.faceZ * dz) / (distance || 1);
  if (facing < 0.25) return;
  a.attack.connected = true;
  const target: Side = actor === 'p1' ? 'p2' : 'p1';
  const raw = frame.damage * a.definition.stats.power / b.definition.stats.defense;
  const guarded = b.guardHeld && b.stunTicks === 0;
  if (guarded) {
    const perfect = b.perfectGuardCooldownTicks === 0 && tick - b.guardStartTick <= PERFECT_GUARD_WINDOW;
    if (perfect) {
      b.perfectGuardCooldownTicks = 48;
      a.stunTicks = Math.max(a.stunTicks, 12);
      events.push({ tick, type: 'perfect_guard', actor: target, target: actor });
      return;
    }
    b.stamina = Math.max(0, round(b.stamina - raw * (a.attack.kind === 'heavy' ? 2.8 : 1.9)));
    b.regenDelayTicks = STAMINA_DELAY;
    events.push({ tick, type: 'blocked', actor, target });
    if (b.stamina === 0) {
      b.guardHeld = false;
      b.stunTicks = GUARD_BREAK_STUN;
      events.push({ tick, type: 'guard_break', actor, target });
    }
    return;
  }
  const damage = Math.max(1, Math.round(raw));
  b.hp = Math.max(0, b.hp - damage);
  b.stunTicks = Math.max(b.stunTicks, a.attack.kind === 'heavy' ? 24 : 11);
  b.guardHeld = false;
  events.push({ tick, type: 'hit', actor, target, damage });
}
function advanceAttack(f: Combatant): void {
  if (!f.attack) return;
  f.attack.age++;
  const frame = ATTACK_FRAME[f.attack.kind];
  if (f.attack.age >= frame.windup + frame.active + frame.recover) {
    f.attack = null;
    f.cooldownTicks = 2;
  }
}
function setFinished(state: MatchState, winner: Winner, eventType: 'knockout' | 'timeout', events: GameEvent[]): void {
  state.phase = 'finished'; state.winner = winner;
  events.push({ tick: state.tick, type: eventType, actor: winner === 'p2' ? 'p2' : 'p1' });
  events.push({ tick: state.tick, type: 'round_finished', actor: winner === 'p2' ? 'p2' : 'p1' });
}
/** Mutates match by exactly ONE gameplay tick. Caller supplies both commands for replay parity. */
export function stepMatch(state: MatchState, p1cmd: Command, p2cmd: Command): TickResult {
  const events: GameEvent[] = [];
  if (state.phase === 'finished') return { state, events };
  state.tick++;
  applyCommand(state.p1, p1cmd, 'p1', state.tick, events);
  applyCommand(state.p2, p2cmd, 'p2', state.tick, events);
  separate(state.p1, state.p2);
  face(state.p1, state.p2); face(state.p2, state.p1);
  resolveHit(state.p1, state.p2, 'p1', state.tick, events);
  resolveHit(state.p2, state.p1, 'p2', state.tick, events);
  advanceAttack(state.p1); advanceAttack(state.p2);
  const p1Alive = state.p1.hp > 0, p2Alive = state.p2.hp > 0;
  if (!p1Alive || !p2Alive) {
    setFinished(state, !p1Alive && !p2Alive ? 'draw' : p1Alive ? 'p1' : 'p2', 'knockout', events);
  } else if (state.tick >= state.maxTicks) {
    const a = state.p1.hp / state.p1.definition.stats.maxHp;
    const b = state.p2.hp / state.p2.definition.stats.maxHp;
    setFinished(state, Math.abs(a - b) < 0.00001 ? 'draw' : a > b ? 'p1' : 'p2', 'timeout', events);
  }
  return { state, events };
}
