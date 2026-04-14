import type {
  GameItemDefinition,
  GameRunEventState,
  GameRunModifier,
  GameRunRewardChoice,
} from '../../shared/types';
import { getGameItemRarityStars, pickRandomGameItem } from './items';
import { getBossArchetype, type BossArchetypeConfig } from './bossArchetypes';

function randomFromArray<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

export const TOTAL_GAME_LEVELS = 100;
export const BOSS_LEVEL_INTERVAL = 5;
export const NORMAL_MIN_ACCURACY = 85;
export const BOSS_MIN_ACCURACY = 95;
export const NORMAL_LEVEL_WORDS = 25;
export const BOSS_LEVEL_WORDS = 28;

export function isBossLevel(level: number) {
  return level % BOSS_LEVEL_INTERVAL === 0;
}

/** Get word count for a boss level, taking archetype multiplier into account. */
export function getBossWordCount(level: number): number {
  const archetype = getBossArchetype(level);
  return Math.round(BOSS_LEVEL_WORDS * archetype.wordCountMultiplier);
}

/** Get the effective min accuracy for a boss, with archetype extra accuracy applied. */
export function getBossMinAccuracy(level: number): number {
  const archetype = getBossArchetype(level);
  return BOSS_MIN_ACCURACY + archetype.extraAccuracy;
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
  if (choice.kind === 'event') return 'Событие';
  return 'Печать мастера';
}

export function getEventKindLabel(kind: GameRunEventState['kind']) {
  if (kind === 'rest') return 'Передышка';
  if (kind === 'cache') return 'Тайник';
  if (kind === 'shop') return 'Лавка';
  if (kind === 'curse') return 'Проклятие';
  return 'Риск';
}

/**
 * Boss reward pool — fully random selection of 3 rewards from a shared pool.
 * Pool includes: items (simple/durable), curses, buffs, letter unlock, extra HP.
 * Curses now appear as events in boss rewards, not as map nodes.
 */
export function buildBossRewardChoices(nextLetter: string | null, level: number): GameRunRewardChoice[] {
  const pool: GameRunRewardChoice[] = [];

  // ── Item rewards ──
  const simpleItem = pickRandomGameItem('simple');
  if (simpleItem) {
    pool.push({
      id: `reward-simple-${simpleItem.id}`,
      kind: 'simple',
      title: 'Тихая реликвия',
      flavor: simpleItem.name,
      description: simpleItem.description,
      itemId: simpleItem.id,
    });
  }
  const durableItem = pickRandomGameItem('durable');
  if (durableItem) {
    pool.push({
      id: `reward-durable-${durableItem.id}`,
      kind: 'durable',
      title: 'Нестабильный артефакт',
      flavor: durableItem.name,
      description: `${durableItem.description} Придется следить за прочностью.`,
      itemId: durableItem.id,
    });
  }
  // Second simple for variety
  const simpleItem2 = pickRandomGameItem('simple');
  if (simpleItem2 && simpleItem2.id !== simpleItem?.id) {
    pool.push({
      id: `reward-simple2-${simpleItem2.id}`,
      kind: 'simple',
      title: 'Тихая реликвия',
      flavor: simpleItem2.name,
      description: simpleItem2.description,
      itemId: simpleItem2.id,
    });
  }

  // ── Letter unlock ──
  if (nextLetter) {
    pool.push({
      id: 'reward-letter',
      kind: 'letter',
      title: 'Печать мастера',
      flavor: `Пробуждает символ «${nextLetter.toUpperCase()}»`,
      description: 'Навсегда открывает следующую букву для практики и игры.',
      letter: nextLetter,
    });
  }

  // ── Buff modifiers ──
  pool.push({
    id: 'reward-buff-speed',
    kind: 'event',
    title: 'Ускоритель темпа',
    flavor: 'Бонус к скорости на несколько уровней',
    description: 'На 3 уровня снижает требования к скорости на 6%.',
    effect: {
      modifier: {
        id: 'boss-buff-speed',
        name: 'Ускоритель темпа',
        description: '-6% к требуемой скорости на 3 уровня',
        remainingLevels: 3,
        speedRequirementReductionPercent: 6,
      },
    },
  });

  pool.push({
    id: 'reward-buff-defense',
    kind: 'event',
    title: 'Щит рассвета',
    flavor: 'Снижает атаку врагов',
    description: 'На 4 уровня снижает атаку врагов на 3.',
    effect: {
      modifier: {
        id: 'boss-buff-defense',
        name: 'Щит рассвета',
        description: '-3 к атаке врагов на 4 уровня',
        remainingLevels: 4,
        enemyAttackReduction: 3,
      },
    },
  });

  // ── Extra life ──
  pool.push({
    id: 'reward-extra-life',
    kind: 'event',
    title: 'Запасное сердце',
    flavor: '+10 к максимальному здоровью',
    description: 'Увеличивает максимальный запас HP на 10 и полностью восстанавливает его.',
    effect: { maxLifeDelta: 10, fullHeal: true },
  });

  // ── Curses (negative, but sometimes strong compensation) ──
  if (level >= 10) {
    pool.push({
      id: 'reward-curse-speed',
      kind: 'event',
      title: 'Печать скорости',
      flavor: 'Проклятие: требования к скорости растут',
      description: 'На 3 уровня требования к скорости повышаются на 5%, но мгновенно восстанавливает 20 HP.',
      effect: {
        lifeDelta: 20,
        modifier: {
          id: 'curse-speed',
          name: 'Печать скорости',
          description: '+5% к требуемой скорости на 3 уровня',
          remainingLevels: 3,
          speedRequirementReductionPercent: -5,
        },
      },
    });

    pool.push({
      id: 'reward-curse-defense',
      kind: 'event',
      title: 'Печать уязвимости',
      flavor: 'Проклятие: враги бьют точнее',
      description: 'На 4 уровня атака врагов +4, но получаете регенерацию на 4 боя.',
      effect: {
        regenTurns: 4,
        modifier: {
          id: 'curse-defense',
          name: 'Печать уязвимости',
          description: '+4 к атаке врагов на 4 уровня',
          remainingLevels: 4,
          enemyAttackReduction: -4,
        },
      },
    });
  }

  // Shuffle and pick 3 unique
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
