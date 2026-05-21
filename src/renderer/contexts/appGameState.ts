import type { GameEquipmentSlot, GameInventoryItem, GameRunState, GameState, Progress } from '../../shared/types';
import { GAME_ITEM_MAP } from '../../core/game/items/catalog';
import { isBrokenInventoryItem } from '../../core/game/items/utils';
import { PLAYER_BASE_HP } from '../../core/game/battleSystem';
import { createInventoryItemId } from './appDefaults';
import { resolveGameState } from './appResolvers';

const EQUIPMENT_SLOTS: GameEquipmentSlot[] = ['slotA', 'slotB', 'slotC'];

export const createEmptyEquippedState = (): GameState['equipped'] => ({
  slotA: null,
  slotB: null,
  slotC: null,
});

const cloneStringList = (value: unknown) => (Array.isArray(value) ? [...value].filter(Boolean).map(String) : []);

export const normalizeCurrentRunState = (run: GameRunState | null | undefined): GameRunState | null => {
  if (!run) return null;
  return {
    level: Math.max(1, Math.floor(run.level || 1)),
    lives: Math.max(0, Math.floor(run.lives || 0)),
    maxLives: Math.max(1, Math.floor(run.maxLives || PLAYER_BASE_HP)),
    damageTaken: Math.max(0, Math.floor(run.damageTaken || 0)),
    regenTurns: Math.max(0, Math.floor(run.regenTurns || 0)),
    completedLevels: Math.max(0, Math.floor(run.completedLevels || 0)),
    targetSpeedCpm: Math.max(1, Math.floor(run.targetSpeedCpm || 1)),
    levelText: typeof run.levelText === 'string' ? run.levelText : '',
    activeModifiers: Array.isArray(run.activeModifiers) ? run.activeModifiers.filter(Boolean) : [],
    map: run.map ?? null,
    pendingRoute: run.pendingRoute ?? null,
    pendingEvent: run.pendingEvent ?? null,
    result: run.result ?? null,
    rewardChoices: run.rewardChoices ?? null,
    selectedRewardMessage: run.selectedRewardMessage ?? null,
    battleState: run.battleState ?? null,
    dailySeed: typeof run.dailySeed === 'string' ? run.dailySeed : null,
  };
};

const normalizeInventoryItem = (entry: unknown, usedIds: Set<string>): GameInventoryItem | null => {
  if (!entry || typeof entry !== 'object') return null;
  const candidate = entry as Partial<GameInventoryItem> & { itemId?: string };
  if (typeof candidate.itemId !== 'string' || !GAME_ITEM_MAP[candidate.itemId]) return null;
  const itemId = candidate.itemId;
  let id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (!id || usedIds.has(id)) {
    id = createInventoryItemId();
  }
  usedIds.add(id);

  const definition = GAME_ITEM_MAP[itemId];
  const fallbackDurability = definition.maxDurability;
  const maxDurability = typeof candidate.maxDurability === 'number'
    ? Math.max(0, Math.floor(candidate.maxDurability))
    : fallbackDurability ?? null;

  let durability: number | null;
  if (maxDurability == null) {
    durability = null;
  } else {
    const rawDurability = typeof candidate.durability === 'number'
      ? Math.max(0, Math.floor(candidate.durability))
      : maxDurability;
    durability = Math.min(maxDurability, rawDurability);
  }

  return {
    id,
    itemId,
    durability,
    maxDurability,
  };
};

export const normalizeEquippedState = (
  equipped: GameState['equipped'],
  inventory: GameInventoryItem[],
) => {
  const validIds = new Set(
    inventory
      .filter(item => !isBrokenInventoryItem(item))
      .map(item => item.id),
  );
  const used = new Set<string>();

  const next = createEmptyEquippedState();
  for (const slot of EQUIPMENT_SLOTS) {
    const candidate = equipped?.[slot];
    if (!candidate || !validIds.has(candidate) || used.has(candidate)) continue;
    next[slot] = candidate;
    used.add(candidate);
  }
  return next;
};

const isStringArrayEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

const isInventoryEqual = (left: GameInventoryItem[], right: GameInventoryItem[]) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index]!.id !== right[index]!.id
      || left[index]!.itemId !== right[index]!.itemId
      || left[index]!.durability !== right[index]!.durability
      || left[index]!.maxDurability !== right[index]!.maxDurability
    ) {
      return false;
    }
  }
  return true;
};

const isEquipmentEqual = (left: GameState['equipped'], right: GameState['equipped']) => (
  left.slotA === right.slotA
  && left.slotB === right.slotB
  && left.slotC === right.slotC
);

export const isGameRunEqual = (left: GameRunState | null | undefined, right: GameRunState | null | undefined) => {
  const normalizedLeft = normalizeCurrentRunState(left);
  const normalizedRight = normalizeCurrentRunState(right);
  if (normalizedLeft === normalizedRight) return true;
  if (!normalizedLeft || !normalizedRight) return false;
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
};

const isGhostRunEqual = (left: GameState['ghostRun'], right: GameState['ghostRun']) => {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
};

const isDailyRunEqual = (left: GameState['dailyRun'], right: GameState['dailyRun']) => {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
};

export const isGameStateEqual = (left: GameState, right: GameState) => (
  left.highestLevel === right.highestLevel
  && isInventoryEqual(left.inventory, right.inventory)
  && isStringArrayEqual(left.discoveredItemIds, right.discoveredItemIds)
  && isStringArrayEqual(left.achievements, right.achievements)
  && isEquipmentEqual(left.equipped, right.equipped)
  && isGameRunEqual(left.currentRun ?? null, right.currentRun ?? null)
  && isGhostRunEqual(left.ghostRun ?? null, right.ghostRun ?? null)
  && isDailyRunEqual(left.dailyRun ?? null, right.dailyRun ?? null)
);

export const stabilizeGameState = (prev: GameState | null, next: GameState): GameState => {
  if (!prev) return next;
  if (isGameStateEqual(prev, next)) return prev;

  const ghostRunEqual = prev.ghostRun === next.ghostRun || JSON.stringify(prev.ghostRun) === JSON.stringify(next.ghostRun);
  const dailyRunEqual = prev.dailyRun === next.dailyRun || JSON.stringify(prev.dailyRun) === JSON.stringify(next.dailyRun);

  return {
    highestLevel: prev.highestLevel === next.highestLevel ? prev.highestLevel : next.highestLevel,
    inventory: isInventoryEqual(prev.inventory, next.inventory) ? prev.inventory : next.inventory,
    discoveredItemIds: isStringArrayEqual(prev.discoveredItemIds, next.discoveredItemIds)
      ? prev.discoveredItemIds
      : next.discoveredItemIds,
    achievements: isStringArrayEqual(prev.achievements, next.achievements)
      ? prev.achievements
      : next.achievements,
    equipped: isEquipmentEqual(prev.equipped, next.equipped) ? prev.equipped : next.equipped,
    currentRun: isGameRunEqual(prev.currentRun ?? null, next.currentRun ?? null) ? prev.currentRun : next.currentRun,
    ghostRun: ghostRunEqual ? prev.ghostRun : next.ghostRun,
    dailyRun: dailyRunEqual ? prev.dailyRun : next.dailyRun,
  };
};

export const normalizeGameState = (next: GameState): GameState => {
  const normalizedInventory = (() => {
    const usedIds = new Set<string>();
    const unique = [];
    for (const entry of next.inventory) {
      const normalized = normalizeInventoryItem(entry, usedIds);
      if (normalized) unique.push(normalized);
    }
    return unique;
  })();

  const normalizedGhostRun = next.ghostRun ? {
    date: typeof next.ghostRun.date === 'string' ? next.ghostRun.date : new Date().toISOString(),
    maxLevel: Math.max(0, Math.floor(next.ghostRun.maxLevel || 0)),
    levels: Array.isArray(next.ghostRun.levels)
      ? next.ghostRun.levels.map(level => ({
        level: Math.max(1, Math.floor(level.level || 1)),
        wpm: Math.max(0, level.wpm || 0),
        acc: Math.max(0, Math.min(100, level.acc || 0)),
        elapsed: Math.max(0, level.elapsed || 0),
        passed: Boolean(level.passed),
      }))
      : [],
  } : null;

  const normalizedDailyRun = next.dailyRun ? {
    history: typeof next.dailyRun.history === 'object' && next.dailyRun.history
      ? Object.fromEntries(
        Object.entries(next.dailyRun.history)
          .filter(([key, val]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && val && typeof val === 'object')
          .map(([key, val]) => [key, {
            date: typeof val.date === 'string' ? val.date : key,
            maxLevel: Math.max(0, Math.floor(val.maxLevel || 0)),
            completedLevels: Math.max(0, Math.floor(val.completedLevels || 0)),
            bestWpm: Math.max(0, val.bestWpm || 0),
            avgAcc: Math.max(0, Math.min(100, val.avgAcc || 0)),
            totalTime: Math.max(0, val.totalTime || 0),
            attempts: Math.max(0, Math.floor(val.attempts || 0)),
          }]),
      )
      : {},
  } : null;

  return {
    highestLevel: Math.max(1, Math.floor(next.highestLevel || 1)),
    inventory: normalizedInventory,
    discoveredItemIds: Array.from(new Set(cloneStringList(next.discoveredItemIds).filter(itemId => GAME_ITEM_MAP[itemId]))),
    achievements: Array.from(new Set(cloneStringList(next.achievements))),
    equipped: normalizeEquippedState(next.equipped ?? createEmptyEquippedState(), normalizedInventory),
    currentRun: normalizeCurrentRunState(next.currentRun),
    ghostRun: normalizedGhostRun,
    dailyRun: normalizedDailyRun,
  };
};

export const getSafeCurrentRun = (run: GameRunState | null | undefined): GameRunState | null => normalizeCurrentRunState(run);

export const readGameState = (progress: Progress): GameState => {
  const resolved = resolveGameState(progress);
  const normalized = normalizeGameState(resolved);
  return normalized;
};
