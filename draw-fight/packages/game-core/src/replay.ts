import { createMatch, stepMatch } from './engine.ts';
import type { Command, FighterDefinition, MatchState } from './types.ts';

export interface Replay {
  format: 'replay-v1';
  p1: FighterDefinition;
  p2: FighterDefinition;
  seed: number;
  seconds: number;
  /** One input pair per authoritative simulation tick. No client-reported score. */
  inputs: Array<readonly [Command, Command]>;
}
export function replayMatch(replay: Replay): MatchState {
  if (replay.inputs.length > replay.seconds * 60) throw new Error('Overlength replay');
  const state = createMatch(replay.p1, replay.p2, replay.seed, replay.seconds);
  for (const [p1, p2] of replay.inputs) {
    stepMatch(state, p1, p2);
    if (state.phase === 'finished') break;
  }
  return state;
}
