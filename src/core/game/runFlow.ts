import type { GameRunEventChoiceEffect, GameRunModifier } from '../../shared/types';

export type GamePostLevelFlow =
  | { kind: 'bossReward' }
  | { kind: 'mapSelection'; selectableNodeIds: string[] }
  | { kind: 'autoAdvance'; nextLevel: number }
  | { kind: 'terminalOrFailed' };

export interface ResolveGamePostLevelFlowArgs {
  passed: boolean;
  isBoss: boolean;
  victory: boolean;
  level: number;
  totalLevels: number;
  nextMapNodeIds: string[];
}

export function resolveGamePostLevelFlow(args: ResolveGamePostLevelFlowArgs): GamePostLevelFlow {
  const { passed, isBoss, victory, level, totalLevels, nextMapNodeIds } = args;

  if (passed && isBoss && !victory && level < totalLevels) {
    return { kind: 'bossReward' };
  }

  if (passed && !victory && nextMapNodeIds.length > 0) {
    return { kind: 'mapSelection', selectableNodeIds: nextMapNodeIds };
  }

  if (passed && !victory && nextMapNodeIds.length === 0) {
    return { kind: 'autoAdvance', nextLevel: level + 1 };
  }

  return { kind: 'terminalOrFailed' };
}

export interface ResolveGameChoiceEffectArgs {
  effect: GameRunEventChoiceEffect;
  hp: number;
  maxHp: number;
}

export interface GameChoiceEffectResolution {
  nextMaxHp: number;
  nextHp: number;
  hpChanged: boolean;
  runDamageTakenDelta: number;
  regenTurnsDelta: number;
  repairEquippedBy: number;
  grantItemId: string | null;
  modifier: GameRunModifier | null;
}

export function resolveGameChoiceEffect(args: ResolveGameChoiceEffectArgs): GameChoiceEffectResolution {
  const { effect, hp, maxHp } = args;
  const maxLifeDelta = effect.maxLifeDelta ?? 0;
  const nextMaxHp = maxHp + maxLifeDelta;
  let nextHp = hp;
  let hpChanged = false;

  if (maxLifeDelta !== 0) {
    nextHp = Math.min(hp + maxLifeDelta, nextMaxHp);
    hpChanged = true;
  }

  if (effect.fullHeal) {
    nextHp = nextMaxHp;
    hpChanged = true;
  }

  if (effect.lifeDelta) {
    nextHp = Math.max(0, Math.min(nextMaxHp, hp + effect.lifeDelta));
    hpChanged = true;
  }

  return {
    nextMaxHp,
    nextHp,
    hpChanged,
    runDamageTakenDelta: effect.lifeDelta && effect.lifeDelta < 0 ? Math.abs(effect.lifeDelta) : 0,
    regenTurnsDelta: effect.regenTurns ?? 0,
    repairEquippedBy: effect.repairEquippedBy ?? 0,
    grantItemId: effect.grantItemId ?? null,
    modifier: effect.modifier ?? null,
  };
}
