import type {
  GameEquipmentSlot,
  GameInventoryItem,
  GameItemDefinition,
} from '../../shared/types';
import { GAME_EQUIPMENT_SLOTS } from './items';

export type InventoryEntry = GameInventoryItem & {
  meta: GameItemDefinition;
  broken: boolean;
  equippedIn: GameEquipmentSlot | null;
};

export type EquippedEntry = {
  slot: typeof GAME_EQUIPMENT_SLOTS[number];
  inventoryItem: InventoryEntry | null;
  meta: GameItemDefinition | null;
  broken: boolean;
};
