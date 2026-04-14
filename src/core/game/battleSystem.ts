// БОССЫ СЛЕГКА УСИЛЕНЫ (BOSS_HP_COEFF = 1.25)
/**
 * Battle System v2 — round-based attack/defense combat with CPM & rhythm mechanics.
 *
 * Formulas:
 *   ΔCPM = currentCPM / baseCPM (ratio, 1.0 = on target)
 *   Δrhythm = avgInterval / worstInterval → mapped from (0,1) to (0,3)
 *
 * Attack phase (player attacks enemy):
 *   damage = baseDmgCoeff * (1 + artifactDmgCoeff) * ΔCPM
 *   damage *= accuracyFactor (0.5..1.0)
 *   damage reduced by enemyDefense
 *   critChance = (baseCritCoeff + artifactCritBonus) * Δrhythm   (clamped 0-1)
 *   if crit: damage *= critMultiplier (2×)
 *
 * Defend phase (enemy attacks player):
 *   defPoints   = baseDefCoeff * (1 + artifactDefCoeff) * ΔCPM   (damage reduced)
 *   incomingDmg = max(1, enemyBaseDmg − enemyAttackReduction − defPoints)
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

/* ── Player base constants ── */

export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_DMG_COEFF = 10;
export const PLAYER_BASE_DEF_COEFF = 10;
export const PLAYER_BASE_CRIT_COEFF = 0.01;
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
    baseHp: 32,
    defenseMin: 15,
    defenseMax: 30,
    baseDamage: 8,
  },
  elite: {
    baseHp: 56,
    defenseMin: 25,
    defenseMax: 40,
    baseDamage: 12,
  },
  miniboss: {
    baseHp: 80,
    defenseMin: 30,
    defenseMax: 45,
    baseDamage: 15,
  },
  boss: {
    baseHp: 96,
    defenseMin: 35,
    defenseMax: 50,
    baseDamage: 18,
  },
};

const BOSS_HP_COEFF = 1.25;

const ENEMY_NAMES: Record<EnemyTier, string[]> = {
  normal: ['Скриптер', 'Часовой', 'Страж тропы', 'Дозорный', 'Тень кода'],
  elite: ['Палач темпа', 'Мастер клавиш', 'Стражник ритма', 'Адепт точности'],
  miniboss: ['Хранитель порога', 'Надзиратель', 'Титан строк'],
  boss: ['Вратарь ветви', 'Повелитель волн', 'Архонт скорости', 'Абсолют'],
};

const BOSS_DEBUFFS: BossDebuff[] = ['cpm', 'accuracy', 'rhythm'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* ── Enemy creation ── */

/**
 * Progressive HP scaling: base * (1 + level * 0.06)
 * Boss HP = scaled HP * BOSS_HP_COEFF
 */
export function createEnemy(tier: EnemyTier, level: number): EnemyStats {
  const range = ENEMY_STAT_RANGES[tier];
  const hpScaling = 1 + level * 0.06;
  let hp = Math.round(range.baseHp * hpScaling);
  if (tier === 'boss') {
    hp = Math.round(hp * BOSS_HP_COEFF);
  }
  const defense = randInt(range.defenseMin, range.defenseMax);
  const name = randFrom(ENEMY_NAMES[tier]);
  const debuff = tier === 'boss' ? randFrom(BOSS_DEBUFFS) : null;

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
 * Δrhythm = avgInterval / worstInterval (worst = max deviation from mean).
 * Raw value in (0, 1) is mapped linearly to (0, 3).
 *
 * Perfect rhythm → ratio close to 1 → mapped to 3.
 * Terrible rhythm → ratio close to 0 → mapped to 0.
 */
export function computeDeltaRhythm(intervals: number[]): number {
  if (intervals.length < 2) return 1.5; // neutral default
  const filtered = intervals.filter(ms => ms > 0 && ms < 2000);
  if (filtered.length < 2) return 1.5;

  const avg = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  const worst = Math.max(...filtered.map(v => Math.abs(v - avg)));
  if (worst <= 0) return 3; // perfectly uniform

  const raw = clamp(avg / (avg + worst), 0, 1); // normalized (0,1)
  return raw * 3; // mapped to (0,3)
}

/**
 * Compute ΔCPM ratio.
 * ΔCPM = currentCPM / baseCPM  (1.0 = on target, >1 = faster, <1 = slower)
 * Clamped to (0.2, 3.0) to avoid extremes.
 */
export function computeDeltaCpm(currentCpm: number, baseCpm: number): number {
  if (baseCpm <= 0) return 1;
  return clamp(currentCpm / baseCpm, 0.2, 3.0);
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
): BattleState {
  const { phase, enemy } = state;
  const deltaCpm = computeDeltaCpm(currentCpm, baseCpm);
  const deltaRhythm = computeDeltaRhythm(rhythmIntervals);

  // Apply boss debuff
  let effectiveAcc = accuracy;
  let effectiveDeltaCpm = deltaCpm;
  let effectiveDeltaRhythm = deltaRhythm;
  if (enemy.debuff === 'accuracy') effectiveAcc *= 0.85;
  if (enemy.debuff === 'cpm') effectiveDeltaCpm *= 0.75;
  if (enemy.debuff === 'rhythm') effectiveDeltaRhythm *= 0.6;

  // Effective enemy stats after bonuses
  const effectiveDefense = Math.max(0, enemy.defense - bonuses.enemyDefenseReduction);

  let hit = false;
  let damage = 0;
  let crit = false;
  let critMultiplier = 1;
  const hitChance = 100;
  let defensePoints = 0;

  if (phase === 'attack') {
    // ── Attack phase ──
    hit = true;
    const accFactor = clamp(effectiveAcc / 100, 0.5, 1);
    const rawDmg = (
      PLAYER_BASE_DMG_COEFF * (1 + bonuses.dmgCoeff) * effectiveDeltaCpm
      + bonuses.playerDamageBonus
      + bonuses.playerAttackBonus
    ) * accFactor;

    // Crit chance = (baseCritCoeff + artifactCritBonus) * Δrhythm
    const critChance = clamp(
      (PLAYER_BASE_CRIT_COEFF + bonuses.critBonus) * effectiveDeltaRhythm,
      0, 1,
    );
    crit = Math.random() < critChance;
    critMultiplier = crit ? CRIT_MULTIPLIER : 1;

    damage = Math.round(rawDmg * critMultiplier) - effectiveDefense;
    if (damage < 1) damage = 1;
  } else {
    // ── Defend phase ──
    hit = true;
    defensePoints = Math.round(
      PLAYER_BASE_DEF_COEFF * (1 + bonuses.defCoeff) * effectiveDeltaCpm,
    );
    const tierRange = ENEMY_STAT_RANGES[enemy.tier ?? 'normal'] ?? ENEMY_STAT_RANGES.normal;
    const rawEnemyDmg = tierRange.baseDamage;
    const reducedEnemyDmg = Math.max(1, rawEnemyDmg - bonuses.enemyAttackReduction);
    damage = Math.max(1, reducedEnemyDmg - defensePoints);
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
