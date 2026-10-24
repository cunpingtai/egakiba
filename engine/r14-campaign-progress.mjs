/** R14 HOME PROGRESS — read-only projection of the active R10 native Rapier save.
 * Never migrates R9/V2 data or grants unlocks; stage progression uses the same
 * LEVEL_ORDER/isUnlocked contract as the battle screen.
 */
import { LEVEL_ORDER, isUnlocked } from './level-catalog.mjs';
import { loadArcadeSave } from './r10-arcade-save.mjs';

export const CAMPAIGN_STAGE_COUNT = LEVEL_ORDER.length;

export function readCampaignSnapshot(storage) {
  const { save, status } = loadArcadeSave(storage);
  const progress = save.progress;
  const finished = [];
  // Do not display phantom completion for an out-of-order or forged local entry.
  for (const id of LEVEL_ORDER) {
    if (!isUnlocked(id, progress) || !progress[id]) break;
    finished.push(id);
  }
  const clearedCount = finished.length;
  const allCleared = clearedCount === CAMPAIGN_STAGE_COUNT;
  const nextLevelId = allCleared ? LEVEL_ORDER.at(-1) : LEVEL_ORDER[clearedCount];
  const earnedStars = finished.reduce((total, id) => total + progress[id].stars, 0);
  return Object.freeze({
    saveStatus: status,
    available: status !== 'unavailable',
    hasProgress: clearedCount > 0,
    clearedCount,
    totalStages: CAMPAIGN_STAGE_COUNT,
    earnedStars,
    maxStars: CAMPAIGN_STAGE_COUNT * 3,
    nextLevelId,
    allCleared,
    lastGlyph: save.lastGlyph,
    stages: Object.freeze(LEVEL_ORDER.map((id, index) => Object.freeze({
      id,
      index: index + 1,
      stars: finished.includes(id) ? progress[id].stars : 0,
      bestSeconds: finished.includes(id) ? progress[id].bestSeconds : null,
      state: finished.includes(id) ? 'cleared' : id === nextLevelId && !allCleared ? 'next' : 'locked',
    }))),
  });
}
