import type {
  GameItemDefinition,
  GameRunEventState,
  GameRunRewardChoice,
} from '../../shared/types';
import { getGameItemRarityStars, pickRandomGameItem } from './items';

export const TOTAL_GAME_LEVELS = 100;
export const BOSS_LEVEL_INTERVAL = 5;
export const NORMAL_MIN_ACCURACY = 85;
export const BOSS_MIN_ACCURACY = 95;
export const NORMAL_LEVEL_WORDS = 25;
export const BOSS_LEVEL_WORDS = 35;

export function isBossLevel(level: number) {
  return level % BOSS_LEVEL_INTERVAL === 0;
}

export function formatSpeedFromCpm(cpm: number, unit: 'wpm' | 'cpm' | 'cps') {
  if (unit === 'wpm') return `${Math.round(cpm / 5)}`;
  if (unit === 'cps') return `${+(cpm / 60).toFixed(1)}`;
  return `${Math.round(cpm)}`;
}

export function formatGameItemMeta(item: GameItemDefinition, equipped = false) {
  return `${getGameItemRarityStars(item.rarity)} · ${item.bossOnly ? 'только на боссах' : 'работает всегда'}${equipped ? ' · экипирован' : ''}`;
}

export function getRewardKindLabel(choice: GameRunRewardChoice) {
  if (choice.kind === 'simple') return 'Тихая реликвия';
  if (choice.kind === 'durable') return 'Нестабильный артефакт';
  return 'Печать мастера';
}

export function getEventKindLabel(kind: GameRunEventState['kind']) {
  if (kind === 'rest') return 'Передышка';
  if (kind === 'cache') return 'Тайник';
  if (kind === 'shop') return 'Лавка';
  return 'Риск';
}

export function buildBossRewardChoices(nextLetter: string | null): GameRunRewardChoice[] {
  const simpleItem = pickRandomGameItem('simple');
  const durableItem = pickRandomGameItem('durable');

  return [
    {
      id: 'reward-letter',
      kind: 'letter',
      title: 'Печать мастера',
      flavor: nextLetter ? `Пробуждает символ «${nextLetter.toUpperCase()}»` : 'Алфавит уже полностью открыт',
      description: nextLetter
        ? 'Навсегда открывает следующую букву для практики и игры.'
        : 'В этой раскладке больше нет закрытых символов.',
      letter: nextLetter,
      disabled: !nextLetter,
    },
    {
      id: `reward-simple-${simpleItem?.id ?? 'none'}`,
      kind: 'simple',
      title: 'Тихая реликвия',
      flavor: simpleItem?.name ?? 'Реликвии закончились',
      description: simpleItem?.description ?? 'Сейчас этот выбор недоступен.',
      itemId: simpleItem?.id,
      disabled: !simpleItem,
    },
    {
      id: `reward-durable-${durableItem?.id ?? 'none'}`,
      kind: 'durable',
      title: 'Нестабильный артефакт',
      flavor: durableItem?.name ?? 'Артефакты закончились',
      description: durableItem?.description ?? 'Сейчас этот выбор недоступен.',
      itemId: durableItem?.id,
      disabled: !durableItem,
    },
  ];
}
