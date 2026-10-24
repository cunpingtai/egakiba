import {
  ARENA_HP_DRAFT as draftConstants,
  applyArenaHp as applyRuntime,
  damageAmounts as damageRuntime,
  summarizeArenaHp as summarizeRuntime,
} from '../arena-hp-draft.mjs'

export const ARENA_HP_DRAFT = draftConstants
export const damageAmounts = damageRuntime as typeof import('../arena-hp-draft.mjs').damageAmounts
export const applyArenaHp = applyRuntime as typeof import('../arena-hp-draft.mjs').applyArenaHp
export const summarizeArenaHp = summarizeRuntime as typeof import('../arena-hp-draft.mjs').summarizeArenaHp
