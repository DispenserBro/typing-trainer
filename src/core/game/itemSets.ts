/**
 * Item set synergies — when a player equips items from the same set,
 * additional bonuses are granted.
 *
 * Sets are lightweight: each item can optionally belong to one set,
 * and synergy activates when 2+ items from that set are equipped.
 */

export type GameItemSetId = 'tempo' | 'fortress' | 'chrono' | 'gambler';

export interface GameItemSetBonus {
  /** Minimum items from the set required to activate this bonus */
  count: number;
  description: string;
  speedRequirementReductionPercent?: number;
  accuracyRequirementReduction?: number;
  bossTimerBonusSeconds?: number;
  extraLife?: boolean;
}

export interface GameItemSetDefinition {
  id: GameItemSetId;
  name: string;
  description: string;
  bonuses: GameItemSetBonus[];
}

export const GAME_ITEM_SETS: Record<GameItemSetId, GameItemSetDefinition> = {
  tempo: {
    id: 'tempo',
    name: 'Гармония темпа',
    description: 'Предметы, ускоряющие набор текста.',
    bonuses: [
      {
        count: 2,
        description: 'Дополнительно -3% к требуемой скорости',
        speedRequirementReductionPercent: 3,
      },
      {
        count: 3,
        description: 'Дополнительно -5% к требуемой скорости',
        speedRequirementReductionPercent: 5,
      },
    ],
  },
  fortress: {
    id: 'fortress',
    name: 'Щит точности',
    description: 'Предметы, помогающие не допускать ошибок.',
    bonuses: [
      {
        count: 2,
        description: 'Дополнительно -2% к требуемой точности',
        accuracyRequirementReduction: 2,
      },
      {
        count: 3,
        description: 'Дополнительно -4% к требуемой точности и +2 сек. к таймеру босса',
        accuracyRequirementReduction: 4,
        bossTimerBonusSeconds: 2,
      },
    ],
  },
  chrono: {
    id: 'chrono',
    name: 'Владыка времени',
    description: 'Предметы, дающие дополнительное время на боссах.',
    bonuses: [
      {
        count: 2,
        description: 'Дополнительно +3 сек. к таймеру босса',
        bossTimerBonusSeconds: 3,
      },
      {
        count: 3,
        description: 'Дополнительно +5 сек. к таймеру босса и -2% к скорости',
        bossTimerBonusSeconds: 5,
        speedRequirementReductionPercent: 2,
      },
    ],
  },
  gambler: {
    id: 'gambler',
    name: 'Фортуна рисковых',
    description: 'Мощные, но хрупкие артефакты. Вместе — ещё сильнее.',
    bonuses: [
      {
        count: 2,
        description: 'Дополнительно -4% к скорости и -2% к точности',
        speedRequirementReductionPercent: 4,
        accuracyRequirementReduction: 2,
      },
      {
        count: 3,
        description: 'Дополнительно -6% к скорости и -3% к точности',
        speedRequirementReductionPercent: 6,
        accuracyRequirementReduction: 3,
      },
    ],
  },
};

/** Map of itemId → setId for quick lookup */
export const ITEM_SET_MEMBERSHIP: Record<string, GameItemSetId> = {
  // tempo set
  'steady-gloves': 'tempo',
  'whisper-feather': 'tempo',
  'rabbit-step': 'tempo',
  'wind-sigil': 'tempo',
  // fortress set
  'focus-lens': 'fortress',
  'mirror-glasses': 'fortress',
  'warden-lock': 'fortress',
  'brain-lattice': 'fortress',
  // chrono set
  'path-compass': 'chrono',
  'storm-anchor': 'chrono',
  'rift-hourglass': 'chrono',
  'blessed-bulwark': 'chrono',
  // gambler set
  'overclock-core': 'gambler',
  'loaded-die': 'gambler',
  'ember-seal': 'gambler',
  'spark-capsule': 'gambler',
};

/**
 * Given a list of equipped item IDs, compute active set bonuses.
 */
export function computeSetBonuses(equippedItemIds: string[]): {
  activeSets: Array<{ set: GameItemSetDefinition; activeBonus: GameItemSetBonus; count: number }>;
  totalSpeedReduction: number;
  totalAccuracyReduction: number;
  totalBossTimerBonus: number;
} {
  // Count items per set
  const setCounts: Partial<Record<GameItemSetId, number>> = {};
  for (const itemId of equippedItemIds) {
    const setId = ITEM_SET_MEMBERSHIP[itemId];
    if (setId) {
      setCounts[setId] = (setCounts[setId] ?? 0) + 1;
    }
  }

  const activeSets: Array<{ set: GameItemSetDefinition; activeBonus: GameItemSetBonus; count: number }> = [];
  let totalSpeedReduction = 0;
  let totalAccuracyReduction = 0;
  let totalBossTimerBonus = 0;

  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = GAME_ITEM_SETS[setId as GameItemSetId];
    if (!setDef || !count) continue;

    // Find the highest matching bonus tier
    const matchingBonuses = setDef.bonuses
      .filter(bonus => count >= bonus.count)
      .sort((a, b) => b.count - a.count);

    const activeBonus = matchingBonuses[0];
    if (!activeBonus) continue;

    activeSets.push({ set: setDef, activeBonus, count });
    totalSpeedReduction += activeBonus.speedRequirementReductionPercent ?? 0;
    totalAccuracyReduction += activeBonus.accuracyRequirementReduction ?? 0;
    totalBossTimerBonus += activeBonus.bossTimerBonusSeconds ?? 0;
  }

  return {
    activeSets,
    totalSpeedReduction,
    totalAccuracyReduction,
    totalBossTimerBonus,
  };
}
