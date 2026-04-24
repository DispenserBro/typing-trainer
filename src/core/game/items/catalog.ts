import type {
  GameEquipmentSlot,
  GameItemEffect,
  GameItemDefinition,
  GameItemRewardKind,
} from '../../../shared/types';
import { i18n, sanitizeTranslationParams } from '../../i18n';

const GAME_ITEM_EFFECT_TEMPLATE_KEYS: Partial<Record<GameItemEffect['kind'], {
  default: string;
  bossOnly?: string;
}>> = {
  speed: {
    default: 'game.core.items.effects.speed.default',
    bossOnly: 'game.core.items.effects.speed.bossOnly',
  },
  accuracy: {
    default: 'game.core.items.effects.accuracy.default',
    bossOnly: 'game.core.items.effects.accuracy.bossOnly',
  },
  timer: {
    default: 'game.core.items.effects.timer.default',
  },
  enemyAttack: {
    default: 'game.core.items.effects.enemyAttack.default',
  },
  enemyDefense: {
    default: 'game.core.items.effects.enemyDefense.default',
  },
  dodge: {
    default: 'game.core.items.effects.dodge.default',
  },
  playerAttack: {
    default: 'game.core.items.effects.playerAttack.default',
    bossOnly: 'game.core.items.effects.playerAttack.bossOnly',
  },
  playerDamage: {
    default: 'game.core.items.effects.playerDamage.default',
    bossOnly: 'game.core.items.effects.playerDamage.bossOnly',
  },
  dmgCoeff: {
    default: 'game.core.items.effects.dmgCoeff.default',
  },
  defCoeff: {
    default: 'game.core.items.effects.defCoeff.default',
  },
  critBonus: {
    default: 'game.core.items.effects.critBonus.default',
  },
};

function getLanguagePriority() {
  const fromI18n = [i18n.resolvedLanguage, i18n.language]
    .filter(Boolean)
    .flatMap((value) => {
      const lang = String(value);
      const base = lang.split('-')[0];
      return base && base !== lang ? [lang, base] : [lang];
    });

  return [...new Set([...fromI18n, 'en', 'ru'])];
}

function translateGameItemText(key: string, params?: Record<string, string | number>) {
  for (const lang of getLanguagePriority()) {
    if (i18n.exists(key, { lng: lang })) {
      return i18n.t(key, sanitizeTranslationParams({ lng: lang, ...(params ?? {}) }));
    }
  }

  return key;
}

function getItemBuiltinText(itemId: string, field: 'name' | 'shortName' | 'description') {
  return translateGameItemText(`game.core.items.catalog.${itemId}.${field}`);
}

function getItemEffectDescription(effect: GameItemEffect, bossOnly: boolean) {
  const variant = bossOnly && GAME_ITEM_EFFECT_TEMPLATE_KEYS[effect.kind]?.bossOnly ? 'bossOnly' : 'default';
  const key = `game.core.items.effects.${effect.kind}.${variant}`;

  for (const lang of getLanguagePriority()) {
    if (i18n.exists(key, { lng: lang })) {
      return i18n.t(key, sanitizeTranslationParams({ lng: lang, value: effect.value }));
    }
  }

  const templateKey = GAME_ITEM_EFFECT_TEMPLATE_KEYS[effect.kind]?.[variant];
  if (templateKey) return translateGameItemText(templateKey, { value: effect.value });

  return effect.description;
}

function createLocalizedItemDefinition(base: GameItemDefinition): GameItemDefinition {
  const localizedEffects = base.effects.map(effect => ({
    kind: effect.kind,
    value: effect.value,
    unit: effect.unit,
    get description() {
      return getItemEffectDescription(effect, Boolean(base.bossOnly));
    },
  })) as GameItemEffect[];

  return {
    ...base,
    get name() {
      return getItemBuiltinText(base.id, 'name');
    },
    get shortName() {
      return getItemBuiltinText(base.id, 'shortName');
    },
    get description() {
      return getItemBuiltinText(base.id, 'description');
    },
    effects: localizedEffects,
  };
}

const GAME_ITEM_CATALOG_BASE: GameItemDefinition[] = [
  // ═══════════════════════════════════════════════
  //  Простые (simple) артефакты — без прочности
  // ═══════════════════════════════════════════════

  // ── Утилити: скорость / точность / таймер ──
  {
    id: 'steady-gloves',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'gauge',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 4,
    defCoeff: 0.08,
    effects: [
      { kind: 'speed', value: 4, unit: 'percent', description: '' },
      { kind: 'defCoeff', value: 8, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'focus-lens',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'eye',
    rewardKind: 'simple',
    accuracyRequirementReduction: 2,
    playerAttackBonus: 3,
    effects: [
      { kind: 'accuracy', value: 2, unit: 'percent', description: '' },
      { kind: 'playerAttack', value: 3, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'path-compass',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'compass',
    rewardKind: 'simple',
    bossOnly: true,
    bossTimerBonusSeconds: 2,
    enemyDefenseReduction: 3,
    effects: [
      { kind: 'timer', value: 2, unit: 'seconds', description: '' },
      { kind: 'enemyDefense', value: 3, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'whisper-feather',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'feather',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    critBonus: 0.02,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 2, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'line-sigil',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'crosshair',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    accuracyRequirementReduction: 2,
    dmgCoeff: 0.08,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 2, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 8, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'rabbit-step',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'rabbit',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 6,
    dodgeBonus: 4,
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '' },
      { kind: 'dodge', value: 4, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'radar-thread',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'radar',
    rewardKind: 'simple',
    bossOnly: true,
    accuracyRequirementReduction: 2,
    bossTimerBonusSeconds: 1,
    enemyDefenseReduction: 4,
    effects: [
      { kind: 'accuracy', value: 2, unit: 'percent', description: '' },
      { kind: 'timer', value: 1, unit: 'seconds', description: '' },
      { kind: 'enemyDefense', value: 4, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'crown-oath',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'crown',
    rewardKind: 'simple',
    bossOnly: true,
    speedRequirementReductionPercent: 5,
    accuracyRequirementReduction: 3,
    dmgCoeff: 0.12,
    effects: [
      { kind: 'speed', value: 5, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 3, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 12, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'mirror-glasses',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'glasses',
    rewardKind: 'simple',
    accuracyRequirementReduction: 3,
    enemyAttackReduction: 3,
    effects: [
      { kind: 'accuracy', value: 3, unit: 'percent', description: '' },
      { kind: 'enemyAttack', value: 3, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'medal-of-stability',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'medal',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 3,
    accuracyRequirementReduction: 2,
    defCoeff: 0.1,
    effects: [
      { kind: 'speed', value: 3, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 2, unit: 'percent', description: '' },
      { kind: 'defCoeff', value: 10, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'wind-sigil',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'wind',
    rewardKind: 'simple',
    speedRequirementReductionPercent: 6,
    dmgCoeff: 0.1,
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 10, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'blessed-bulwark',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'shieldplus',
    rewardKind: 'simple',
    bossOnly: true,
    accuracyRequirementReduction: 3,
    bossTimerBonusSeconds: 2,
    defCoeff: 0.12,
    effects: [
      { kind: 'accuracy', value: 3, unit: 'percent', description: '' },
      { kind: 'timer', value: 2, unit: 'seconds', description: '' },
      { kind: 'defCoeff', value: 12, unit: 'percent', description: '' },
    ],
  },

  // ── Боевые: атака / урон / защита / крит ──
  {
    id: 'viper-fang',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'swords',
    rewardKind: 'simple',
    enemyDefenseReduction: 4,
    dmgCoeff: 0.08,
    effects: [
      { kind: 'enemyDefense', value: 4, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 8, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'iron-carapace',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'shell',
    rewardKind: 'simple',
    enemyAttackReduction: 4,
    defCoeff: 0.1,
    effects: [
      { kind: 'enemyAttack', value: 4, unit: 'flat', description: '' },
      { kind: 'defCoeff', value: 10, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'phantom-cloak',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'ghost',
    rewardKind: 'simple',
    dodgeBonus: 5,
    critBonus: 0.02,
    effects: [
      { kind: 'dodge', value: 5, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 2, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'sharp-rune',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'zap',
    rewardKind: 'simple',
    playerAttackBonus: 5,
    dmgCoeff: 0.06,
    effects: [
      { kind: 'playerAttack', value: 5, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 6, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'fury-sigil',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'swords',
    rewardKind: 'simple',
    playerAttackBonus: 4,
    enemyDefenseReduction: 3,
    dmgCoeff: 0.06,
    effects: [
      { kind: 'playerAttack', value: 4, unit: 'percent', description: '' },
      { kind: 'enemyDefense', value: 3, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 6, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'serrated-band',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'activity',
    rewardKind: 'simple',
    playerAttackBonus: 7,
    playerDamageBonus: 1,
    effects: [
      { kind: 'playerAttack', value: 7, unit: 'percent', description: '' },
      { kind: 'playerDamage', value: 1, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'fury-crystal',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'flame',
    rewardKind: 'simple',
    dmgCoeff: 0.15,
    effects: [
      { kind: 'dmgCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'rage-pendant',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'swords',
    rewardKind: 'simple',
    dmgCoeff: 0.1,
    enemyDefenseReduction: 4,
    effects: [
      { kind: 'dmgCoeff', value: 10, unit: 'percent', description: '' },
      { kind: 'enemyDefense', value: 4, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'stoneskin-charm',
    name: '',
    shortName: '',
    description: '',
    rarity: 1,
    slotType: 'trinket',
    icon: 'shield',
    rewardKind: 'simple',
    defCoeff: 0.15,
    effects: [
      { kind: 'defCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'guardian-ring',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'circle',
    rewardKind: 'simple',
    defCoeff: 0.1,
    dodgeBonus: 4,
    effects: [
      { kind: 'defCoeff', value: 10, unit: 'percent', description: '' },
      { kind: 'dodge', value: 4, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'rhythm-charm',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'activity',
    rewardKind: 'simple',
    critBonus: 0.05,
    effects: [
      { kind: 'critBonus', value: 5, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'precision-lens',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'crosshair',
    rewardKind: 'simple',
    critBonus: 0.03,
    playerAttackBonus: 5,
    effects: [
      { kind: 'critBonus', value: 3, unit: 'percent', description: '' },
      { kind: 'playerAttack', value: 5, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'crusher-seal',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'shield-off',
    rewardKind: 'simple',
    playerDamageBonus: 2,
    enemyDefenseReduction: 5,
    effects: [
      { kind: 'playerDamage', value: 2, unit: 'flat', description: '' },
      { kind: 'enemyDefense', value: 5, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'heavy-strike',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'hammer',
    rewardKind: 'simple',
    playerDamageBonus: 1,
    dmgCoeff: 0.08,
    effects: [
      { kind: 'playerDamage', value: 1, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 8, unit: 'percent', description: '' },
    ],
  },

  // ═══════════════════════════════════════════════
  //  Прочные (durable) артефакты — с износом
  // ═══════════════════════════════════════════════

  // ── Утилити: скорость / точность / таймер ──
  {
    id: 'rift-hourglass',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'timer',
    rewardKind: 'durable',
    bossOnly: true,
    bossTimerBonusSeconds: 10,
    dmgCoeff: 0.15,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'timer', value: 10, unit: 'seconds', description: '' },
      { kind: 'dmgCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'storm-anchor',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'anchor',
    rewardKind: 'durable',
    bossOnly: true,
    bossTimerBonusSeconds: 6,
    defCoeff: 0.12,
    maxDurability: 5,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 1 },
    effects: [
      { kind: 'timer', value: 6, unit: 'seconds', description: '' },
      { kind: 'defCoeff', value: 12, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'overclock-core',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'zap',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 16,
    dmgCoeff: 0.2,
    maxDurability: 6,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 16, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 20, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'brain-lattice',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'brain',
    rewardKind: 'durable',
    accuracyRequirementReduction: 8,
    playerAttackBonus: 6,
    critBonus: 0.04,
    maxDurability: 5,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 8, unit: 'percent', description: '' },
      { kind: 'playerAttack', value: 6, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 4, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'aegis-prism',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'shield',
    rewardKind: 'durable',
    accuracyRequirementReduction: 6,
    bossTimerBonusSeconds: 3,
    defCoeff: 0.18,
    maxDurability: 5,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 6, unit: 'percent', description: '' },
      { kind: 'timer', value: 3, unit: 'seconds', description: '' },
      { kind: 'defCoeff', value: 18, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'spark-capsule',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'sparkles',
    rewardKind: 'durable',
    bossOnly: true,
    speedRequirementReductionPercent: 8,
    bossTimerBonusSeconds: 4,
    critBonus: 0.06,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 8, unit: 'percent', description: '' },
      { kind: 'timer', value: 4, unit: 'seconds', description: '' },
      { kind: 'critBonus', value: 6, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'warden-lock',
    name: '',
    shortName: '',
    description: '',
    rarity: 2,
    slotType: 'trinket',
    icon: 'lock',
    rewardKind: 'durable',
    accuracyRequirementReduction: 5,
    defCoeff: 0.15,
    enemyAttackReduction: 3,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'accuracy', value: 5, unit: 'percent', description: '' },
      { kind: 'defCoeff', value: 15, unit: 'percent', description: '' },
      { kind: 'enemyAttack', value: 3, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'ember-seal',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'flame',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 9,
    accuracyRequirementReduction: 4,
    dmgCoeff: 0.15,
    maxDurability: 3,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 9, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 4, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'loaded-die',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'dice',
    rewardKind: 'durable',
    speedRequirementReductionPercent: 10,
    accuracyRequirementReduction: 3,
    critBonus: 0.06,
    maxDurability: 4,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 10, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 3, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 6, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'wand-of-blinks',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'wand',
    rewardKind: 'durable',
    bossOnly: true,
    speedRequirementReductionPercent: 6,
    accuracyRequirementReduction: 5,
    dmgCoeff: 0.2,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'speed', value: 6, unit: 'percent', description: '' },
      { kind: 'accuracy', value: 5, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 20, unit: 'percent', description: '' },
    ],
  },

  // ── Боевые прочные ──
  {
    id: 'razorblade-edge',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'axe',
    rewardKind: 'durable',
    enemyDefenseReduction: 8,
    dmgCoeff: 0.12,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'enemyDefense', value: 8, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 12, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'guardian-ward',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'pillar',
    rewardKind: 'durable',
    enemyAttackReduction: 8,
    defCoeff: 0.15,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'enemyAttack', value: 8, unit: 'flat', description: '' },
      { kind: 'defCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'shadow-mantle',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'eclipse',
    rewardKind: 'durable',
    dodgeBonus: 10,
    critBonus: 0.05,
    maxDurability: 4,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'dodge', value: 10, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 5, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'war-talisman',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'shield-alert',
    rewardKind: 'durable',
    enemyAttackReduction: 4,
    enemyDefenseReduction: 4,
    dmgCoeff: 0.1,
    maxDurability: 5,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'enemyAttack', value: 4, unit: 'flat', description: '' },
      { kind: 'enemyDefense', value: 4, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 10, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'bloodletter',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'flame',
    rewardKind: 'durable',
    playerAttackBonus: 10,
    dmgCoeff: 0.15,
    critBonus: 0.03,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'playerAttack', value: 10, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 15, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 3, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'war-drum',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'radio',
    rewardKind: 'durable',
    bossOnly: true,
    playerAttackBonus: 12,
    dmgCoeff: 0.2,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'playerAttack', value: 12, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 20, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'titan-gauntlet',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'hand',
    rewardKind: 'durable',
    playerDamageBonus: 3,
    dmgCoeff: 0.15,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'playerDamage', value: 3, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 15, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'boss-slayer',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'skull',
    rewardKind: 'durable',
    bossOnly: true,
    playerDamageBonus: 3,
    dmgCoeff: 0.18,
    critBonus: 0.04,
    maxDurability: 3,
    durabilityRules: { normalPass: 0, normalFail: 0, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'playerDamage', value: 3, unit: 'flat', description: '' },
      { kind: 'dmgCoeff', value: 18, unit: 'percent', description: '' },
      { kind: 'critBonus', value: 4, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'berserk-core',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'zap',
    rewardKind: 'durable',
    dmgCoeff: 0.35,
    playerAttackBonus: 6,
    maxDurability: 4,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'dmgCoeff', value: 35, unit: 'percent', description: '' },
      { kind: 'playerAttack', value: 6, unit: 'percent', description: '' },
    ],
  },
  {
    id: 'fortress-plate',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'castle',
    rewardKind: 'durable',
    defCoeff: 0.35,
    enemyAttackReduction: 5,
    maxDurability: 4,
    durabilityRules: { normalPass: 1, normalFail: 2, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'defCoeff', value: 35, unit: 'percent', description: '' },
      { kind: 'enemyAttack', value: 5, unit: 'flat', description: '' },
    ],
  },
  {
    id: 'lucky-die',
    name: '',
    shortName: '',
    description: '',
    rarity: 3,
    slotType: 'trinket',
    icon: 'dice',
    rewardKind: 'durable',
    critBonus: 0.12,
    dmgCoeff: 0.1,
    maxDurability: 4,
    durabilityRules: { normalPass: 0, normalFail: 1, bossPass: 1, bossFail: 2 },
    effects: [
      { kind: 'critBonus', value: 12, unit: 'percent', description: '' },
      { kind: 'dmgCoeff', value: 10, unit: 'percent', description: '' },
    ],
  },
];

export const GAME_ITEM_CATALOG: GameItemDefinition[] = GAME_ITEM_CATALOG_BASE.map(createLocalizedItemDefinition);

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
  {
    key: 'slotA',
    get label() {
      return translateGameItemText('game.inventory.slots.slotA');
    },
    slotType: 'trinket',
  },
  {
    key: 'slotB',
    get label() {
      return translateGameItemText('game.inventory.slots.slotB');
    },
    slotType: 'trinket',
  },
  {
    key: 'slotC',
    get label() {
      return translateGameItemText('game.inventory.slots.slotC');
    },
    slotType: 'trinket',
  },
];

