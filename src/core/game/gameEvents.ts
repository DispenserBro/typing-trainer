import type {
  GameEventKind,
  GameRunEventChoice,
  GameRunEventState,
  GameRunModifier,
} from '../../shared/types';
import { pickRandomGameItem } from './items';

type CreateGameEventArgs = {
  level: number;
  lives: number;
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
  return {
    id,
    name,
    description,
    remainingLevels,
    ...extras,
  };
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

export function createRestEvent({ level, lives, hasRepairTargets }: CreateGameEventArgs): GameRunEventState {
  const canHeal = lives < 3;
  return {
    id: createEventId('rest', level),
    kind: 'rest',
    title: 'Передышка у костра',
    description: 'Небольшая пауза между волнами. Можно залатать снаряжение, перевести дух или поймать спокойный ритм на следующие уровни.',
    sourceLevel: level,
    choices: [
      createChoice(
        'rest-heal',
        'Глоток воздуха',
        canHeal ? 'Вернуть себе одну жизнь' : 'Жизни уже полны',
        canHeal ? 'Восстанавливает 1 жизнь.' : 'Сейчас это не даст эффекта.',
        { lifeDelta: canHeal ? 1 : 0 },
        !canHeal,
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
            {
              speedRequirementReductionPercent: 4,
              accuracyRequirementReduction: 2,
            },
          ),
        },
      ),
    ],
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createCacheEvent({ level }: CreateGameEventArgs): GameRunEventState {
  const simpleItem = pickRandomGameItem('simple');
  const durableItem = pickRandomGameItem('durable');

  return {
    id: createEventId('cache', level),
    kind: 'cache',
    title: 'Тайник на обочине',
    description: 'Ты находишь запас припасов и артефактов. Можно забрать готовую реликвию или подготовиться к ближайшему боссу.',
    sourceLevel: level,
    choices: [
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
    ],
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createShopEvent({ level, hasRepairTargets }: CreateGameEventArgs): GameRunEventState {
  const simpleItem = pickRandomGameItem('simple') ?? pickRandomGameItem('durable');

  return {
    id: createEventId('shop', level),
    kind: 'shop',
    title: 'Лавка сборщика',
    description: 'В тесной лавке можно быстро перевести экипировку в порядок, ухватить одну реликвию или купить короткое усиление перед следующей волной.',
    sourceLevel: level,
    choices: [
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
    ],
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function createRiskEvent({ level, lives }: CreateGameEventArgs): GameRunEventState {
  const lowLives = lives <= 1;

  return {
    id: createEventId('risk', level),
    kind: 'risk',
    title: 'Сделка на грани',
    description: 'В странной комнате все предложения сильнее обычного, но каждое просит плату заранее. Здесь легко сорваться, но и награда чувствуется сразу.',
    sourceLevel: level,
    choices: [
      createChoice(
        'risk-overclock',
        'Перегрузить темп',
        lowLives ? 'Слишком опасно при одной жизни' : 'Обменять жизнь на мощный рывок',
        lowLives ? 'Этот выбор недоступен, пока у тебя всего одна жизнь.' : 'Теряешь 1 жизнь, но на 2 уровня получаешь -12% к требуемой скорости.',
        {
          lifeDelta: lowLives ? 0 : -1,
          modifier: lowLives ? null : createModifier(
            'risk-overclock',
            'Перегрузка',
            '-12% к требуемой скорости на 2 уровня',
            2,
            { speedRequirementReductionPercent: 12 },
          ),
        },
        lowLives,
      ),
      createChoice(
        'risk-focus',
        'Сужение фокуса',
        lowLives ? 'Слишком опасно при одной жизни' : 'Снизить требования к точности ценой одной жизни',
        lowLives ? 'Этот выбор недоступен, пока у тебя всего одна жизнь.' : 'Теряешь 1 жизнь, но на 2 уровня получаешь -6% к требуемой точности.',
        {
          lifeDelta: lowLives ? 0 : -1,
          modifier: lowLives ? null : createModifier(
            'risk-focus',
            'Сужение фокуса',
            '-6% к требуемой точности на 2 уровня',
            2,
            { accuracyRequirementReduction: 6 },
          ),
        },
        lowLives,
      ),
      createChoice(
        'risk-boss',
        'Рывок к боссу',
        lowLives ? 'Слишком опасно при одной жизни' : 'Пожертвовать жизнью ради сильного бонуса на боссе',
        lowLives ? 'Этот выбор недоступен, пока у тебя всего одна жизнь.' : 'Теряешь 1 жизнь, но на 4 уровня получаешь -6% к скорости и +6 сек. к таймеру босса.',
        {
          lifeDelta: lowLives ? 0 : -1,
          modifier: lowLives ? null : createModifier(
            'risk-boss',
            'Погоня за боссом',
            '-6% к скорости и +6 сек. к таймеру босса на 4 уровня',
            4,
            { bossOnly: true, speedRequirementReductionPercent: 6, bossTimerBonusSeconds: 6 },
          ),
        },
        lowLives,
      ),
    ],
    resolvedChoiceId: null,
    resultText: null,
  };
}

export function shouldOfferGameEvent(level: number) {
  return level > 0 && level % 3 === 0 && level % 5 !== 0;
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
