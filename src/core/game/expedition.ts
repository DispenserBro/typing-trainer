import type { GameRunEventChoiceEffect, GameRunEventState, GameRunMapNode, GameRunRewardChoice } from '../../shared/types';
import { resolveRuntimeTranslation as t } from '../i18n';
import { pickRandomGameItem } from './items';
import { createSeededRng, hashSeed } from './seededRng';

export const EXPEDITION_REGIONS = ['grove', 'archive', 'forge', 'rift'] as const;
export function getExpeditionRegion(level: number) {
  return EXPEDITION_REGIONS[Math.max(0, Math.ceil(level / 5) - 1) % EXPEDITION_REGIONS.length];
}

export function getMapNodeRegion(node: GameRunMapNode | null) {
  const segment = node?.id.match(/^seg-(\d+)-/);
  return getExpeditionRegion(segment ? Number(segment[1]) : node?.battleLevel ?? 1);
}

type EncounterOption = {
  effect: GameRunEventChoiceEffect;
  item?: 'simple' | 'durable';
};
type EncounterDefinition = { kind: GameRunEventState['kind']; options: EncounterOption[] };
const ENCOUNTERS: Record<string, EncounterDefinition> = {
  spring: { kind: 'rest', options: [
    { effect: { lifeDelta: 25 } },
    { effect: { maxLifeDelta: 5 } },
    { effect: { modifier: { id: 'spring-focus', name: '', description: '', remainingLevels: 3, defCoeff: 0.1, speedRequirementReductionPercent: 5 } } },
  ] },
  sanctuary: { kind: 'rest', options: [
    { effect: { lifeDelta: 50, modifier: { id: 'sanctuary-drowsy', name: '', description: '', remainingLevels: 2, speedRequirementReductionPercent: -8 } } },
    { effect: { regenTurns: 3 } },
    { effect: { repairEquippedBy: 2 } },
  ] },
  library: { kind: 'cache', options: [
    { effect: {}, item: 'simple' },
    { effect: { modifier: { id: 'library-focus', name: '', description: '', remainingLevels: 3, critBonus: 0.03, dmgCoeff: 0.1 } } },
    { effect: { maxLifeDelta: 5 } },
  ] },
  wreck: { kind: 'cache', options: [
    { effect: {}, item: 'durable' },
    { effect: { repairEquippedBy: 3 } },
    { effect: { lifeDelta: 15 } },
  ] },
  smith: { kind: 'shop', options: [
    { effect: { lifeDelta: -12 }, item: 'durable' },
    { effect: { lifeDelta: -8, modifier: { id: 'smith-edge', name: '', description: '', remainingLevels: 3, enemyDefenseReduction: 8 } } },
    { effect: { repairEquippedBy: 2, lifeDelta: 5 } },
  ] },
  alchemist: { kind: 'shop', options: [
    { effect: { lifeDelta: 35, modifier: { id: 'alchemist-fragile', name: '', description: '', remainingLevels: 2, defCoeff: -0.15 } } },
    { effect: { lifeDelta: -8, regenTurns: 4 } },
    { effect: { maxLifeDelta: 5 } },
  ] },
  altar: { kind: 'risk', options: [
    { effect: { lifeDelta: -10, modifier: { id: 'altar-fury', name: '', description: '', remainingLevels: 3, dmgCoeff: 0.35, defCoeff: -0.15 } } },
    { effect: { lifeDelta: -8, modifier: { id: 'altar-mist', name: '', description: '', remainingLevels: 3, dodgeBonus: 10, defCoeff: 0.1 } } },
    { effect: {} },
  ] },
  storm: { kind: 'risk', options: [
    { effect: { modifier: { id: 'storm-charge', name: '', description: '', remainingLevels: 3, dmgCoeff: 0.45, speedRequirementReductionPercent: -10 } } },
    { effect: { lifeDelta: -10, modifier: { id: 'storm-ward', name: '', description: '', remainingLevels: 3, enemyDefenseReduction: 8, enemyAttackReduction: 2 } } },
    { effect: {} },
  ] },
};

export function getExpeditionEncounterKey(node: Pick<GameRunMapNode, 'id' | 'kind'>): string | null {
  const variants: Record<string, string[]> = {
    rest: ['spring', 'sanctuary'], treasure: ['library', 'wreck'],
    shop: ['smith', 'alchemist'], risk: ['altar', 'storm'],
  };
  const pool = variants[node.kind];
  return pool ? pool[hashSeed(node.id) % pool.length] : null;
}

/** Existing event/effect contract: the complete offer is persisted with the run. */
export function createExpeditionEvent(node: GameRunMapNode, args: {
  level: number; hp: number; maxHp: number; hasRepairTargets: boolean;
}): GameRunEventState | null {
  const key = getExpeditionEncounterKey(node);
  if (!key) return null;
  const definition = ENCOUNTERS[key];
  const random = createSeededRng(hashSeed(node.id));
  return {
    id: 'encounter-' + node.id, kind: definition.kind, sourceLevel: args.level,
    title: t('game.expedition.events.' + key + '.title'),
    description: t('game.expedition.events.' + key + '.description'),
    resolvedChoiceId: null, resultText: null,
    choices: definition.options.map((option, index) => {
      const prefix = 'game.expedition.events.' + key + '.option' + index;
      const item = option.item ? pickRandomGameItem(option.item, random) : null;
      const effect = { ...option.effect };
      if (item) effect.grantItemId = item.id;
      if (effect.modifier) effect.modifier = {
        ...effect.modifier, name: t(prefix + '.title'), description: t(prefix + '.description'),
      };
      return {
        id: key + '-' + index, title: t(prefix + '.title'), flavor: item?.name ?? t(prefix + '.title'),
        description: t(prefix + '.description') + (item ? ' ' + item.description : ''), effect,
        disabled: Boolean(
          (option.item && !item)
          || ((effect.lifeDelta ?? 0) < 0 && args.hp <= -(effect.lifeDelta ?? 0))
          || (effect.repairEquippedBy && !args.hasRepairTargets && !((effect.lifeDelta ?? 0) > 0 && args.hp < args.maxHp))
          || ((effect.lifeDelta ?? 0) > 0 && !effect.modifier && !effect.repairEquippedBy && args.hp >= args.maxHp)
        ),
      };
    }),
  };
}

/** Dangerous optional fights pay a guaranteed item choice or recovery. */
export function buildEliteRewardChoices(tier: 'elite' | 'miniboss', random: () => number): GameRunRewardChoice[] {
  const item = pickRandomGameItem(tier === 'miniboss' ? 'durable' : 'simple', random);
  const choices: GameRunRewardChoice[] = item ? [{
    id: 'elite-item-' + item.id, kind: item.rewardKind, title: item.name,
    flavor: item.name, description: item.description, itemId: item.id,
  }] : [];
  choices.push({
    id: 'elite-recovery', kind: 'event', title: t('game.expedition.recovery.title'),
    flavor: t('game.expedition.recovery.title'),
    description: t('game.expedition.recovery.description', { hp: tier === 'miniboss' ? 30 : 20 }),
    effect: { lifeDelta: tier === 'miniboss' ? 30 : 20 },
  });
  return choices;
}
