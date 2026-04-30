import type {
  GameEquipmentSlot,
  GameItemDefinition,
  GameMapNodeKind,
  GameRunEventState,
} from '../../../shared/types';
import { getGameItemRarityStars } from '../../../core/game/items';
import type { TranslationParams } from '../../../shared/types';

type Translate = (key: string, params?: TranslationParams) => string;

export function getGameEventKindLabel(kind: GameRunEventState['kind'], t: Translate) {
  if (kind === 'rest') return t('game.event.kind.rest');
  if (kind === 'cache') return t('game.event.kind.cache');
  if (kind === 'shop') return t('game.event.kind.shop');
  if (kind === 'curse') return t('game.event.kind.curse');
  return t('game.event.kind.risk');
}

export function getGameMapKindLabel(kind: GameMapNodeKind, t: Translate) {
  if (kind === 'boss') return t('game.map.kind.boss');
  if (kind === 'battle') return t('game.map.kind.battle');
  if (kind === 'rest') return t('game.map.kind.rest');
  if (kind === 'treasure') return t('game.map.kind.treasure');
  if (kind === 'shop') return t('game.map.kind.shop');
  if (kind === 'risk') return t('game.map.kind.risk');
  if (kind === 'elite') return t('game.map.kind.elite');
  return t('game.map.kind.miniboss');
}

export function getGameEquipmentSlotLabel(slot: GameEquipmentSlot, t: Translate) {
  if (slot === 'slotA') return t('game.inventory.slots.slotA');
  if (slot === 'slotB') return t('game.inventory.slots.slotB');
  return t('game.inventory.slots.slotC');
}

export function formatGameItemMetaText(item: GameItemDefinition, equipped: boolean, t: Translate) {
  return [
    getGameItemRarityStars(item.rarity),
    item.bossOnly ? t('game.inventory.meta.bossOnly') : t('game.inventory.meta.alwaysActive'),
    equipped ? t('game.inventory.meta.equipped') : null,
  ].filter(Boolean).join(' · ');
}
