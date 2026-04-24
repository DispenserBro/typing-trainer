import type {
  GameEventKind,
  GameRunEventChoice,
  GameRunEventState,
  GameRunModifier,
} from '../../shared/types';
import { i18n, sanitizeTranslationParams } from '../i18n';
import { pickRandomGameItem } from './items';
import { PLAYER_BASE_HP, REGEN_HP_PER_BATTLE } from './battleSystem';

type CreateGameEventArgs = {
  level: number;
  lives: number;
  maxLives?: number;
  hasRepairTargets: boolean;
};

function t(key: string, params?: Record<string, string | number>) {
  return i18n.t(key, sanitizeTranslationParams(params)) as string;
}

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
      t('game.core.events.rest.heal.title'),
      canHeal ? t('game.core.events.rest.heal.flavorReady') : t('game.core.events.rest.common.fullHealth'),
      canHeal ? t('game.core.events.rest.heal.description') : t('game.core.events.rest.common.noEffect'),
      { lifeDelta: canHeal ? 20 : 0 },
      !canHeal,
    ),
    createChoice(
      'rest-full-heal',
      t('game.core.events.rest.fullHeal.title'),
      canHeal ? t('game.core.events.rest.fullHeal.flavorReady') : t('game.core.events.rest.common.fullHealth'),
      canHeal ? t('game.core.events.rest.fullHeal.description') : t('game.core.events.rest.common.noEffect'),
      { fullHeal: canHeal },
      !canHeal,
    ),
    createChoice(
      'rest-max-hp',
      t('game.core.events.rest.maxHp.title'),
      t('game.core.events.rest.maxHp.flavor'),
      t('game.core.events.rest.maxHp.description'),
      { maxLifeDelta: 10 },
    ),
    createChoice(
      'rest-regen',
      t('game.core.events.rest.regen.title'),
      t('game.core.events.rest.regen.flavor'),
      t('game.core.events.rest.regen.description', { hp: REGEN_HP_PER_BATTLE }),
      { regenTurns: 3 },
    ),
    createChoice(
      'rest-repair',
      t('game.core.events.rest.repair.title'),
      hasRepairTargets ? t('game.core.events.rest.repair.flavorReady') : t('game.core.events.rest.repair.flavorEmpty'),
      hasRepairTargets ? t('game.core.events.rest.repair.descriptionReady') : t('game.core.events.rest.repair.descriptionEmpty'),
      { repairEquippedBy: hasRepairTargets ? 2 : 0 },
      !hasRepairTargets,
    ),
    createChoice(
      'rest-focus',
      t('game.core.events.rest.focus.title'),
      t('game.core.events.rest.focus.flavor'),
      t('game.core.events.rest.focus.description'),
      {
        modifier: createModifier(
          'rest-focus',
          t('game.core.events.rest.focus.modifierTitle'),
          t('game.core.events.rest.focus.modifierDescription'),
          2,
          { speedRequirementReductionPercent: 4, accuracyRequirementReduction: 2 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('rest', level),
    kind: 'rest',
    title: t('game.core.events.rest.eventTitle'),
    description: t('game.core.events.rest.eventDescription'),
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
      t('game.core.events.cache.simple.title'),
      simpleItem ? simpleItem.name : t('game.core.events.cache.common.noRelics'),
      simpleItem ? simpleItem.description : t('game.core.events.cache.common.unavailable'),
      { grantItemId: simpleItem?.id ?? null },
      !simpleItem,
    ),
    createChoice(
      'cache-durable',
      t('game.core.events.cache.durable.title'),
      durableItem ? durableItem.name : t('game.core.events.cache.common.noArtifacts'),
      durableItem ? `${durableItem.description} ${t('game.core.events.cache.common.watchDurability')}` : t('game.core.events.cache.common.unavailable'),
      { grantItemId: durableItem?.id ?? null },
      !durableItem,
    ),
    createChoice(
      'cache-simple-2',
      t('game.core.events.cache.simple2.title'),
      simpleItem2 ? simpleItem2.name : t('game.core.events.cache.common.noRelics'),
      simpleItem2 ? simpleItem2.description : t('game.core.events.cache.common.unavailable'),
      { grantItemId: simpleItem2?.id ?? null },
      !simpleItem2,
    ),
    createChoice(
      'cache-durable-2',
      t('game.core.events.cache.durable2.title'),
      durableItem2 ? durableItem2.name : t('game.core.events.cache.common.noArtifacts'),
      durableItem2 ? `${durableItem2.description} ${t('game.core.events.cache.common.watchDurability')}` : t('game.core.events.cache.common.unavailable'),
      { grantItemId: durableItem2?.id ?? null },
      !durableItem2,
    ),
    createChoice(
      'cache-clock',
      t('game.core.events.cache.clock.title'),
      t('game.core.events.cache.clock.flavor'),
      t('game.core.events.cache.clock.description'),
      {
        modifier: createModifier(
          'cache-clock',
          t('game.core.events.cache.clock.modifierTitle'),
          t('game.core.events.cache.clock.modifierDescription'),
          4,
          { bossOnly: true, bossTimerBonusSeconds: 4 },
        ),
      },
    ),
    createChoice(
      'cache-speed-gem',
      t('game.core.events.cache.speedGem.title'),
      t('game.core.events.cache.speedGem.flavor'),
      t('game.core.events.cache.speedGem.description'),
      {
        modifier: createModifier(
          'cache-speed-gem',
          t('game.core.events.cache.speedGem.modifierTitle'),
          t('game.core.events.cache.speedGem.modifierDescription'),
          3,
          { speedRequirementReductionPercent: 8 },
        ),
      },
    ),
    createChoice(
      'cache-accuracy-gem',
      t('game.core.events.cache.accuracyGem.title'),
      t('game.core.events.cache.accuracyGem.flavor'),
      t('game.core.events.cache.accuracyGem.description'),
      {
        modifier: createModifier(
          'cache-accuracy-gem',
          t('game.core.events.cache.accuracyGem.modifierTitle'),
          t('game.core.events.cache.accuracyGem.modifierDescription'),
          3,
          { accuracyRequirementReduction: 4 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('cache', level),
    kind: 'cache',
    title: t('game.core.events.cache.eventTitle'),
    description: t('game.core.events.cache.eventDescription'),
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
      t('game.core.events.shop.repair.title'),
      hasRepairTargets ? t('game.core.events.shop.repair.flavorReady') : t('game.core.events.shop.repair.flavorEmpty'),
      hasRepairTargets ? t('game.core.events.shop.repair.descriptionReady') : t('game.core.events.shop.repair.descriptionEmpty'),
      { repairEquippedBy: hasRepairTargets ? 3 : 0 },
      !hasRepairTargets,
    ),
    createChoice(
      'shop-item',
      t('game.core.events.shop.item.title'),
      simpleItem ? simpleItem.name : t('game.core.events.shop.common.shelfEmpty'),
      simpleItem ? simpleItem.description : t('game.core.events.shop.common.showcaseEmpty'),
      { grantItemId: simpleItem?.id ?? null },
      !simpleItem,
    ),
    createChoice(
      'shop-item-2',
      t('game.core.events.shop.item2.title'),
      simpleItem2 ? simpleItem2.name : t('game.core.events.shop.common.shelfEmpty'),
      simpleItem2 ? simpleItem2.description : t('game.core.events.shop.common.showcaseEmpty'),
      { grantItemId: simpleItem2?.id ?? null },
      !simpleItem2,
    ),
    createChoice(
      'shop-durable',
      t('game.core.events.shop.durable.title'),
      durableItem ? durableItem.name : t('game.core.events.shop.common.notAvailable'),
      durableItem ? `${durableItem.description} ${t('game.core.events.shop.common.needsService')}` : t('game.core.events.shop.common.notAvailableNow'),
      { grantItemId: durableItem?.id ?? null },
      !durableItem,
    ),
    createChoice(
      'shop-buff',
      t('game.core.events.shop.buff.title'),
      t('game.core.events.shop.buff.flavor'),
      t('game.core.events.shop.buff.description'),
      {
        modifier: createModifier(
          'shop-buff',
          t('game.core.events.shop.buff.modifierTitle'),
          t('game.core.events.shop.buff.modifierDescription'),
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
      t('game.core.events.shop.accuracyTonic.title'),
      t('game.core.events.shop.accuracyTonic.flavor'),
      t('game.core.events.shop.accuracyTonic.description'),
      {
        modifier: createModifier(
          'shop-accuracy-tonic',
          t('game.core.events.shop.accuracyTonic.modifierTitle'),
          t('game.core.events.shop.accuracyTonic.modifierDescription'),
          3,
          { accuracyRequirementReduction: 5 },
        ),
      },
    ),
    createChoice(
      'shop-timer-kit',
      t('game.core.events.shop.timerKit.title'),
      t('game.core.events.shop.timerKit.flavor'),
      t('game.core.events.shop.timerKit.description'),
      {
        modifier: createModifier(
          'shop-timer-kit',
          t('game.core.events.shop.timerKit.modifierTitle'),
          t('game.core.events.shop.timerKit.modifierDescription'),
          5,
          { bossOnly: true, bossTimerBonusSeconds: 3 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('shop', level),
    kind: 'shop',
    title: t('game.core.events.shop.eventTitle'),
    description: t('game.core.events.shop.eventDescription'),
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
      'risk-overclock',
      t('game.core.events.risk.overclock.title'),
      t('game.core.events.risk.overclock.flavorReady'),
      t('game.core.events.risk.common.flavorLowHealth'),
      t('game.core.events.risk.overclock.descriptionReady'),
      t('game.core.events.risk.common.descriptionLowHealth'),
      'risk-overclock',
      t('game.core.events.risk.overclock.modifierTitle'),
      t('game.core.events.risk.overclock.modifierDescription'),
      2,
      { speedRequirementReductionPercent: 12 },
    ),
    riskChoice(
      'risk-focus',
      t('game.core.events.risk.focus.title'),
      t('game.core.events.risk.focus.flavorReady'),
      t('game.core.events.risk.common.flavorLowHealth'),
      t('game.core.events.risk.focus.descriptionReady'),
      t('game.core.events.risk.common.descriptionLowHealth'),
      'risk-focus',
      t('game.core.events.risk.focus.modifierTitle'),
      t('game.core.events.risk.focus.modifierDescription'),
      2,
      { accuracyRequirementReduction: 6 },
    ),
    riskChoice(
      'risk-boss',
      t('game.core.events.risk.boss.title'),
      t('game.core.events.risk.boss.flavorReady'),
      t('game.core.events.risk.common.flavorLowHealth'),
      t('game.core.events.risk.boss.descriptionReady'),
      t('game.core.events.risk.common.descriptionLowHealth'),
      'risk-boss',
      t('game.core.events.risk.boss.modifierTitle'),
      t('game.core.events.risk.boss.modifierDescription'),
      4,
      { bossOnly: true, speedRequirementReductionPercent: 6, bossTimerBonusSeconds: 6 },
    ),
    riskChoice(
      'risk-blitz',
      t('game.core.events.risk.blitz.title'),
      t('game.core.events.risk.blitz.flavorReady'),
      t('game.core.events.risk.common.flavorLowHealth'),
      t('game.core.events.risk.blitz.descriptionReady'),
      t('game.core.events.risk.common.descriptionLowHealth'),
      'risk-blitz',
      t('game.core.events.risk.blitz.modifierTitle'),
      t('game.core.events.risk.blitz.modifierDescription'),
      5,
      { speedRequirementReductionPercent: 8 },
    ),
    riskChoice(
      'risk-aegis',
      t('game.core.events.risk.aegis.title'),
      t('game.core.events.risk.aegis.flavorReady'),
      t('game.core.events.risk.common.flavorLowHealth'),
      t('game.core.events.risk.aegis.descriptionReady'),
      t('game.core.events.risk.common.descriptionLowHealth'),
      'risk-aegis',
      t('game.core.events.risk.aegis.modifierTitle'),
      t('game.core.events.risk.aegis.modifierDescription'),
      3,
      { accuracyRequirementReduction: 8, bossTimerBonusSeconds: 3 },
    ),
  ];

  return {
    id: createEventId('risk', level),
    kind: 'risk',
    title: t('game.core.events.risk.eventTitle'),
    description: t('game.core.events.risk.eventDescription'),
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
      t('game.core.events.curse.speed.title'),
      t('game.core.events.curse.speed.flavor'),
      t('game.core.events.curse.speed.description'),
      {
        modifier: createModifier(
          'curse-speed',
          t('game.core.events.curse.speed.modifierTitle'),
          t('game.core.events.curse.speed.modifierDescription'),
          3,
          { speedRequirementReductionPercent: -5 },
        ),
      },
    ),
    createChoice(
      'curse-accuracy',
      t('game.core.events.curse.accuracy.title'),
      t('game.core.events.curse.accuracy.flavor'),
      t('game.core.events.curse.accuracy.description'),
      {
        modifier: createModifier(
          'curse-accuracy',
          t('game.core.events.curse.accuracy.modifierTitle'),
          t('game.core.events.curse.accuracy.modifierDescription'),
          3,
          { accuracyRequirementReduction: -3 },
        ),
      },
    ),
    createChoice(
      'curse-timer',
      t('game.core.events.curse.timer.title'),
      t('game.core.events.curse.timer.flavor'),
      t('game.core.events.curse.timer.description'),
      {
        modifier: createModifier(
          'curse-timer',
          t('game.core.events.curse.timer.modifierTitle'),
          t('game.core.events.curse.timer.modifierDescription'),
          4,
          { bossOnly: true, bossTimerBonusSeconds: -4 },
        ),
      },
    ),
    createChoice(
      'curse-silence',
      t('game.core.events.curse.silence.title'),
      t('game.core.events.curse.silence.flavor'),
      t('game.core.events.curse.silence.description'),
      {
        modifier: createModifier(
          'curse-silence',
          t('game.core.events.curse.silence.modifierTitle'),
          t('game.core.events.curse.silence.modifierDescription'),
          4,
          { speedRequirementReductionPercent: -3, accuracyRequirementReduction: -2 },
        ),
      },
    ),
    createChoice(
      'curse-fog',
      t('game.core.events.curse.fog.title'),
      t('game.core.events.curse.fog.flavor'),
      t('game.core.events.curse.fog.description'),
      {
        modifier: createModifier(
          'curse-fog',
          t('game.core.events.curse.fog.modifierTitle'),
          t('game.core.events.curse.fog.modifierDescription'),
          5,
          { bossOnly: true, bossTimerBonusSeconds: -3 },
        ),
      },
    ),
    createChoice(
      'curse-wrath',
      t('game.core.events.curse.wrath.title'),
      t('game.core.events.curse.wrath.flavor'),
      t('game.core.events.curse.wrath.description'),
      {
        modifier: createModifier(
          'curse-wrath',
          t('game.core.events.curse.wrath.modifierTitle'),
          t('game.core.events.curse.wrath.modifierDescription'),
          4,
          { enemyAttackReduction: -6 },
        ),
      },
    ),
    createChoice(
      'curse-iron',
      t('game.core.events.curse.iron.title'),
      t('game.core.events.curse.iron.flavor'),
      t('game.core.events.curse.iron.description'),
      {
        modifier: createModifier(
          'curse-iron',
          t('game.core.events.curse.iron.modifierTitle'),
          t('game.core.events.curse.iron.modifierDescription'),
          4,
          { enemyDefenseReduction: -6 },
        ),
      },
    ),
    createChoice(
      'curse-blind',
      t('game.core.events.curse.blind.title'),
      t('game.core.events.curse.blind.flavor'),
      t('game.core.events.curse.blind.description'),
      {
        modifier: createModifier(
          'curse-blind',
          t('game.core.events.curse.blind.modifierTitle'),
          t('game.core.events.curse.blind.modifierDescription'),
          3,
          { playerAttackBonus: -8 },
        ),
      },
    ),
    createChoice(
      'curse-weakness',
      t('game.core.events.curse.weakness.title'),
      t('game.core.events.curse.weakness.flavor'),
      t('game.core.events.curse.weakness.description'),
      {
        modifier: createModifier(
          'curse-weakness',
          t('game.core.events.curse.weakness.modifierTitle'),
          t('game.core.events.curse.weakness.modifierDescription'),
          3,
          { dmgCoeff: -0.2 },
        ),
      },
    ),
    createChoice(
      'curse-fragile',
      t('game.core.events.curse.fragile.title'),
      t('game.core.events.curse.fragile.flavor'),
      t('game.core.events.curse.fragile.description'),
      {
        modifier: createModifier(
          'curse-fragile',
          t('game.core.events.curse.fragile.modifierTitle'),
          t('game.core.events.curse.fragile.modifierDescription'),
          3,
          { defCoeff: -0.2 },
        ),
      },
    ),
    createChoice(
      'curse-unlucky',
      t('game.core.events.curse.unlucky.title'),
      t('game.core.events.curse.unlucky.flavor'),
      t('game.core.events.curse.unlucky.description'),
      {
        modifier: createModifier(
          'curse-unlucky',
          t('game.core.events.curse.unlucky.modifierTitle'),
          t('game.core.events.curse.unlucky.modifierDescription'),
          4,
          { critBonus: -0.05 },
        ),
      },
    ),
  ];

  return {
    id: createEventId('curse', level),
    kind: 'curse',
    title: t('game.core.events.curse.eventTitle'),
    description: t('game.core.events.curse.eventDescription'),
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
