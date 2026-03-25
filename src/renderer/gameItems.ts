import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  Brain,
  Compass,
  Crown,
  Crosshair,
  Dice5,
  Eye,
  Feather,
  Flame,
  Gauge,
  Gem,
  Glasses,
  Lock,
  Medal,
  Radar,
  Rabbit,
  Shield,
  ShieldPlus,
  Sparkles,
  Timer,
  WandSparkles,
  Wind,
  Zap,
} from 'lucide-react';
import type {
  GameEquipmentSlot,
  GameInventoryItem,
  GameItemDefinition,
  GameItemRewardKind,
} from '../shared/types';

const GAME_ITEM_ICONS: Record<string, LucideIcon> = {
  anchor: Anchor,
  brain: Brain,
  crown: Crown,
  gauge: Gauge,
  dice: Dice5,
  eye: Eye,
  feather: Feather,
  glasses: Glasses,
  compass: Compass,
  crosshair: Crosshair,
  lock: Lock,
  medal: Medal,
  rabbit: Rabbit,
  radar: Radar,
  shieldplus: ShieldPlus,
  sparkles: Sparkles,
  timer: Timer,
  shield: Shield,
  wand: WandSparkles,
  wind: Wind,
  zap: Zap,
  flame: Flame,
  gem: Gem,
};

export const GAME_ITEM_CATALOG: GameItemDefinition[] = [
  {
    id: 'steady-gloves',
    name: 'Перчатки ровного темпа',
    shortName: 'Темп',
    description: 'Спокойная реликвия. Чуть снижает требование к скорости и не изнашивается.',
    rarity: 1,
    slotType: 'trinket',
    icon: 'gauge',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 4,
    effects: [
      { kind: 'speed', value: 4, unit: 'percent', description: '-4% к требуемой скорости' },
    ],
  },
  {
    id: 'focus-lens',
    name: 'Линза безошибочности',
    shortName: 'Фокус',
    description: 'Тихий артефакт на точность. Помогает удерживать порог прохождения.',
    rarity: 1,
    slotType: 'trinket',
    icon: 'eye',
    rewardKind: 'simple',
    accuracyRequirementReduction: 2,
    effects: [
      { kind: 'accuracy', value: 2, unit: 'percent', description: '-2% к требуемой точности' },
    ],
  },
  {
    id: 'path-compass',
    name: 'Компас босса',
    shortName: 'Компас',
    description: 'Легкая реликвия, добавляющая немного времени на боссах.',
    rarity: 1,
    slotType: 'trinket',
    icon: 'compass',
    rewardKind: 'simple',
    bossOnly: true,
    bossTimerBonusSeconds: 2,
    effects: [
      { kind: 'timer', value: 2, unit: 'seconds', description: '+2 сек. к таймеру босса' },
    ],
  },
  {
    id: 'line-sigil',
    name: 'Печать чистой линии',
    shortName: 'Линия',
    description: 'Редкая пассивная печать с двумя умеренными бонусами сразу.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'crosshair',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    accuracyRequirementReduction: 2,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '-3% к требуемой скорости' },
      { kind: 'accuracy', value: 2, unit: 'percent', description: '-2% к требуемой точности' },
    ],
  },
  {
    id: 'whisper-feather',
    name: 'Перо легкого ритма',
    shortName: 'Перо',
    description: 'Легкая реликвия для обычных уровней. Почти незаметна, но приятно сглаживает темп.',
    rarity: 1,
    slotType: 'trinket',
    icon: 'feather',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '-3% к требуемой скорости' },
    ],
  },
  {
    id: 'rabbit-step',
    name: 'След кролика',
    shortName: 'След',
    description: 'Шустрый амулет на чистую скорость. Хорошо чувствуется в середине забега.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'rabbit',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 6,
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '-6% к требуемой скорости' },
    ],
  },
  {
    id: 'radar-thread',
    name: 'Нить радара',
    shortName: 'Радар',
    description: 'Настраивает взгляд на боссов и облегчает чтение опасных кусков текста.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'radar',
    rewardKind: 'simple',
    bossOnly: true,
    accuracyRequirementReduction: 2,
    bossTimerBonusSeconds: 1,
    effects: [
      { kind: 'accuracy', value: 2, unit: 'percent', description: '-2% к требуемой точности на боссе' },
      { kind: 'timer', value: 1, unit: 'seconds', description: '+1 сек. к таймеру босса' },
    ],
  },
  {
    id: 'crown-oath',
    name: 'Коронный обет',
    shortName: 'Обет',
    description: 'Редкая награда для уверенной игры против боссов.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'crown',
    rewardKind: 'simple',
    bossOnly: true,
    speedRequirementReductionPercent: 5,
    accuracyRequirementReduction: 3,
    effects: [
      { kind: 'speed', value: 5, unit: 'percent', description: '-5% к требуемой скорости на боссе' },
      { kind: 'accuracy', value: 3, unit: 'percent', description: '-3% к требуемой точности на боссе' },
    ],
  },
  {
    id: 'mirror-glasses',
    name: 'Зеркальные очки',
    shortName: 'Очки',
    description: 'Чистая реликвия на точность без риска и без износа.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'glasses',
    rewardKind: 'simple',
    accuracyRequirementReduction: 3,
    effects: [
      { kind: 'accuracy', value: 3, unit: 'percent', description: '-3% к требуемой точности' },
    ],
  },
  {
    id: 'medal-of-stability',
    name: 'Медаль устойчивости',
    shortName: 'Медаль',
    description: 'Сбалансированная реликвия на длинный забег.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'medal',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    accuracyRequirementReduction: 2,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '-3% к требуемой скорости' },
      { kind: 'accuracy', value: 2, unit: 'percent', description: '-2% к требуемой точности' },
    ],
  },
  {
    id: 'rift-hourglass',
    name: 'Разломные песочные часы',
    shortName: 'Разлом',
    description: 'Нестабильный артефакт. Резко упрощает боссов, но быстро трескается.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'timer',
    rewardKind: 'durable',
    bossOnly: true,
    bossTimerBonusSeconds: 10,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'timer', value: 10, unit: 'seconds', description: '+10 сек. к таймеру босса' },
      { kind: 'reward', value: 0, unit: 'flat', description: 'Теряет 2 прочности при провале босса' },
    ],
  },
  {
    id: 'storm-anchor',
    name: 'Штормовой якорь',
    shortName: 'Якорь',
    description: 'Тяжелый артефакт только для боссов. Сильно удлиняет окно для прохождения.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'anchor',
    rewardKind: 'durable',
    bossOnly: true,
    bossTimerBonusSeconds: 6,
    maxDurability: 5,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 1 },
    effects: [
      { kind: 'timer', value: 6, unit: 'seconds', description: '+6 сек. к таймеру босса' },
      { kind: 'reward', value: 0, unit: 'flat', description: 'Тратится только на боссах' },
    ],
  },
  {
    id: 'overclock-core',
    name: 'Ядро разгона',
    shortName: 'Разгон',
    description: 'Опасное ядро с большим бонусом к темпу. Полезно везде, но изнашивается почти каждый уровень.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'zap',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 16,
    maxDurability: 6,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 16, unit: 'percent', description: '-16% к требуемой скорости' },
      { kind: 'reward', value: 0, unit: 'flat', description: 'Теряет 2 прочности при провале уровня' },
    ],
  },
  {
    id: 'brain-lattice',
    name: 'Мозговая решетка',
    shortName: 'Решетка',
    description: 'Сильный, но требовательный артефакт на точность. Полезен почти везде, но быстро ломается после провалов.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'brain',
    rewardKind: 'durable',
    accuracyRequirementReduction: 8,
    maxDurability: 5,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 8, unit: 'percent', description: '-8% к требуемой точности' },
      { kind: 'reward', value: 0, unit: 'flat', description: 'Теряет 2 прочности при любом провале' },
    ],
  },
  {
    id: 'aegis-prism',
    name: 'Призма эгиды',
    shortName: 'Эгида',
    description: 'Редкая защитная призма. Дает мощную страховку по точности, но долго не живет на боссах.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'shield',
    rewardKind: 'durable',
    accuracyRequirementReduction: 6,
    bossTimerBonusSeconds: 3,
    maxDurability: 5,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 6, unit: 'percent', description: '-6% к требуемой точности' },
      { kind: 'timer', value: 3, unit: 'seconds', description: '+3 сек. к таймеру босса' },
    ],
  },
  {
    id: 'spark-capsule',
    name: 'Искровая капсула',
    shortName: 'Искра',
    description: 'Хрупкая капсула для быстрых побед над боссами. Очень сильна, но недолговечна.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'sparkles',
    rewardKind: 'durable',
    bossOnly: true,
    speedRequirementReductionPercent: 8,
    bossTimerBonusSeconds: 4,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 8, unit: 'percent', description: '-8% к требуемой скорости на боссе' },
      { kind: 'timer', value: 4, unit: 'seconds', description: '+4 сек. к таймеру босса' },
    ],
  },
  {
    id: 'warden-lock',
    name: 'Замок хранителя',
    shortName: 'Замок',
    description: 'Редкий предмет с высокой точностью и очень жестким наказанием за ошибки.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'lock',
    rewardKind: 'durable',
    accuracyRequirementReduction: 5,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 5, unit: 'percent', description: '-5% к требуемой точности' },
      { kind: 'reward', value: 0, unit: 'flat', description: 'Сильно наказывается за провалы' },
    ],
  },
  {
    id: 'ember-seal',
    name: 'Печать перегрева',
    shortName: 'Перегрев',
    description: 'Сильный, но хрупкий артефакт. Дает большой буст к прохождению и почти сразу выгорает.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'flame',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 9,
    accuracyRequirementReduction: 4,
    maxDurability: 3,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 9, unit: 'percent', description: '-9% к требуемой скорости' },
      { kind: 'accuracy', value: 4, unit: 'percent', description: '-4% к требуемой точности' },
    ],
  },
  {
    id: 'loaded-die',
    name: 'Загруженная кость',
    shortName: 'Кость',
    description: 'Азартный артефакт на мощный рывок. Хорош почти везде, но долго не живет.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'dice',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 10,
    accuracyRequirementReduction: 3,
    maxDurability: 4,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 10, unit: 'percent', description: '-10% к требуемой скорости' },
      { kind: 'accuracy', value: 3, unit: 'percent', description: '-3% к требуемой точности' },
    ],
  },
  {
    id: 'wind-sigil',
    name: 'Печать попутного ветра',
    shortName: 'Ветер',
    description: 'Быстрая реликвия для спокойных уровней без заметного риска.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'wind',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 6,
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '-6% к требуемой скорости' },
    ],
  },
  {
    id: 'blessed-bulwark',
    name: 'Благословенный бастион',
    shortName: 'Бастион',
    description: 'Устойчивая боссовая реликвия на точность и запас времени.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'shieldplus',
    rewardKind: 'simple',
    bossOnly: true,
    accuracyRequirementReduction: 3,
    bossTimerBonusSeconds: 2,
    effects: [
      { kind: 'accuracy', value: 3, unit: 'percent', description: '-3% к требуемой точности на боссе' },
      { kind: 'timer', value: 2, unit: 'seconds', description: '+2 сек. к таймеру босса' },
    ],
  },
  {
    id: 'wand-of-blinks',
    name: 'Жезл вспышек',
    shortName: 'Жезл',
    description: 'Опасный боссовый артефакт. Очень силен, но буквально тает после неудачи.',
    rarity: 3,
    slotType: 'trinket',
    icon: 'wand',
    rewardKind: 'durable',
    bossOnly: true,
    speedRequirementReductionPercent: 6,
    accuracyRequirementReduction: 5,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '-6% к требуемой скорости на боссе' },
      { kind: 'accuracy', value: 5, unit: 'percent', description: '-5% к требуемой точности на боссе' },
    ],
  },
];

export const GAME_ITEM_MAP = Object.fromEntries(
  GAME_ITEM_CATALOG.map(item => [item.id, item]),
) as Record<string, GameItemDefinition>;

export const GAME_ITEM_POOLS: Record<GameItemRewardKind, GameItemDefinition[]> = {
  simple: GAME_ITEM_CATALOG.filter(item => item.rewardKind === 'simple'),
  durable: GAME_ITEM_CATALOG.filter(item => item.rewardKind === 'durable'),
};

export const GAME_EQUIPMENT_SLOTS: Array<{
  key: GameEquipmentSlot;
  label: string;
  slotType: GameItemDefinition['slotType'];
}> = [
  { key: 'slotA', label: 'Слот 1', slotType: 'trinket' },
  { key: 'slotB', label: 'Слот 2', slotType: 'trinket' },
  { key: 'slotC', label: 'Слот 3', slotType: 'trinket' },
];

export function getGameItemById(itemId: string | null | undefined) {
  if (!itemId) return null;
  return GAME_ITEM_MAP[itemId] ?? null;
}

export function getGameItemIcon(iconKey: string) {
  return GAME_ITEM_ICONS[iconKey] ?? Gem;
}

export function isDurableGameItem(item: GameItemDefinition | null | undefined) {
  return Boolean(item?.maxDurability && item.maxDurability > 0);
}

export function isBrokenInventoryItem(entry: GameInventoryItem) {
  return typeof entry.maxDurability === 'number'
    && entry.maxDurability > 0
    && typeof entry.durability === 'number'
    && entry.durability <= 0;
}

export function getGameItemRarityStars(rarity: GameItemDefinition['rarity']) {
  return `${'★'.repeat(rarity)}${'☆'.repeat(3 - rarity)}`;
}

export function pickRandomGameItem(kind: GameItemRewardKind) {
  const pool = GAME_ITEM_POOLS[kind];
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
