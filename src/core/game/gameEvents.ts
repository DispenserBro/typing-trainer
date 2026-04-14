import type {
  GameEventKind,
  GameRunEventChoice,
  GameRunEventState,
  GameRunModifier,
} from '../../shared/types';
import { pickRandomGameItem } from './items';
import { PLAYER_BASE_HP, REGEN_HP_PER_BATTLE } from './battleSystem';

type CreateGameEventArgs = {
  level: number;
  lives: number;
  maxLives?: number;
  hasRepairTargets: boolean;
};

function createEventId(kind: GameEventKind, level: number) {
  return `${kind}-${level}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createModifier(
  id: string,
  name: string,
  description: string,
  remainingLevels: number,
  extras?: Partial<Omit<GameRunModifier, 'id' | 'name' | 'description' | 'remainingLevels'>>,
): GameRunModifier {
  return { id, name, description, remainingLevels, ...extras };
}

function createChoice(
  id: string,
  title: string,
  flavor: string,
  description: string,
  effect: GameRunEventChoice['effect'],
  disabled = false,
): GameRunEventChoice {
  return { id, title, flavor, description, effect, disabled };
}

/**
 * Случайно выбирает `n` элементов из пула без повторений.
 * Если в пуле меньше `n` элементов — возвращает весь пул.
 */
function pickRandomChoices(pool: GameRunEventChoice[], n: number): GameRunEventChoice[] {
  if (pool.length <= n) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function createRestEvent({ level, lives, hasRepairTargets, maxLives: rawMaxLives }: CreateGameEventArgs): GameRunEventState {
  const maxLives = rawMaxLives ?? PLAYER_BASE_HP;
  const canHeal = lives < maxLives;

  const pool: GameRunEventChoice[] = [
    createChoice(
      'rest-heal',
      'Глоток воздуха',
      canHeal ? 'Восстановить часть здоровья' : 'Здоровье уже полно',
      canHeal ? 'Восстанавливает 20 HP.' : 'Сейчас это не даст эффекта.',
      { lifeDelta: canHeal ? 20 : 0 },
      !canHeal,
    ),
    createChoice(
      'rest-full-heal',
      'Целебный покой',
      canHeal ? 'Полностью восстановить здоровье' : 'Здоровье уже полно',
      canHeal ? 'Восстанавливает здоровье до максимума.' : 'Сейчас это не даст эффекта.',
      { fullHeal: canHeal },
      !canHeal,
    ),
    createChoice(
      'rest-max-hp',
      'Закалка духа',
      'Увеличить запас здоровья на 10',
      'Навсегда добавляет +10 к максимальному запасу HP.',
      { maxLifeDelta: 10 },
    ),
    createChoice(
      'rest-regen',
      'Мантра восстановления',
      'Регенерация после каждого боя',
      `На следующие 3 боя: восстанавливает ${REGEN_HP_PER_BATTLE} HP после каждого уровня.`,
      { regenTurns: 3 },
    ),
    createChoice(
      'rest-repair',
      'Полевой ремонт',
      hasRepairTargets ? 'Подкрутить экипировку перед следующим боем' : 'Чинить пока нечего',
      hasRepairTargets ? 'Восстанавливает 2 прочности всем экипированным предметам.' : 'Ни один экипированный предмет не нуждается в ремонте.',
      { repairEquippedBy: hasRepairTargets ? 2 : 0 },
      !hasRepairTargets,
    ),
    createChoice(
      'rest-focus',
      'Ровный вдох',
      'Поймать спокойный темп перед следующими уровнями',
      'На 2 уровня снижает требования к скорости на 4% и к точности на 2%.',
      {
        modifier: createModifier(
          'rest-focus',
          'Ровный вдох',
          '-4% к скорости и -2% к точности на 2 уровня',
          2,
          { speedRequirementReductionPercent: 4, accuracyRequirementReduction: 2 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('rest', level),
    kind: 'rest',
    title: 'Передышка у костра',
    description: 'Небольшая пауза между волнами. Выбери, как провести время у костра — каждый выбор влияет на твоё путешествие.',
    sourceLevel: level,
    choices: pickRandomChoices(pool, 3),
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createCacheEvent({ level }: CreateGameEventArgs): GameRunEventState {
  const simpleItem = pickRandomGameItem('simple');
  const durableItem = pickRandomGameItem('durable');
  const simpleItem2 = pickRandomGameItem('simple');
  const durableItem2 = pickRandomGameItem('durable');

  const pool: GameRunEventChoice[] = [
    createChoice(
      'cache-simple',
      'Взять реликвию',
      simpleItem ? simpleItem.name : 'Реликвий не осталось',
      simpleItem ? simpleItem.description : 'Сейчас этот выбор недоступен.',
      { grantItemId: simpleItem?.id ?? null },
      !simpleItem,
    ),
    createChoice(
      'cache-durable',
      'Поднять артефакт',
      durableItem ? durableItem.name : 'Артефактов не осталось',
      durableItem ? `${durableItem.description} Придется следить за прочностью.` : 'Сейчас этот выбор недоступен.',
      { grantItemId: durableItem?.id ?? null },
      !durableItem,
    ),
    createChoice(
      'cache-simple-2',
      'Ещё одна реликвия',
      simpleItem2 ? simpleItem2.name : 'Реликвий не осталось',
      simpleItem2 ? simpleItem2.description : 'Сейчас этот выбор недоступен.',
      { grantItemId: simpleItem2?.id ?? null },
      !simpleItem2,
    ),
    createChoice(
      'cache-durable-2',
      'Редкий артефакт',
      durableItem2 ? durableItem2.name : 'Артефактов не осталось',
      durableItem2 ? `${durableItem2.description} Придется следить за прочностью.` : 'Сейчас этот выбор недоступен.',
      { grantItemId: durableItem2?.id ?? null },
      !durableItem2,
    ),
    createChoice(
      'cache-clock',
      'Карман времени',
      'Спрятать запас секунд до ближайшего босса',
      'Даёт +4 секунды к таймеру босса на следующие 4 уровня.',
      {
        modifier: createModifier(
          'cache-clock',
          'Карман времени',
          '+4 сек. к таймеру босса на 4 уровня',
          4,
          { bossOnly: true, bossTimerBonusSeconds: 4 },
        ),
      },
    ),
    createChoice(
      'cache-speed-gem',
      'Камень скорости',
      'Временно снизить требования к скорости',
      'На 3 уровня требуемая скорость снижается на 8%.',
      {
        modifier: createModifier(
          'cache-speed-gem',
          'Камень скорости',
          '-8% к требуемой скорости на 3 уровня',
          3,
          { speedRequirementReductionPercent: 8 },
        ),
      },
    ),
    createChoice(
      'cache-accuracy-gem',
      'Камень точности',
      'Временно снизить требования к точности',
      'На 3 уровня требуемая точность снижается на 4%.',
      {
        modifier: createModifier(
          'cache-accuracy-gem',
          'Камень точности',
          '-4% к требуемой точности на 3 уровня',
          3,
          { accuracyRequirementReduction: 4 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('cache', level),
    kind: 'cache',
    title: 'Тайник на обочине',
    description: 'Ты находишь запас припасов и артефактов. Можно забрать готовую реликвию или подготовиться к ближайшему боссу.',
    sourceLevel: level,
    choices: pickRandomChoices(pool, 3),
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createShopEvent({ level, hasRepairTargets }: CreateGameEventArgs): GameRunEventState {
  const simpleItem = pickRandomGameItem('simple') ?? pickRandomGameItem('durable');
  const simpleItem2 = pickRandomGameItem('simple') ?? pickRandomGameItem('durable');
  const durableItem = pickRandomGameItem('durable');

  const pool: GameRunEventChoice[] = [
    createChoice(
      'shop-repair',
      'Подтянуть крепления',
      hasRepairTargets ? 'Починить экипировку перед боем' : 'Чинить почти нечего',
      hasRepairTargets ? 'Восстанавливает 3 прочности всем экипированным предметам.' : 'Сейчас экипированные предметы почти не нуждаются в ремонте.',
      { repairEquippedBy: hasRepairTargets ? 3 : 0 },
      !hasRepairTargets,
    ),
    createChoice(
      'shop-item',
      'Снять с полки',
      simpleItem ? simpleItem.name : 'Полки опустели',
      simpleItem ? simpleItem.description : 'Сейчас эта витрина уже пуста.',
      { grantItemId: simpleItem?.id ?? null },
      !simpleItem,
    ),
    createChoice(
      'shop-item-2',
      'Особая находка',
      simpleItem2 ? simpleItem2.name : 'Полки опустели',
      simpleItem2 ? simpleItem2.description : 'Сейчас эта витрина уже пуста.',
      { grantItemId: simpleItem2?.id ?? null },
      !simpleItem2,
    ),
    createChoice(
      'shop-durable',
      'Фирменный товар',
      durableItem ? durableItem.name : 'Нет в наличии',
      durableItem ? `${durableItem.description} Требует регулярного обслуживания.` : 'Сейчас не в наличии.',
      { grantItemId: durableItem?.id ?? null },
      !durableItem,
    ),
    createChoice(
      'shop-buff',
      'Выпить боевой сироп',
      'Взять короткий буст до следующей серии уровней',
      'На 3 уровня снижает требования к скорости на 6% и добавляет 2 секунды к таймеру босса.',
      {
        modifier: createModifier(
          'shop-buff',
          'Боевой сироп',
          '-6% к скорости и +2 сек. к таймеру босса на 3 уровня',
          3,
          {
            speedRequirementReductionPercent: 6,
            bossTimerBonusSeconds: 2,
          },
        ),
      },
    ),
    createChoice(
      'shop-accuracy-tonic',
      'Тоник меткости',
      'Краткосрочный бонус к точности',
      'На 3 уровня снижает требования к точности на 5%.',
      {
        modifier: createModifier(
          'shop-accuracy-tonic',
          'Тоник меткости',
          '-5% к требуемой точности на 3 уровня',
          3,
          { accuracyRequirementReduction: 5 },
        ),
      },
    ),
    createChoice(
      'shop-timer-kit',
      'Набор хрономеханика',
      'Растянуть таймер следующих боссов',
      'На 5 уровней добавляет 3 секунды к таймеру босса.',
      {
        modifier: createModifier(
          'shop-timer-kit',
          'Набор хрономеханика',
          '+3 сек. к таймеру босса на 5 уровней',
          5,
          { bossOnly: true, bossTimerBonusSeconds: 3 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('shop', level),
    kind: 'shop',
    title: 'Лавка сборщика',
    description: 'В тесной лавке можно быстро перевести экипировку в порядок, ухватить одну реликвию или купить короткое усиление перед следующей волной.',
    sourceLevel: level,
    choices: pickRandomChoices(pool, 3),
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createRiskEvent({ level, lives, maxLives: rawMaxLives }: CreateGameEventArgs): GameRunEventState {
  const maxLives = rawMaxLives ?? PLAYER_BASE_HP;
  const lowLives = lives <= Math.max(10, Math.round(maxLives * 0.25));

  const riskChoice = (
    id: string, title: string, flavorOk: string, flavorLow: string, descOk: string, descLow: string,
    modId: string, modTitle: string, modDesc: string, modTurns: number, modBonuses: Parameters<typeof createModifier>[4],
  ): GameRunEventChoice => createChoice(
    id, title,
    lowLives ? flavorLow : flavorOk,
    lowLives ? descLow : descOk,
    {
      lifeDelta: lowLives ? 0 : -20,
      modifier: lowLives ? null : createModifier(modId, modTitle, modDesc, modTurns, modBonuses),
    },
    lowLives,
  );

  const pool: GameRunEventChoice[] = [
    riskChoice(
      'risk-overclock', 'Перегрузить темп',
      'Обменять здоровье на мощный рывок', 'Слишком опасно при низком здоровье',
      'Теряешь 20 HP, но на 2 уровня получаешь -12% к требуемой скорости.',
      'Этот выбор недоступен, пока здоровье слишком низкое.',
      'risk-overclock', 'Перегрузка', '-12% к требуемой скорости на 2 уровня', 2,
      { speedRequirementReductionPercent: 12 },
    ),
    riskChoice(
      'risk-focus', 'Сужение фокуса',
      'Снизить требования к точности ценой здоровья', 'Слишком опасно при низком здоровье',
      'Теряешь 20 HP, но на 2 уровня получаешь -6% к требуемой точности.',
      'Этот выбор недоступен, пока здоровье слишком низкое.',
      'risk-focus', 'Сужение фокуса', '-6% к требуемой точности на 2 уровня', 2,
      { accuracyRequirementReduction: 6 },
    ),
    riskChoice(
      'risk-boss', 'Рывок к боссу',
      'Пожертвовать здоровьем ради сильного бонуса на боссе', 'Слишком опасно при низком здоровье',
      'Теряешь 20 HP, но на 4 уровня получаешь -6% к скорости и +6 сек. к таймеру босса.',
      'Этот выбор недоступен, пока здоровье слишком низкое.',
      'risk-boss', 'Погоня за боссом', '-6% к скорости и +6 сек. к таймеру босса на 4 уровня', 4,
      { bossOnly: true, speedRequirementReductionPercent: 6, bossTimerBonusSeconds: 6 },
    ),
    riskChoice(
      'risk-blitz', 'Стремительный натиск',
      'Пожертвовать здоровьем ради долгого снижения скорости', 'Слишком опасно при низком здоровье',
      'Теряешь 20 HP, но на 5 уровней получаешь -8% к требуемой скорости.',
      'Этот выбор недоступен, пока здоровье слишком низкое.',
      'risk-blitz', 'Стремительный натиск', '-8% к требуемой скорости на 5 уровней', 5,
      { speedRequirementReductionPercent: 8 },
    ),
    riskChoice(
      'risk-aegis', 'Щит ценой крови',
      'Купить защиту от промахов ценой здоровья', 'Слишком опасно при низком здоровье',
      'Теряешь 20 HP, но на 3 уровня получаешь -8% к требуемой точности и +3 сек. к таймеру.',
      'Этот выбор недоступен, пока здоровье слишком низкое.',
      'risk-aegis', 'Щит ценой крови', '-8% к точности и +3 сек. к таймеру на 3 уровня', 3,
      { accuracyRequirementReduction: 8, bossTimerBonusSeconds: 3 },
    ),
  ];

  return {
    id: createEventId('risk', level),
    kind: 'risk',
    title: 'Сделка на грани',
    description: 'В странной комнате все предложения сильнее обычного, но каждое просит плату заранее. Здесь легко сорваться, но и награда чувствуется сразу.',
    sourceLevel: level,
    choices: pickRandomChoices(pool, 3),
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function shouldOfferGameEvent(level: number) {
  return level > 0 && level % 3 === 0 && level % 5 !== 0;
}

export function createCurseEvent({ level }: CreateGameEventArgs): GameRunEventState {
  const pool: GameRunEventChoice[] = [
    createChoice(
      'curse-speed',
      'Печать скорости',
      'Тебя будут гнать быстрее',
      'На 3 уровня требования к скорости повышаются на 5%.',
      {
        modifier: createModifier(
          'curse-speed',
          'Печать скорости',
          '+5% к требуемой скорости на 3 уровня',
          3,
          { speedRequirementReductionPercent: -5 },
        ),
      },
    ),
    createChoice(
      'curse-accuracy',
      'Печать точности',
      'Каждая ошибка станет дороже',
      'На 3 уровня требования к точности повышаются на 3%.',
      {
        modifier: createModifier(
          'curse-accuracy',
          'Печать точности',
          '+3% к требуемой точности на 3 уровня',
          3,
          { accuracyRequirementReduction: -3 },
        ),
      },
    ),
    createChoice(
      'curse-timer',
      'Печать времени',
      'Часы босса пойдут быстрее',
      'На 4 уровня таймер босса сокращается на 4 секунды.',
      {
        modifier: createModifier(
          'curse-timer',
          'Печать времени',
          '-4 сек. к таймеру босса на 4 уровня',
          4,
          { bossOnly: true, bossTimerBonusSeconds: -4 },
        ),
      },
    ),
    createChoice(
      'curse-silence',
      'Печать тишины',
      'Сбить руки с привычного ритма',
      'На 4 уровня требования к скорости повышаются на 3%, а к точности — на 2%.',
      {
        modifier: createModifier(
          'curse-silence',
          'Печать тишины',
          '+3% к скорости и +2% к точности на 4 уровня',
          4,
          { speedRequirementReductionPercent: -3, accuracyRequirementReduction: -2 },
        ),
      },
    ),
    createChoice(
      'curse-fog',
      'Печать тумана',
      'Боссы становятся более неуловимы',
      'На 5 уровней таймер босса сокращается на 3 секунды.',
      {
        modifier: createModifier(
          'curse-fog',
          'Печать тумана',
          '-3 сек. к таймеру босса на 5 уровней',
          5,
          { bossOnly: true, bossTimerBonusSeconds: -3 },
        ),
      },
    ),
    createChoice(
      'curse-wrath',
      'Печать гнева',
      'Враги становятся свирепее',
      'На 4 уровня атака всех врагов увеличивается на 6.',
      {
        modifier: createModifier(
          'curse-wrath',
          'Печать гнева',
          '+6 к атаке врагов на 4 уровня',
          4,
          { enemyAttackReduction: -6 },
        ),
      },
    ),
    createChoice(
      'curse-iron',
      'Печать стали',
      'Враги обретают непробиваемую защиту',
      'На 4 уровня защита всех врагов увеличивается на 6.',
      {
        modifier: createModifier(
          'curse-iron',
          'Печать стали',
          '+6 к защите врагов на 4 уровня',
          4,
          { enemyDefenseReduction: -6 },
        ),
      },
    ),
    createChoice(
      'curse-blind',
      'Печать слепоты',
      'Атаки становятся менее точными',
      'На 3 уровня бонус атаки игрока снижается на 8%.',
      {
        modifier: createModifier(
          'curse-blind',
          'Печать слепоты',
          '-8% к шансу попасть при атаке на 3 уровня',
          3,
          { playerAttackBonus: -8 },
        ),
      },
    ),
    createChoice(
      'curse-weakness',
      'Печать слабости',
      'Удары теряют силу',
      'На 3 уровня коэффициент урона снижается на 20%.',
      {
        modifier: createModifier(
          'curse-weakness',
          'Печать слабости',
          '-20% к коэффициенту урона на 3 уровня',
          3,
          { dmgCoeff: -0.2 },
        ),
      },
    ),
    createChoice(
      'curse-fragile',
      'Печать хрупкости',
      'Броня тает как лёд',
      'На 3 уровня коэффициент защиты снижается на 20%.',
      {
        modifier: createModifier(
          'curse-fragile',
          'Печать хрупкости',
          '-20% к коэффициенту защиты на 3 уровня',
          3,
          { defCoeff: -0.2 },
        ),
      },
    ),
    createChoice(
      'curse-unlucky',
      'Печать невезения',
      'Критические удары становятся редкостью',
      'На 4 уровня шанс крита снижается на 5%.',
      {
        modifier: createModifier(
          'curse-unlucky',
          'Печать невезения',
          '-5% к шансу крита на 4 уровня',
          4,
          { critBonus: -0.05 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('curse', level),
    kind: 'curse',
    title: 'Проклятье тени',
    description: 'Тёмная энергия сгущается вокруг. Выбери, какую печать принять — избежать проклятия нельзя.',
    sourceLevel: level,
    choices: pickRandomChoices(pool, 3),
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createGameEvent(args: CreateGameEventArgs): GameRunEventState {
  const weightedKinds: GameEventKind[] = [
    args.hasRepairTargets || args.lives < 3 ? 'rest' : 'cache',
    'cache',
    'risk',
  ];
  const kind = weightedKinds[Math.floor(Math.random() * weightedKinds.length)] ?? 'cache';

  if (kind === 'rest') return createRestEvent(args);
  if (kind === 'risk') return createRiskEvent(args);
  return createCacheEvent(args);
}
