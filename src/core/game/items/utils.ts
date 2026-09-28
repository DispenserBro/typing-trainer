import type {
  GameInventoryItem,
  GameItemDefinition,
  GameItemRewardKind,
} from '../../../shared/types';
import { GAME_ITEM_MAP, GAME_ITEM_POOLS } from './catalog';

export function getGameItemById(itemId: string | null | undefined) {
  if (!itemId) return null;
  return GAME_ITEM_MAP[itemId] ?? null;
}

export function isDurableGameItem(item: GameItemDefinition | null | undefined) {
  return Boolean(item?.maxDurability && item.maxDurability > 0);
}

export function isBrokenInventoryItem(entry: GameInventoryItem) {
  return typeof entry.maxDurability === 'number'
    && entry.maxDurability > 0
    && typeof entry.durability === 'number'
    && entry.durability <= 0;
}

export function getGameItemRarityStars(rarity: GameItemDefinition['rarity']) {
  return `${'★'.repeat(rarity)}${'☆'.repeat(3 - rarity)}`;
}

export function pickRandomGameItem(kind: GameItemRewardKind, random: () => number = Math.random) {
  const pool = GAME_ITEM_POOLS[kind];
  if (!pool.length) return null;
  const weight = (item: GameItemDefinition) => [0, 6, 3, 1][item.rarity]!;
  let roll = random() * pool.reduce((sum, item) => sum + weight(item), 0);
  for (const item of pool) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return pool[pool.length - 1] ?? null;
}
