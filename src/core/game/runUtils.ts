import type {
  GameItemDefinition,
  GameRunEventState,
  GameRunModifier,
  GameRunRewardChoice,
} from '../../shared/types';
import { getGameItemRarityStars, pickRandomGameItem } from './items';
import { getBossArchetype, type BossArchetypeConfig } from './bossArchetypes';
import { i18n, sanitizeTranslationParams } from '../i18n';

function randomFromArray<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function t(key: string, params?: Record<string, string | number>) {
  return i18n.t(key, sanitizeTranslationParams(params)) as string;
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
  return `${getGameItemRarityStars(item.rarity)} · ${item.bossOnly ? t('game.inventory.meta.bossOnly') : t('game.inventory.meta.alwaysActive')}${equipped ? ` · ${t('game.inventory.meta.equipped')}` : ''}`;
}

export function getRewardKindLabel(choice: GameRunRewardChoice) {
  if (choice.kind === 'simple') return t('game.reward.kind.simple');
  if (choice.kind === 'durable') return t('game.reward.kind.durable');
  if (choice.kind === 'event') return t('game.reward.kind.event');
  return t('game.reward.kind.letter');
}

export function getEventKindLabel(kind: GameRunEventState['kind']) {
  if (kind === 'rest') return t('game.event.kind.rest');
  if (kind === 'cache') return t('game.event.kind.cache');
  if (kind === 'shop') return t('game.event.kind.shop');
  if (kind === 'curse') return t('game.event.kind.curse');
  return t('game.event.kind.risk');
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
      title: t('game.core.rewards.simple.title'),
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
      title: t('game.core.rewards.durable.title'),
      flavor: durableItem.name,
      description: `${durableItem.description} ${t('game.core.rewards.durable.watchDurability')}`,
      itemId: durableItem.id,
    });
  }
  // Second simple for variety
  const simpleItem2 = pickRandomGameItem('simple');
  if (simpleItem2 && simpleItem2.id !== simpleItem?.id) {
    pool.push({
      id: `reward-simple2-${simpleItem2.id}`,
      kind: 'simple',
      title: t('game.core.rewards.simple.title'),
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
      title: t('game.core.rewards.letter.title'),
      flavor: t('game.core.rewards.letter.flavor', { letter: nextLetter.toUpperCase() }),
      description: t('game.core.rewards.letter.description'),
      letter: nextLetter,
    });
  }

  // ── Buff modifiers ──
  pool.push({
    id: 'reward-buff-speed',
    kind: 'event',
    title: t('game.core.rewards.buffSpeed.title'),
    flavor: t('game.core.rewards.buffSpeed.flavor'),
    description: t('game.core.rewards.buffSpeed.description'),
    effect: {
      modifier: {
        id: 'boss-buff-speed',
        name: t('game.core.rewards.buffSpeed.modifierTitle'),
        description: t('game.core.rewards.buffSpeed.modifierDescription'),
        remainingLevels: 3,
        speedRequirementReductionPercent: 6,
      },
    },
  });

  pool.push({
    id: 'reward-buff-defense',
    kind: 'event',
    title: t('game.core.rewards.buffDefense.title'),
    flavor: t('game.core.rewards.buffDefense.flavor'),
    description: t('game.core.rewards.buffDefense.description'),
    effect: {
      modifier: {
        id: 'boss-buff-defense',
        name: t('game.core.rewards.buffDefense.modifierTitle'),
        description: t('game.core.rewards.buffDefense.modifierDescription'),
        remainingLevels: 4,
        enemyAttackReduction: 3,
      },
    },
  });

  // ── Extra life ──
  pool.push({
    id: 'reward-extra-life',
    kind: 'event',
    title: t('game.core.rewards.extraLife.title'),
    flavor: t('game.core.rewards.extraLife.flavor'),
    description: t('game.core.rewards.extraLife.description'),
    effect: { maxLifeDelta: 10, fullHeal: true },
  });

  // ── Curses (negative, but sometimes strong compensation) ──
  if (level >= 10) {
    pool.push({
      id: 'reward-curse-speed',
      kind: 'event',
      title: t('game.core.rewards.curseSpeed.title'),
      flavor: t('game.core.rewards.curseSpeed.flavor'),
      description: t('game.core.rewards.curseSpeed.description'),
      effect: {
        lifeDelta: 20,
        modifier: {
          id: 'curse-speed',
          name: t('game.core.rewards.curseSpeed.modifierTitle'),
          description: t('game.core.rewards.curseSpeed.modifierDescription'),
          remainingLevels: 3,
          speedRequirementReductionPercent: -5,
        },
      },
    });

    pool.push({
      id: 'reward-curse-defense',
      kind: 'event',
      title: t('game.core.rewards.curseDefense.title'),
      flavor: t('game.core.rewards.curseDefense.flavor'),
      description: t('game.core.rewards.curseDefense.description'),
      effect: {
        regenTurns: 4,
        modifier: {
          id: 'curse-defense',
          name: t('game.core.rewards.curseDefense.modifierTitle'),
          description: t('game.core.rewards.curseDefense.modifierDescription'),
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
