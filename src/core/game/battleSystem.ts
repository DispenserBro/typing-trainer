/**
 * Round-based combat: typing quality controls damage, guard and critical hits.
 *
 * Formulas:
 *   ΔCPM = currentCPM / baseCPM (ratio, 1.0 = on target)
 *   Δrhythm = 3 / (1 + standardDeviation / averageInterval)
 *
 * Attack phase (player attacks enemy):
 *   damage = baseDmgCoeff * (1 + artifactDmgCoeff) * ΔCPM
 *   damage *= accuracyFactor (0..1)
 *   damage *= 1 - enemyDefense / 100 (armor capped at 75%)
 *   critChance = (baseCritCoeff + artifactCritBonus) * Δrhythm   (clamped 0-0.5)
 *   if crit: damage *= critMultiplier (2×)
 *
 * Defend phase (enemy attacks player):
 *   defPoints   = baseDefCoeff * (1 + artifactDefCoeff) * ΔCPM * accuracyFactor
 *   incomingDmg = dodge ? 0 : max(1, enemyBaseDmg − enemyAttackReduction − defPoints)
 *
 * Enemy HP scales progressively with level. Bosses get a multiplier.
 * Bosses also debuff one player parameter (CPM, accuracy, or rhythm).
 */

import type {
  BossDebuff,
  BattlePhase,
  BattleRoundResult,
  BattleState,
  EnemyStats,
  EnemyTier,
} from '../../shared/types';
import { resolveRuntimeTranslation } from '../i18n';

/* ── Player base constants ── */

export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_DMG_COEFF = 12;
export const PLAYER_BASE_DEF_COEFF = 8;
export const PLAYER_BASE_CRIT_COEFF = 0.025;
export const REGEN_HP_PER_BATTLE = 10;
const CRIT_MULTIPLIER = 2;

/* ── Enemy stat ranges per tier ── */

interface EnemyStatRange {
  /** Base HP before level scaling */
  baseHp: number;
  /** Defense (0-100) */
  defenseMin: number;
  defenseMax: number;
  /** Base damage dealt to player per hit */
  baseDamage: number;
}

const ENEMY_STAT_RANGES: Record<EnemyTier, EnemyStatRange> = {
  normal: {
    baseHp: 12,
    defenseMin: 15,
    defenseMax: 30,
    baseDamage: 10,
  },
  elite: {
    baseHp: 20,
    defenseMin: 25,
    defenseMax: 40,
    baseDamage: 12,
  },
  miniboss: {
    baseHp: 28,
    defenseMin: 30,
    defenseMax: 45,
    baseDamage: 15,
  },
  boss: {
    baseHp: 34,
    defenseMin: 35,
    defenseMax: 50,
    baseDamage: 16,
  },
};

const BOSS_HP_COEFF = 1.15;

const ENEMY_NAME_KEYS: Record<EnemyTier, string[]> = {
  normal: ['scripter', 'watcher', 'pathGuard', 'sentinel', 'codeShadow'],
  elite: ['tempoExecutioner', 'keyMaster', 'rhythmGuard', 'accuracyAdept'],
  miniboss: ['thresholdKeeper', 'overseer', 'lineTitan'],
  boss: ['branchWarden', 'waveLord', 'speedArchon', 'absolute'],
};

const BOSS_DEBUFFS: BossDebuff[] = ['cpm', 'accuracy', 'rhythm'];

function randInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randFrom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function t(key: string, params?: Record<string, string | number>) {
  return resolveRuntimeTranslation(key, params);
}

/* ── Enemy creation ── */

/**
 * Gentle HP scaling: base * (1 + (level - 1) * 0.018), levels 1–100.
 * Boss HP = scaled HP * BOSS_HP_COEFF
 */
export function createEnemy(tier: EnemyTier, level: number, random: () => number = Math.random): EnemyStats {
  const range = ENEMY_STAT_RANGES[tier];
  const safeLevel = Number.isFinite(level) ? clamp(level, 1, 100) : 1;
  const hpScaling = 1 + (safeLevel - 1) * 0.018;
  let hp = Math.round(range.baseHp * hpScaling);
  if (tier === 'boss') {
    hp = Math.round(hp * BOSS_HP_COEFF);
  }
  const defense = randInt(range.defenseMin, range.defenseMax, random);
  const nameKey = randFrom(ENEMY_NAME_KEYS[tier], random);
  const name = t(`game.core.events.battle.enemyNames.${tier}.${nameKey}`);
  const debuff = tier === 'boss' ? randFrom(BOSS_DEBUFFS, random) : null;

  return { name, tier, maxHp: hp, hp, hitChance: 100, defense, debuff };
}

/* ── Battle state management ── */

export function createBattleState(
  enemy: EnemyStats,
  playerHp: number,
  playerMaxHp: number,
): BattleState {
  return {
    enemy: { ...enemy },
    playerHp,
    playerMaxHp,
    phase: 'attack',
    round: 1,
    roundResults: [],
    roundText: '',
    finished: false,
    won: false,
  };
}

/** Words per round — short bursts of typing */
export const BATTLE_ROUND_WORDS = 8;

/** Words per round for boss battles — slightly more than normal */
export const BOSS_BATTLE_ROUND_WORDS = 10;

/* ── Rhythm helpers ── */

/**
 * Compute Δrhythm from keypress intervals.
 * Δrhythm = 3 / (1 + standardDeviation / averageInterval).
 * Uses every valid interval, including pauses; isolated jitter is not decisive.
 *
 * Perfect rhythm → ratio close to 1 → mapped to 3.
 * Terrible rhythm → ratio close to 0 → mapped to 0.
 */
export function computeDeltaRhythm(intervals: number[]): number {
  if (intervals.length < 2) return 1.5; // neutral default
  // Keep pauses: dropping long intervals rewarded irregular typing.
  const filtered = intervals.filter(ms => Number.isFinite(ms) && ms > 0);
  if (filtered.length < 2) return 1.5;

  const avg = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  const deviation = Math.sqrt(filtered.reduce((sum, ms) => sum + (ms - avg) ** 2, 0) / filtered.length);
  return clamp(3 / (1 + deviation / avg), 0, 3);
}

/**
 * Compute ΔCPM ratio.
 * ΔCPM = currentCPM / baseCPM  (1.0 = on target, >1 = faster, <1 = slower)
 * Clamped to [0, 2] to avoid rewarding an artificially tiny speed target.
 */
export function computeDeltaCpm(currentCpm: number, baseCpm: number): number {
  if (!Number.isFinite(currentCpm) || currentCpm <= 0) return 0;
  if (!Number.isFinite(baseCpm) || baseCpm <= 0) return 1;
  return clamp(currentCpm / baseCpm, 0, 2);
}

/* ── Battle bonuses interface ── */

export interface BattleBonuses {
  enemyAttackReduction: number;
  enemyDefenseReduction: number;
  dodgeBonus: number;
  playerAttackBonus: number;
  playerDamageBonus: number;
  dmgCoeff: number;
  defCoeff: number;
  critBonus: number;
}

/* ── Round resolution ── */

/**
 * Resolve one round of combat with the new formula system.
 */
export function resolveBattleRound(
  state: BattleState,
  accuracy: number,
  currentCpm: number,
  baseCpm: number,
  rhythmIntervals: number[],
  bonuses: BattleBonuses,
  random: () => number = Math.random,
): BattleState {
  if (state.finished) return state;
  const { phase, enemy } = state;
  const deltaCpm = computeDeltaCpm(currentCpm, baseCpm);
  const deltaRhythm = computeDeltaRhythm(rhythmIntervals);

  // Apply boss debuff
  let effectiveAcc = Number.isFinite(accuracy) ? clamp(accuracy, 0, 100) : 0;
  let effectiveDeltaCpm = deltaCpm;
  let effectiveDeltaRhythm = deltaRhythm;
  if (enemy.debuff === 'accuracy') effectiveAcc *= 0.85;
  if (enemy.debuff === 'cpm') effectiveDeltaCpm *= 0.75;
  if (enemy.debuff === 'rhythm') effectiveDeltaRhythm *= 0.6;

  // Effective enemy stats after bonuses
  const effectiveDefense = clamp(enemy.defense - bonuses.enemyDefenseReduction, 0, 75);
  const accFactor = effectiveAcc / 100;

  let hit = false;
  let damage = 0;
  let crit = false;
  let critMultiplier = 1;
  let hitChance = 100;
  let defensePoints = 0;

  if (phase === 'attack') {
    // ── Attack phase ──
    hit = effectiveAcc > 0 && effectiveDeltaCpm > 0;
    const rawDmg = (
      PLAYER_BASE_DMG_COEFF * (1 + bonuses.dmgCoeff) * effectiveDeltaCpm
      + bonuses.playerDamageBonus
      + bonuses.playerAttackBonus
    ) * accFactor;

    // Crit chance = (baseCritCoeff + artifactCritBonus) * Δrhythm
    const critChance = clamp(
      (PLAYER_BASE_CRIT_COEFF + bonuses.critBonus) * effectiveDeltaRhythm,
      0, 0.5,
    );
    crit = hit && random() < critChance;
    critMultiplier = crit ? CRIT_MULTIPLIER : 1;

    damage = hit ? Math.max(1, Math.round(rawDmg * critMultiplier * (1 - effectiveDefense / 100))) : 0;
  } else {
    // ── Defend phase ──
    const dodgeChance = clamp(bonuses.dodgeBonus, 0, 35);
    hitChance = 100 - dodgeChance;
    hit = random() * 100 >= dodgeChance;
    defensePoints = Math.max(0, Math.round(
      PLAYER_BASE_DEF_COEFF * (1 + bonuses.defCoeff) * effectiveDeltaCpm * accFactor,
    ));
    const tierRange = ENEMY_STAT_RANGES[enemy.tier ?? 'normal'] ?? ENEMY_STAT_RANGES.normal;
    const rawEnemyDmg = tierRange.baseDamage;
    const reducedEnemyDmg = Math.max(1, rawEnemyDmg - bonuses.enemyAttackReduction);
    damage = hit ? Math.max(1, reducedEnemyDmg - defensePoints) : 0;
  }

  const roundResult: BattleRoundResult = {
    phase,
    playerAccuracy: accuracy,
    hitChance,
    hit,
    damage,
    crit,
    critMultiplier,
    defensePoints,
  };

  const nextEnemy = { ...enemy };
  let nextPlayerHp = state.playerHp;

  if (phase === 'attack' && hit) {
    nextEnemy.hp = Math.max(0, nextEnemy.hp - damage);
  } else if (phase === 'defend' && hit) {
    nextPlayerHp = Math.max(0, nextPlayerHp - damage);
  }

  const enemyDead = nextEnemy.hp <= 0;
  const playerDead = nextPlayerHp <= 0;
  const finished = enemyDead || playerDead;

  // Next phase: alternate attack ↔ defend, advance round after defend
  let nextPhase: BattlePhase = phase === 'attack' ? 'defend' : 'attack';
  let nextRound = state.round;
  if (phase === 'defend') {
    nextRound += 1;
  }

  if (finished) {
    nextPhase = phase; // keep last phase
  }

  return {
    ...state,
    enemy: nextEnemy,
    playerHp: nextPlayerHp,
    phase: nextPhase,
    round: nextRound,
    roundResults: [...state.roundResults, roundResult],
    roundText: '',
    finished,
    won: enemyDead,
  };
}

/**
 * Determine the enemy tier from a map node kind.
 */
export function getEnemyTier(nodeKind: string): EnemyTier {
  if (nodeKind === 'boss') return 'boss';
  if (nodeKind === 'miniboss') return 'miniboss';
  if (nodeKind === 'elite') return 'elite';
  return 'normal';
}

/**
 * Sum enemy-related bonuses from items and modifiers.
 */
export function sumBattleBonuses(
  itemBonuses: {
    enemyAttackReduction: number; enemyDefenseReduction: number; dodgeBonus: number;
    playerAttackBonus: number; playerDamageBonus: number;
    dmgCoeff: number; defCoeff: number; critBonus: number;
  },
  modifierBonuses: {
    enemyAttackReduction: number; enemyDefenseReduction: number; dodgeBonus: number;
    playerAttackBonus: number; playerDamageBonus: number;
    dmgCoeff: number; defCoeff: number; critBonus: number;
  },
): BattleBonuses {
  return {
    enemyAttackReduction: itemBonuses.enemyAttackReduction + modifierBonuses.enemyAttackReduction,
    enemyDefenseReduction: itemBonuses.enemyDefenseReduction + modifierBonuses.enemyDefenseReduction,
    dodgeBonus: itemBonuses.dodgeBonus + modifierBonuses.dodgeBonus,
    playerAttackBonus: itemBonuses.playerAttackBonus + modifierBonuses.playerAttackBonus,
    playerDamageBonus: itemBonuses.playerDamageBonus + modifierBonuses.playerDamageBonus,
    dmgCoeff: itemBonuses.dmgCoeff + modifierBonuses.dmgCoeff,
    defCoeff: itemBonuses.defCoeff + modifierBonuses.defCoeff,
    critBonus: itemBonuses.critBonus + modifierBonuses.critBonus,
  };
}
