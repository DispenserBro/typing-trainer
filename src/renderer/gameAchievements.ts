import type { GameAchievementDefinition } from '../shared/types';

export const GAME_ACHIEVEMENT_CATALOG: GameAchievementDefinition[] = [
  {
    id: 'first-level',
    name: 'Первый шаг',
    description: 'Пройти первый уровень игрового режима.',
  },
  {
    id: 'first-boss',
    name: 'Разбитая корона',
    description: 'Победить первого босса на 5 уровне.',
  },
  {
    id: 'unlock-letter',
    name: 'Пробуждение знака',
    description: 'Открыть новую букву во время забега.',
  },
  {
    id: 'collect-item',
    name: 'Первая находка',
    description: 'Получить любой предмет после победы над боссом.',
  },
  {
    id: 'collect-durable-item',
    name: 'Хрупкая сила',
    description: 'Получить предмет с прочностью.',
  },
  {
    id: 'collect-top-rarity-item',
    name: 'Свет реликвии',
    description: 'Получить предмет максимальной редкости.',
  },
  {
    id: 'equip-item',
    name: 'Во всеоружии',
    description: 'Экипировать любой предмет.',
  },
  {
    id: 'full-top-rarity-loadout',
    name: 'Трон коллекционера',
    description: 'Заполнить все 3 слота предметами максимальной редкости.',
  },
  {
    id: 'boss-25',
    name: 'Страж четверти пути',
    description: 'Победить босса 25 уровня.',
  },
  {
    id: 'boss-50',
    name: 'Сердце бури',
    description: 'Победить босса 50 уровня.',
  },
  {
    id: 'boss-75',
    name: 'На краю выносливости',
    description: 'Победить босса 75 уровня.',
  },
  {
    id: 'game-complete',
    name: 'Повелитель ритма',
    description: 'Пройти все 100 уровней игрового режима.',
  },
];

export const GAME_ACHIEVEMENT_MAP = Object.fromEntries(
  GAME_ACHIEVEMENT_CATALOG.map(achievement => [achievement.id, achievement]),
) as Record<string, GameAchievementDefinition>;

export function getGameAchievementById(achievementId: string | null | undefined) {
  if (!achievementId) return null;
  return GAME_ACHIEVEMENT_MAP[achievementId] ?? null;
}
