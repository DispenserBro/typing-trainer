import { i18n } from '../i18n';
import type { GameAchievementDefinition } from '../../shared/types';

type AchievementDefinitionBase = Omit<GameAchievementDefinition, 'id' | 'name' | 'description'>;

function t(key: string): string {
  return i18n.t(key);
}

function createAchievementDefinition(
  id: string,
  base: AchievementDefinitionBase,
): GameAchievementDefinition {
  return {
    ...base,
    id,
    get name() {
      return t(`achievements.catalog.${id}.name`);
    },
    get description() {
      return t(`achievements.catalog.${id}.description`);
    },
  };
}

const GAME_ACHIEVEMENT_BASES: Record<string, AchievementDefinitionBase> = {
  'first-level': {
    category: 'game',
    conditions: [{ type: 'game.levelReached', level: 1 }],
  },
  'first-boss': {
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 5 }],
  },
  'unlock-letter': {
    category: 'game',
    conditions: [{ type: 'game.levelReached', level: 1 }],
  },
  'collect-item': {
    category: 'game',
    conditions: [{ type: 'game.itemCollected' }],
  },
  'collect-durable-item': {
    category: 'game',
    conditions: [{ type: 'game.durableItemCollected' }],
  },
  'collect-top-rarity-item': {
    category: 'game',
    conditions: [{ type: 'game.topRarityItemCollected' }],
  },
  'equip-item': {
    category: 'game',
    conditions: [{ type: 'game.itemEquipped' }],
  },
  'full-top-rarity-loadout': {
    category: 'game',
    conditions: [{ type: 'game.fullTopRarityLoadout' }],
  },
  'boss-25': {
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 25 }],
  },
  'boss-50': {
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 50 }],
  },
  'boss-75': {
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 75 }],
  },
  'game-complete': {
    category: 'game',
    conditions: [{ type: 'game.completed' }],
  },
  'practice-first-session': {
    category: 'practice',
    conditions: [{ type: 'practice.sessionCompleted' }],
  },
  'practice-unlock-letter': {
    category: 'practice',
    conditions: [{ type: 'practice.letterUnlocked' }],
  },
  'practice-10-sessions': {
    category: 'practice',
    conditions: [{ type: 'practice.sessionCompleted', totalSessions: { operator: '>=', value: 10 } }],
  },
  'lessons-first-complete': {
    category: 'lessons',
    conditions: [{ type: 'lessons.lessonCompleted' }],
  },
  'lessons-section-complete': {
    category: 'lessons',
    conditions: [{ type: 'lessons.sectionCompleted' }],
  },
  'lessons-all-complete': {
    category: 'lessons',
    conditions: [{ type: 'lessons.allCompleted' }],
  },
  'test-first-complete': {
    category: 'test',
    conditions: [{ type: 'test.completed' }],
  },
  'test-high-accuracy': {
    category: 'test',
    conditions: [{ type: 'test.completed', accuracy: { operator: '>=', value: 98 } }],
  },
  'test-speed-60': {
    category: 'test',
    conditions: [{ type: 'test.completed', wpm: { operator: '>=', value: 60 } }],
  },
};

export const GAME_ACHIEVEMENT_CATALOG: GameAchievementDefinition[] = Object.entries(
  GAME_ACHIEVEMENT_BASES,
).map(([id, base]) => createAchievementDefinition(id, base));

export const GAME_ACHIEVEMENT_MAP = Object.fromEntries(
  GAME_ACHIEVEMENT_CATALOG.map(achievement => [achievement.id, achievement]),
) as Record<string, GameAchievementDefinition>;
