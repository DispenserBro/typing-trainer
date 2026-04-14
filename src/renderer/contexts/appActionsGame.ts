import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  GameAchievementDefinition,
  GameEquipmentSlot,
  GameInventoryItem,
  GameState,
  GameRunState,
  LayoutsData,
  Progress,
} from '../../shared/types';
import { GAME_ITEM_MAP, isBrokenInventoryItem } from '../../core/game/items';
import { PLAYER_BASE_HP } from '../../core/game/battleSystem';
import { createInventoryItemId } from './appDefaults';
import { getLayoutProgress, getNextUnlockableLetter } from './appProgress';
import { resolveGameState } from './appResolvers';

type PersistProgress = (next: Progress) => void;

type GameActionsArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  persistProgress: PersistProgress;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
  currentLayout: string;
  layouts: LayoutsData;
  achievementCatalog: GameAchievementDefinition[];
};

type GameEvent = {
  type:
    | 'GRANT_ITEM'
    | 'EQUIP_ITEM'
    | 'UNEQUIP_ITEM'
    | 'WEAR_EQUIPPED'
    | 'REPAIR_ITEMS'
    | 'RESET_INVENTORY'
    | 'RESET_PROGRESS'
    | 'RESET_CURRENT_RUN'
    | 'SAVE_CURRENT_RUN';
  slot?: GameEquipmentSlot;
  inventoryItemId?: string;
  itemId?: string;
  generatedItemId?: string;
  amount?: number;
  clearItems?: boolean;
  passed?: boolean;
  isBoss?: boolean;
  run?: GameRunState | null;
  onlyEquipped?: boolean;
};

type GameEventResult = {
  brokenItemIds?: string[];
  repairedNames?: string[];
  changed: boolean;
  nextGame: GameState | null;
};

const EQUIPMENT_SLOTS: GameEquipmentSlot[] = ['slotA', 'slotB', 'slotC'];

const createEmptyEquippedState = (): GameState['equipped'] => ({
  slotA: null,
  slotB: null,
  slotC: null,
});

const cloneStringList = (value: unknown) => (Array.isArray(value) ? [...value].filter(Boolean).map(String) : []);

const normalizeCurrentRunState = (run: GameRunState | null | undefined): GameRunState | null => {
  if (!run) return null;
  return {
    level: Math.max(1, Math.floor(run.level || 1)),
    lives: Math.max(0, Math.floor(run.lives || 0)),
    maxLives: Math.max(1, Math.floor(run.maxLives || PLAYER_BASE_HP)),
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

const normalizeEquippedState = (
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

const isGameRunEqual = (left: GameRunState | null | undefined, right: GameRunState | null | undefined) => {
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

const isGameStateEqual = (left: GameState, right: GameState) => (
  left.highestLevel === right.highestLevel
  && isInventoryEqual(left.inventory, right.inventory)
  && isStringArrayEqual(left.discoveredItemIds, right.discoveredItemIds)
  && isStringArrayEqual(left.achievements, right.achievements)
  && isEquipmentEqual(left.equipped, right.equipped)
  && isGameRunEqual(left.currentRun ?? null, right.currentRun ?? null)
  && isGhostRunEqual(left.ghostRun ?? null, right.ghostRun ?? null)
  && isDailyRunEqual(left.dailyRun ?? null, right.dailyRun ?? null)
);

const normalizeGameState = (next: GameState): GameState => {
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

const getSafeCurrentRun = (run: GameRunState | null | undefined): GameRunState | null => normalizeCurrentRunState(run);

const readGameState = (progress: Progress): GameState => {
  const resolved = resolveGameState(progress);
  const normalized = normalizeGameState(resolved);
  return normalized;
};

const applyEquipItem = (game: GameState, slot: GameEquipmentSlot, inventoryItemId: string) => {
  const entry = game.inventory.find(candidate => candidate.id === inventoryItemId);
  if (!entry || isBrokenInventoryItem(entry)) return null;
  if (!GAME_ITEM_MAP[entry.itemId]) return null;

  const equipped = { ...game.equipped };
  for (const candidateSlot of EQUIPMENT_SLOTS) {
    if (equipped[candidateSlot] === inventoryItemId) {
      equipped[candidateSlot] = null;
    }
  }

  equipped[slot] = inventoryItemId;
  const normalizedEquipped = normalizeEquippedState(equipped, game.inventory);
  if (isEquipmentEqual(game.equipped, normalizedEquipped)) return null;

  return {
    ...game,
    equipped: normalizedEquipped,
  };
};

const applyUnequipItem = (game: GameState, slot: GameEquipmentSlot) => {
  if (!game.equipped[slot]) return null;
  const next = {
    ...game.equipped,
    [slot]: null,
  };
  return {
    ...game,
    equipped: normalizeEquippedState(next, game.inventory),
  };
};

const applyInventoryEvent = (game: GameState, event: GameEvent): GameEventResult => {
  if (event.type === 'GRANT_ITEM') {
    const itemId = event.itemId;
    const item = itemId ? GAME_ITEM_MAP[itemId] : null;
    if (!item || !itemId) {
      return { changed: false, nextGame: null };
    }

    return {
      changed: true,
      nextGame: {
        ...game,
        inventory: [...game.inventory, {
          id: event.generatedItemId ?? createInventoryItemId(),
          itemId,
          durability: item.maxDurability ?? null,
          maxDurability: item.maxDurability ?? null,
        }],
        discoveredItemIds: Array.from(new Set([...game.discoveredItemIds, itemId])),
      },
    };
  }

  if (event.type === 'EQUIP_ITEM') {
    const { slot, inventoryItemId } = event;
    if (!slot || !inventoryItemId) return { changed: false, nextGame: null };
    const next = applyEquipItem(game, slot, inventoryItemId);
    if (!next) return { changed: false, nextGame: null };
    return { changed: true, nextGame: next };
  }

  if (event.type === 'UNEQUIP_ITEM') {
    const { slot } = event;
    if (!slot) return { changed: false, nextGame: null };
    const next = applyUnequipItem(game, slot);
    if (!next) return { changed: false, nextGame: null };
    return { changed: true, nextGame: next };
  }

  if (event.type === 'WEAR_EQUIPPED') {
    const isBoss = Boolean(event.isBoss);
    const passed = Boolean(event.passed);
    const equippedIds = new Set(Object.values(game.equipped).filter((value): value is string => Boolean(value)));
    let changed = false;
    const brokenItemIds: string[] = [];

    const inventory = game.inventory.map((item) => {
      if (!equippedIds.has(item.id)) return item;
      const definition = GAME_ITEM_MAP[item.itemId];
      if (!definition?.durabilityRules || item.maxDurability == null || item.durability == null) return item;
      if (definition.bossOnly && !isBoss) return item;

      const wear = isBoss
        ? (passed ? definition.durabilityRules.bossPass : definition.durabilityRules.bossFail)
        : (passed ? definition.durabilityRules.normalPass : definition.durabilityRules.normalFail);
      if (wear <= 0) return item;

      const nextDurability = Math.max(0, item.durability - wear);
      if (nextDurability !== item.durability) changed = true;
      if (nextDurability <= 0) brokenItemIds.push(item.id);
      return { ...item, durability: nextDurability };
    });

    const next = {
      ...game,
      inventory,
      equipped: normalizeEquippedState(game.equipped, inventory),
    };
    if (!changed) return { changed: false, nextGame: null };
    return {
      changed: true,
      brokenItemIds,
      nextGame: next,
    };
  }

  if (event.type === 'REPAIR_ITEMS') {
    const amount = Math.floor(event.amount ?? 0);
    const onlyEquipped = Boolean(event.onlyEquipped);
    const repairedNames = new Set<string>();
    let changed = false;
    const allowedIds = onlyEquipped
      ? new Set(Object.values(game.equipped).filter((value): value is string => Boolean(value)))
      : null;

    const inventory = game.inventory.map((item) => {
      if (allowedIds && !allowedIds.has(item.id)) return item;
      if (item.maxDurability == null || item.maxDurability <= 0 || item.durability == null) return item;
      const nextDurability = Math.min(item.maxDurability, item.durability + Math.max(0, amount));
      if (nextDurability === item.durability) return item;
      const definition = GAME_ITEM_MAP[item.itemId];
      if (definition) repairedNames.add(definition.name);
      changed = true;
      return { ...item, durability: nextDurability };
    });

    if (!changed) return { changed: false, nextGame: null };
    return {
      changed: true,
      repairedNames: Array.from(repairedNames),
      nextGame: {
        ...game,
        inventory,
      },
    };
  }

  if (event.type === 'RESET_INVENTORY') {
    return {
      changed: true,
      nextGame: {
        ...game,
        inventory: [],
        discoveredItemIds: [],
        equipped: createEmptyEquippedState(),
        currentRun: null,
      },
    };
  }

  if (event.type === 'RESET_PROGRESS') {
    return {
      changed: true,
      nextGame: {
        ...game,
        highestLevel: 1,
        inventory: [],
        discoveredItemIds: [],
        achievements: [],
        equipped: createEmptyEquippedState(),
        currentRun: null,
      },
    };
  }

  if (event.type === 'RESET_CURRENT_RUN') {
    if (event.clearItems) {
      return {
        changed: true,
        nextGame: {
          ...game,
          inventory: [],
          discoveredItemIds: [],
          equipped: createEmptyEquippedState(),
          currentRun: null,
        },
      };
    }
    if (!game.currentRun) return { changed: false, nextGame: null };
    return {
      changed: true,
      nextGame: {
        ...game,
        currentRun: null,
      },
    };
  }

  if (event.type === 'SAVE_CURRENT_RUN') {
    const nextRun = getSafeCurrentRun(event.run);
    if (isGameRunEqual(game.currentRun ?? null, nextRun)) {
      return { changed: false, nextGame: null };
    }
    return {
      changed: true,
      nextGame: {
        ...game,
        currentRun: nextRun,
      },
    };
  }

  return { changed: false, nextGame: null };
};

export function createGameActions({
  setProgress,
  setGameState,
  persistProgress,
  progressRef,
  gameStateRef,
  currentLayout,
  layouts,
  achievementCatalog,
}: GameActionsArgs) {
  const achievementMap = Object.fromEntries(achievementCatalog.map(a => [a.id, a]));
  const persistProgressState = (next: Progress) => {
    progressRef.current = next;
    persistProgress(next);
  };

  const commitGameState = (nextGame: GameState) => {
    const normalizedGame = normalizeGameState(nextGame);
    gameStateRef.current = normalizedGame;
    setGameState(prev => (isGameStateEqual(prev, normalizedGame) ? prev : normalizedGame));
    setProgress(prev => {
      if (isGameStateEqual(readGameState(prev), normalizedGame)) return prev;
      const next = { ...prev, game: normalizedGame };
      persistProgressState(next);
      return next;
    });
    return normalizedGame;
  };

  const dispatchEvent = (event: GameEvent) => {
    const previousGame = gameStateRef.current ?? readGameState(progressRef.current);
    const nextResult = applyInventoryEvent(previousGame, event);
    if (!nextResult.changed || !nextResult.nextGame) {
      return { changed: false, nextGame: null };
    }

    const nextGame = commitGameState(nextResult.nextGame);
    if (isGameStateEqual(previousGame, nextGame)) {
      return { changed: false, nextGame: null };
    }

    return {
      ...nextResult,
      changed: true,
      nextGame,
    };
  };

  const saveCurrentGameRun = (run: GameRunState | null) => {
    const safeRun = getSafeCurrentRun(run);
    const currentGame = gameStateRef.current ?? readGameState(progressRef.current);
    if (isGameRunEqual(currentGame.currentRun ?? null, safeRun)) return;
    commitGameState({
      ...currentGame,
      currentRun: safeRun,
    });
  };

  const grantGameItem = (itemId: string) => {
    const item = GAME_ITEM_MAP[itemId];
    if (!item) return null;
    const generatedId = createInventoryItemId();
    const result = dispatchEvent({ type: 'GRANT_ITEM', itemId, generatedItemId: generatedId });
    return result.changed ? generatedId : null;
  };

  const equipGameItem = (slot: GameEquipmentSlot, inventoryItemId: string) => {
    const result = dispatchEvent({ type: 'EQUIP_ITEM', slot, inventoryItemId });
    return result.changed;
  };

  const unequipGameItem = (slot: GameEquipmentSlot) => {
    dispatchEvent({ type: 'UNEQUIP_ITEM', slot });
  };

  const wearEquippedGameItems = ({ passed, isBoss }: { passed: boolean; isBoss: boolean }) => {
    const result = dispatchEvent({ type: 'WEAR_EQUIPPED', passed, isBoss });
    return ('brokenItemIds' in result ? result.brokenItemIds : undefined) ?? [];
  };

  const repairGameItems = (amount: number, onlyEquipped = false) => {
    const result = dispatchEvent({ type: 'REPAIR_ITEMS', amount, onlyEquipped });
    return ('repairedNames' in result ? result.repairedNames : undefined) ?? [];
  };

  const resetGameInventory = () => {
    dispatchEvent({ type: 'RESET_INVENTORY' });
  };

  const resetGameProgress = () => {
    dispatchEvent({ type: 'RESET_PROGRESS' });
  };

  const clearCurrentGameRun = (destroyItems = false) => {
    dispatchEvent({ type: 'RESET_CURRENT_RUN', clearItems: destroyItems });
  };

  const saveGameState = (game: GameState) => {
    commitGameState(game);
  };

  const markGameLevelReached = (level: number) => {
    const game = gameStateRef.current ?? readGameState(progressRef.current);
    const normalizedLevel = Math.max(1, Math.floor(level || 1));
    if (normalizedLevel <= game.highestLevel) return;
    commitGameState({ ...game, highestLevel: normalizedLevel });
  };

  const peekNextGameLetter = () => getNextUnlockableLetter(progressRef.current, layouts, currentLayout);

  const unlockNextGameLetter = () => {
    const unlockedChar = getNextUnlockableLetter(progressRef.current, layouts, currentLayout);
    if (!unlockedChar) return null;

    setProgress(prev => {
      const next = { ...prev };
      const layoutProgress = getLayoutProgress(next, currentLayout);
      layoutProgress.unlocked += 1;
      layoutProgress.unlockProgress = 0;
      persistProgressState(next);
      return next;
    });

    return unlockedChar;
  };

  const unlockGameAchievements = (achievementIds: string[]) => {
    const currentProgress = progressRef.current;
    const game = readGameState(currentProgress);
    const knownAchievements = new Set(game.achievements);
    const unlocked: GameAchievementDefinition[] = [];

    for (const achievementId of achievementIds) {
      const achievement = achievementMap[achievementId];
      if (!achievement || knownAchievements.has(achievementId)) continue;
      knownAchievements.add(achievementId);
      unlocked.push(achievement);
    }

    if (!unlocked.length) return unlocked;

    const nextAchievements = Array.from(new Set([...game.achievements, ...unlocked.map(achievement => achievement.id)]));
    commitGameState({
      ...game,
      achievements: nextAchievements,
    });

    return unlocked;
  };

  return {
    saveGameState,
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    wearEquippedGameItems,
    repairGameItems,
    resetGameInventory,
    resetGameProgress,
    saveCurrentGameRun,
    clearCurrentGameRun,
    markGameLevelReached,
    peekNextGameLetter,
    unlockNextGameLetter,
    unlockGameAchievements,
  };
}
