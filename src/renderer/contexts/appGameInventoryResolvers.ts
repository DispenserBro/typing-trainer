import type { GameInventoryItem } from '../../shared/types';
import { GAME_ITEM_MAP } from '../../core/game/items';

function createLegacyInventoryItemId(itemId: string, entryIndex: number, duplicateIndex = 0) {
  return `legacy-${itemId}-${entryIndex}-${duplicateIndex}`;
}

export function normalizeGameInventoryEntry(entry: unknown, entryIndex: number): GameInventoryItem[] {
  if (!entry || typeof entry !== 'object') return [];
  const candidate = entry as Partial<GameInventoryItem> & { itemId?: string; count?: number };
  if (!candidate.itemId || !GAME_ITEM_MAP[candidate.itemId]) return [];

  const item = GAME_ITEM_MAP[candidate.itemId];
  const maxDurability = item.maxDurability ?? null;

  if (typeof candidate.id === 'string') {
    const savedMaxDurability = typeof candidate.maxDurability === 'number'
      ? Math.max(0, Math.floor(candidate.maxDurability))
      : maxDurability;
    const savedDurability = typeof candidate.durability === 'number'
      ? Math.max(0, Math.min(Math.floor(candidate.durability), savedMaxDurability ?? Number.MAX_SAFE_INTEGER))
      : savedMaxDurability;

    return [{
      id: candidate.id,
      itemId: candidate.itemId,
      durability: savedMaxDurability == null ? null : savedDurability,
      maxDurability: savedMaxDurability,
    }];
  }

  const count = typeof candidate.count === 'number' ? Math.max(1, Math.floor(candidate.count)) : 1;
  return Array.from({ length: count }, (_, duplicateIndex) => ({
    id: createLegacyInventoryItemId(candidate.itemId!, entryIndex, duplicateIndex),
    itemId: candidate.itemId!,
    durability: maxDurability,
    maxDurability,
  }));
}
