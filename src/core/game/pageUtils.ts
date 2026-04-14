import type {
  GameEquipmentSlot,
  GameEquipmentState,
  GameInventoryItem,
  GameRunModifier,
  SpeedUnit,
} from '../../shared/types';
import { GAME_EQUIPMENT_SLOTS, getGameItemById, isBrokenInventoryItem } from './items';
import type { EquippedEntry, InventoryEntry } from './viewTypes';

export function buildEquippedBySlot(equipped: GameEquipmentState) {
  return Object.fromEntries(
    GAME_EQUIPMENT_SLOTS.map(slot => [slot.key, equipped[slot.key]]),
  ) as Record<GameEquipmentSlot, string | null>;
}

export function buildInventoryEntries(
  inventory: GameInventoryItem[],
  equipped: GameEquipmentState,
): InventoryEntry[] {
  return inventory
    .map(entry => {
      const meta = getGameItemById(entry.itemId);
      if (!meta) return null;
      const equippedIn = GAME_EQUIPMENT_SLOTS.find(slot => (
        equipped[slot.key] === entry.id
      ))?.key ?? null;
      return {
        ...entry,
        meta,
        broken: isBrokenInventoryItem(entry),
        equippedIn,
      };
    })
    .filter((entry): entry is InventoryEntry => Boolean(entry));
}

export function buildEquippedEntries(
  equippedBySlot: Record<GameEquipmentSlot, string | null>,
  inventoryItems: InventoryEntry[],
): EquippedEntry[] {
  return GAME_EQUIPMENT_SLOTS.map(slot => {
    const inventoryItemId = equippedBySlot[slot.key];
    const inventoryItem = inventoryItems.find(entry => entry.id === inventoryItemId) ?? null;
    return {
      slot,
      inventoryItem,
      meta: inventoryItem?.meta ?? null,
      broken: inventoryItem?.broken ?? false,
    };
  });
}

export function getHasRepairTargets(equippedItems: EquippedEntry[]) {
  return equippedItems.some(entry =>
    entry.inventoryItem
    && entry.inventoryItem.maxDurability != null
    && entry.inventoryItem.durability != null
    && entry.inventoryItem.durability < entry.inventoryItem.maxDurability,
  );
}

export function sumItemBonuses(equippedItems: EquippedEntry[], activeIsBoss: boolean) {
  return equippedItems.reduce((acc, entry) => {
    if (!entry.inventoryItem || !entry.meta || entry.broken) return acc;
    if (entry.meta.bossOnly && !activeIsBoss) return acc;
    acc.speedRequirementReductionPercent += entry.meta.speedRequirementReductionPercent ?? 0;
    acc.accuracyRequirementReduction += entry.meta.accuracyRequirementReduction ?? 0;
    acc.bossTimerBonusSeconds += entry.meta.bossTimerBonusSeconds ?? 0;
    acc.enemyAttackReduction += entry.meta.enemyAttackReduction ?? 0;
    acc.enemyDefenseReduction += entry.meta.enemyDefenseReduction ?? 0;
    acc.dodgeBonus += entry.meta.dodgeBonus ?? 0;
    acc.playerAttackBonus += entry.meta.playerAttackBonus ?? 0;
    acc.playerDamageBonus += entry.meta.playerDamageBonus ?? 0;
    acc.dmgCoeff += entry.meta.dmgCoeff ?? 0;
    acc.defCoeff += entry.meta.defCoeff ?? 0;
    acc.critBonus += entry.meta.critBonus ?? 0;
    return acc;
  }, {
    speedRequirementReductionPercent: 0,
    accuracyRequirementReduction: 0,
    bossTimerBonusSeconds: 0,
    enemyAttackReduction: 0,
    enemyDefenseReduction: 0,
    dodgeBonus: 0,
    playerAttackBonus: 0,
    playerDamageBonus: 0,
    dmgCoeff: 0,
    defCoeff: 0,
    critBonus: 0,
  });
}

export function sumModifierBonuses(activeModifiers: GameRunModifier[], activeIsBoss: boolean) {
  return activeModifiers.reduce((acc, modifier) => {
    if (modifier.bossOnly && !activeIsBoss) return acc;
    acc.speedRequirementReductionPercent += modifier.speedRequirementReductionPercent ?? 0;
    acc.accuracyRequirementReduction += modifier.accuracyRequirementReduction ?? 0;
    acc.bossTimerBonusSeconds += modifier.bossTimerBonusSeconds ?? 0;
    acc.enemyAttackReduction += modifier.enemyAttackReduction ?? 0;
    acc.enemyDefenseReduction += modifier.enemyDefenseReduction ?? 0;
    acc.dodgeBonus += modifier.dodgeBonus ?? 0;
    acc.playerAttackBonus += modifier.playerAttackBonus ?? 0;
    acc.playerDamageBonus += modifier.playerDamageBonus ?? 0;
    acc.dmgCoeff += modifier.dmgCoeff ?? 0;
    acc.defCoeff += modifier.defCoeff ?? 0;
    acc.critBonus += modifier.critBonus ?? 0;
    return acc;
  }, {
    speedRequirementReductionPercent: 0,
    accuracyRequirementReduction: 0,
    bossTimerBonusSeconds: 0,
    enemyAttackReduction: 0,
    enemyDefenseReduction: 0,
    dodgeBonus: 0,
    playerAttackBonus: 0,
    playerDamageBonus: 0,
    dmgCoeff: 0,
    defCoeff: 0,
    critBonus: 0,
  });
}

export function getTargetSpeedDisplay(targetSpeedCpm: number, unit: SpeedUnit) {
  return unit === 'wpm'
    ? Math.round(targetSpeedCpm / 5)
    : unit === 'cps'
      ? +(targetSpeedCpm / 60).toFixed(1)
      : Math.round(targetSpeedCpm);
}
