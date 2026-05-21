import type { MutableRefObject } from 'react';
import type {
  GameEquipmentSlot,
  GameInventoryItem,
  GameState,
  Progress,
} from '../../shared/types';
import { GAME_ITEM_MAP } from '../../core/game/items/catalog';
import { isBrokenInventoryItem } from '../../core/game/items/utils';
import { createInventoryItemId } from './appDefaults';
import {
  createEmptyEquippedState,
  isGameStateEqual,
  normalizeEquippedState,
  normalizeGameState,
  readGameState,
} from './appGameState';

type GameInventoryActionsArgs = {
  commitGameState: (nextGame: GameState) => GameState;
  progressRef: MutableRefObject<Progress>;
  gameStateRef: MutableRefObject<GameState>;
};

type GameInventoryEvent = {
  type:
    | 'GRANT_ITEM'
    | 'EQUIP_ITEM'
    | 'UNEQUIP_ITEM'
    | 'WEAR_EQUIPPED'
    | 'REPAIR_ITEMS'
    | 'RESET_INVENTORY';
  slot?: GameEquipmentSlot;
  inventoryItemId?: string;
  itemId?: string;
  generatedItemId?: string;
  amount?: number;
  passed?: boolean;
  isBoss?: boolean;
  onlyEquipped?: boolean;
};

type GameInventoryEventResult = {
  brokenItemIds?: string[];
  repairedNames?: string[];
  changed: boolean;
  nextGame: GameState | null;
};

const EQUIPMENT_SLOTS: GameEquipmentSlot[] = ['slotA', 'slotB', 'slotC'];

const isEquipmentEqual = (left: GameState['equipped'], right: GameState['equipped']) => (
  left.slotA === right.slotA
  && left.slotB === right.slotB
  && left.slotC === right.slotC
);

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

const applyInventoryEvent = (game: GameState, event: GameInventoryEvent): GameInventoryEventResult => {
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

  return { changed: false, nextGame: null };
};

export function createGameInventoryActions({
  commitGameState,
  progressRef,
  gameStateRef,
}: GameInventoryActionsArgs) {
  const dispatchEvent = (event: GameInventoryEvent) => {
    const previousGame = gameStateRef.current ?? readGameState(progressRef.current);
    const nextResult = applyInventoryEvent(previousGame, event);
    if (!nextResult.changed || !nextResult.nextGame) {
      return { changed: false, nextGame: null };
    }

    const nextGame = commitGameState(nextResult.nextGame);
    if (isGameStateEqual(previousGame, normalizeGameState(nextGame))) {
      return { changed: false, nextGame: null };
    }

    return {
      ...nextResult,
      changed: true,
      nextGame,
    };
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

  return {
    grantGameItem,
    equipGameItem,
    unequipGameItem,
    wearEquippedGameItems,
    repairGameItems,
    resetGameInventory,
  };
}
