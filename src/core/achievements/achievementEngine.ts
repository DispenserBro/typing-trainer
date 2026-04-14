import type { AchievementCondition, GameAchievementDefinition } from '../../shared/types';

/**
 * Событие, генерируемое игровыми режимами при изменении состояния.
 * Одно событие = один факт произошедшего действия.
 */
export type AchievementEvent = {
  type: string;
  [key: string]: any;
};

/** Проверяет одно условие против одного события по универсальным правилам сравнения. */
function conditionMet(condition: AchievementCondition, event: AchievementEvent): boolean {
  if (condition.type !== event.type && condition.type !== 'custom') return false;

  // Кастомные условия (через custom) мы не можем вычислить просто так, 
  // если только событие само не содержит достаточной информации для сравнения:
  if (condition.type === 'custom') {
    // Если мод передает customValidator в событии или что-то подобное,
    // но в сериализованном виде лучше сравнивать обычные поля.
    return false;
  }

  // Для всех остальных полей, кроме type, проверяем, удовлетворяет ли событие условию.
  // Поддерживаем проверку >, >=, <, <=, == через объект, 
  // либо просто "больше либо равно" для чисел (по-умолчанию как было в старых Achievements),
  // либо строгое равенство для других типов.
  for (const [key, expectedValue] of Object.entries(condition)) {
    if (key === 'type') continue;
    
    // Специальная обработка для старых известных условий
    if (condition.type === 'practice.sessionsTotal' && key === 'count') {
       if (event.sessionsTotal < (expectedValue as number)) return false;
       continue;
    }
    if (condition.type === 'game.levelReached' && key === 'level') {
       if (event.level < (expectedValue as number)) return false;
       continue;
    }
    if (condition.type === 'game.bossDefeated' && key === 'level') {
       if (event.level < (expectedValue as number)) return false;
       continue;
    }
    
    // Новые универсальные проверки из сериализованных данных:
    if (expectedValue !== null && typeof expectedValue === 'object') {
       // Операторы сравнения, e.g. { operator: '>=', value: 5 }
       if ('operator' in expectedValue && 'value' in expectedValue) {
          const actualValue = event[key];
          switch (expectedValue.operator) {
            case '>': if (!(actualValue > expectedValue.value)) return false; break;
            case '>=': if (!(actualValue >= expectedValue.value)) return false; break;
            case '<': if (!(actualValue < expectedValue.value)) return false; break;
            case '<=': if (!(actualValue <= expectedValue.value)) return false; break;
            case '==': 
            case '===': if (actualValue !== expectedValue.value) return false; break;
            case '!=': 
            case '!==': if (actualValue === expectedValue.value) return false; break;
            default: return false;
          }
       }
    } else {
       // Простое строгое равенство или неявное больше-или-равно для старых API 
       const actualValue = event[key];
       if (actualValue === undefined) return false;
       
       if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
          // Если это число, по умолчанию считаем как "не меньше" для совместимости
          // если нужна точная логика, моды должны использовать operator object
          if (actualValue < expectedValue) return false;
       } else if (actualValue !== expectedValue) {
          return false;
       }
    }
  }

  return true;
}

/**
 * Проверяет весь каталог достижений против одного события.
 * Возвращает массив ID достижений, которые стали разблокированы.
 */
export function checkAchievements(
  catalog: GameAchievementDefinition[],
  unlockedIds: ReadonlySet<string>,
  event: AchievementEvent,
): string[] {
  const newlyUnlocked: string[] = [];

  for (const achievement of catalog) {
    if (unlockedIds.has(achievement.id)) continue;

    const { conditions } = achievement;
    if (!conditions || conditions.length === 0) continue;

    // Все условия должны быть выполнены (AND-логика).
    const allMet = conditions.every(condition => conditionMet(condition, event));
    if (allMet) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}
