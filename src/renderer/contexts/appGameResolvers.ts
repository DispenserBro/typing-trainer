import type { GameState, Progress } from '../../shared/types';
import { GAME_ACHIEVEMENT_MAP } from '../../core/game/gameAchievements';
import { GAME_ITEM_MAP, isBrokenInventoryItem } from '../../core/game/items';
import { defaultGameState } from './appDefaults';
import { normalizeGameInventoryEntry } from './appGameInventoryResolvers';
import {
  normalizeGameDailyRunState,
  normalizeGameGhostRun,
  normalizeSavedGameRunState,
} from './appGameSavedRunResolvers';

export {
  normalizeGameRunEventChoice,
  normalizeGameRunEventState,
  normalizeGameRunModifier,
  normalizeGameRunRouteChoice,
  normalizeGameRunRouteState,
} from './appGameRunResolvers';
export { normalizeGameInventoryEntry } from './appGameInventoryResolvers';
export {
  normalizeGameDailyRunState,
  normalizeGameGhostRun,
  normalizeSavedGameRunState,
} from './appGameSavedRunResolvers';

export function resolveGameState(progress: Progress): GameState {
  const base = defaultGameState(progress.game);
  const inventory = base.inventory
    .flatMap((entry, entryIndex) => normalizeGameInventoryEntry(entry, entryIndex))
    .filter(entry => GAME_ITEM_MAP[entry.itemId]);

  const discoveredItemIds = Array.from(new Set([
    ...base.discoveredItemIds.filter(itemId => GAME_ITEM_MAP[itemId]),
    ...inventory.map(entry => entry.itemId),
  ]));
  const achievements = Array.from(new Set(
    (base.achievements ?? []).filter(achievementId => GAME_ACHIEVEMENT_MAP[achievementId]),
  ));

  const usedInventoryIds = new Set<string>();
  const normalizeEquippedSlot = (value: string | null | undefined) => {
    if (!value) return null;

    const exactItem = inventory.find(entry => entry.id === value && !isBrokenInventoryItem(entry) && !usedInventoryIds.has(entry.id));
    if (exactItem) {
      usedInventoryIds.add(exactItem.id);
      return exactItem.id;
    }

    return null;
  };

  return {
    highestLevel: Math.max(1, Math.floor(base.highestLevel || 1)),
    inventory,
    discoveredItemIds,
    achievements,
    equipped: {
      slotA: normalizeEquippedSlot(base.equipped.slotA),
      slotB: normalizeEquippedSlot(base.equipped.slotB),
      slotC: normalizeEquippedSlot(base.equipped.slotC),
    },
    currentRun: normalizeSavedGameRunState(base.currentRun),
    ghostRun: normalizeGameGhostRun(base.ghostRun),
    dailyRun: normalizeGameDailyRunState(base.dailyRun),
  };
}
