import type { GameAchievementDefinition } from '../../shared/types';

export const GAME_ACHIEVEMENT_CATALOG: GameAchievementDefinition[] = [
  {
    id: 'first-level',
    name: 'Первый шаг',
    description: 'Пройти первый уровень игрового режима.',
    category: 'game',
    conditions: [{ type: 'game.levelReached', level: 1 }],
  },
  {
    id: 'first-boss',
    name: 'Разбитая корона',
    description: 'Победить первого босса на 5 уровне.',
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 5 }],
  },
  {
    id: 'unlock-letter',
    name: 'Пробуждение знака',
    description: 'Открыть новую букву во время забега.',
    category: 'game',
    conditions: [{ type: 'game.levelReached', level: 1 }],
  },
  {
    id: 'collect-item',
    name: 'Первая находка',
    description: 'Получить любой предмет после победы над боссом.',
    category: 'game',
    conditions: [{ type: 'game.itemCollected' }],
  },
  {
    id: 'collect-durable-item',
    name: 'Хрупкая сила',
    description: 'Получить предмет с прочностью.',
    category: 'game',
    conditions: [{ type: 'game.durableItemCollected' }],
  },
  {
    id: 'collect-top-rarity-item',
    name: 'Свет реликвии',
    description: 'Получить предмет максимальной редкости.',
    category: 'game',
    conditions: [{ type: 'game.topRarityItemCollected' }],
  },
  {
    id: 'equip-item',
    name: 'Во всеоружии',
    description: 'Экипировать любой предмет.',
    category: 'game',
    conditions: [{ type: 'game.itemEquipped' }],
  },
  {
    id: 'full-top-rarity-loadout',
    name: 'Трон коллекционера',
    description: 'Заполнить все 3 слота предметами максимальной редкости.',
    category: 'game',
    conditions: [{ type: 'game.fullTopRarityLoadout' }],
  },
  {
    id: 'boss-25',
    name: 'Страж четверти пути',
    description: 'Победить босса 25 уровня.',
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 25 }],
  },
  {
    id: 'boss-50',
    name: 'Сердце бури',
    description: 'Победить босса 50 уровня.',
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 50 }],
  },
  {
    id: 'boss-75',
    name: 'На краю выносливости',
    description: 'Победить босса 75 уровня.',
    category: 'game',
    conditions: [{ type: 'game.bossDefeated', level: 75 }],
  },
  {
    id: 'game-complete',
    name: 'Повелитель ритма',
    description: 'Пройти все 100 уровней игрового режима.',
    category: 'game',
    conditions: [{ type: 'game.completed' }],
  },

  // ── Практика ──────────────────────────────────────────
  {
    id: 'practice-first-session',
    name: 'Разминка',
    description: 'Завершить первую сессию практики.',
    category: 'practice',
    conditions: [{ type: 'practice.sessionCompleted' }],
  },
  {
    id: 'practice-unlock-letter',
    name: 'Новый горизонт',
    description: 'Открыть новую букву в практике.',
    category: 'practice',
    conditions: [{ type: 'practice.letterUnlocked' }],
  },
  {
    id: 'practice-10-sessions',
    name: 'Постоянство',
    description: 'Завершить 10 сессий практики.',
    category: 'practice',
    conditions: [{ type: 'practice.sessionCompleted', totalSessions: { operator: '>=', value: 10 } }],
  },

  // ── Уроки ─────────────────────────────────────────────
  {
    id: 'lessons-first-complete',
    name: 'Ученик',
    description: 'Завершить первый урок.',
    category: 'lessons',
    conditions: [{ type: 'lessons.lessonCompleted' }],
  },
  {
    id: 'lessons-section-complete',
    name: 'Глава закрыта',
    description: 'Завершить все уроки одной секции.',
    category: 'lessons',
    conditions: [{ type: 'lessons.sectionCompleted' }],
  },
  {
    id: 'lessons-all-complete',
    name: 'Выпускник',
    description: 'Завершить все уроки текущей раскладки.',
    category: 'lessons',
    conditions: [{ type: 'lessons.allCompleted' }],
  },

  // ── Тест ──────────────────────────────────────────────
  {
    id: 'test-first-complete',
    name: 'Проверка связи',
    description: 'Завершить первый тест скорости.',
    category: 'test',
    conditions: [{ type: 'test.completed' }],
  },
  {
    id: 'test-high-accuracy',
    name: 'Снайпер',
    description: 'Завершить тест с точностью 98% или выше.',
    category: 'test',
    conditions: [{ type: 'test.completed', accuracy: { operator: '>=', value: 98 } }],
  },
  {
    id: 'test-speed-60',
    name: 'Скоростной режим',
    description: 'Набрать 60 WPM или выше в тесте.',
    category: 'test',
    conditions: [{ type: 'test.completed', wpm: { operator: '>=', value: 60 } }],
  },
];

export const GAME_ACHIEVEMENT_MAP = Object.fromEntries(
  GAME_ACHIEVEMENT_CATALOG.map(achievement => [achievement.id, achievement]),
) as Record<string, GameAchievementDefinition>;
