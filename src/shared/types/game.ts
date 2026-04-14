export type GameItemRarity = 1 | 2 | 3;
export type GameItemSlotType = 'trinket';
export type GameEquipmentSlot = 'slotA' | 'slotB' | 'slotC';
export type GameItemEffectKind = 'speed' | 'accuracy' | 'timer' | 'lives' | 'reward' | 'enemyAttack' | 'enemyDefense' | 'dodge' | 'playerAttack' | 'playerDamage' | 'dmgCoeff' | 'defCoeff' | 'critBonus';
export type GameItemRewardKind = 'simple' | 'durable';

export interface GameItemEffect {
  kind: GameItemEffectKind;
  value: number;
  unit: 'flat' | 'percent' | 'seconds';
  description: string;
}

export interface GameDurabilityRules {
  normalPass: number;
  normalFail: number;
  bossPass: number;
  bossFail: number;
}

export interface GameItemDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  rarity: GameItemRarity;
  slotType: GameItemSlotType;
  icon: string;
  rewardKind: GameItemRewardKind;
  bossOnly?: boolean;
  speedRequirementReductionPercent?: number;
  accuracyRequirementReduction?: number;
  bossTimerBonusSeconds?: number;
  /** Снижает атаку врагов (абсолютное значение) */
  enemyAttackReduction?: number;
  /** Снижает защиту врагов (абсолютное значение) */
  enemyDefenseReduction?: number;
  /** Бонус к уклонению игрока (абсолютное значение) */
  dodgeBonus?: number;
  /** Бонус к урону игрока при атаке (абсолютное значение, +N к броску) */
  playerAttackBonus?: number;
  /** Бонус к величине урона при успешном ударе (+N HP снимается за попадание) */
  playerDamageBonus?: number;
  /** Множитель коэффициента урона (доля, 0.15 = +15%) */
  dmgCoeff?: number;
  /** Множитель коэффициента защиты (доля, 0.15 = +15%) */
  defCoeff?: number;
  /** Бонус к шансу крита (абсолютное значение, 0.05 = +5%) */
  critBonus?: number;
  maxDurability?: number | null;
  durabilityRules?: GameDurabilityRules | null;
  effects: GameItemEffect[];
}

export interface GameInventoryItem {
  id: string;
  itemId: string;
  durability: number | null;
  maxDurability: number | null;
}

export interface GameEquipmentState {
  slotA: string | null;
  slotB: string | null;
  slotC: string | null;
}

/** Категория достижения — совпадает с режимом приложения. Расширяема модами. */
export type AchievementCategory = 'game' | 'practice' | 'lessons' | 'test' | string;

/**
 * Сериализованное условие выполнения достижения.
 * Позволяет аддонам / модам добавлять выполнимые достижения без кода на стороне ядра.
 */
export type AchievementCondition = {
  type: string;
  [key: string]: any;
};

export interface GameAchievementDefinition {
  id: string;
  name: string;
  description: string;
  /** Категория достижения (по умолчанию 'game' для обратной совместимости). */
  category: AchievementCategory;
  /** Сериализованные условия — все должны быть выполнены. */
  conditions?: AchievementCondition[];
}

export type GameEventKind = 'rest' | 'cache' | 'risk' | 'shop' | 'curse';
export type GameRouteNodeKind = 'battle' | 'rest' | 'treasure' | 'shop' | 'risk' | 'elite' | 'miniboss';
export type GameMapNodeKind = 'battle' | 'boss' | 'rest' | 'treasure' | 'shop' | 'risk' | 'elite' | 'miniboss';

/* ── Боевая система: атака и защита ── */

export type BattlePhase = 'attack' | 'defend';

/** Характеристики врага для боевой системы */
export interface EnemyStats {
  name: string;
  tier: EnemyTier;
  maxHp: number;
  hp: number;
  /** Шанс попадания врага (0-100), оставлен для совместимости */
  hitChance: number;
  /** Защита врага (0-100) */
  defense: number;
  /** Тип дебаффа для боссов: ослабляет один параметр игрока */
  debuff?: BossDebuff | null;
}

/** Дебафф босса — ослабляет один параметр игрока на время боя */
export type BossDebuff = 'cpm' | 'accuracy' | 'rhythm';

/** Результат одного раунда боя */
export interface BattleRoundResult {
  phase: BattlePhase;
  playerAccuracy: number;
  hitChance: number;
  hit: boolean;
  damage: number;
  /** Был ли критический удар */
  crit: boolean;
  /** Множитель крита (1 = нет крита, >1 = был крит) */
  critMultiplier: number;
  /** Очки защиты (фаза defend) */
  defensePoints: number;
}

/** Полное состояние боя для одного уровня */
export interface BattleState {
  enemy: EnemyStats;
  playerHp: number;
  playerMaxHp: number;
  phase: BattlePhase;
  round: number;
  roundResults: BattleRoundResult[];
  /** Текст текущего раунда */
  roundText: string;
  /** Был ли бой завершён (враг или игрок повержен) */
  finished: boolean;
  /** Победил ли игрок */
  won: boolean;
}

/** Тип врага — определяет диапазоны атаки/защиты */
export type EnemyTier = 'normal' | 'elite' | 'miniboss' | 'boss';

export interface GameRunModifier {
  id: string;
  name: string;
  description: string;
  speedRequirementReductionPercent?: number;
  accuracyRequirementReduction?: number;
  bossTimerBonusSeconds?: number;
  /** Снижает атаку врагов */
  enemyAttackReduction?: number;
  /** Снижает защиту врагов */
  enemyDefenseReduction?: number;
  /** Бонус к уклонению игрока */
  dodgeBonus?: number;
  /** Бонус к урону игрока при атаке */
  playerAttackBonus?: number;
  /** Бонус к величине урона при успешном ударе */
  playerDamageBonus?: number;
  /** Множитель коэффициента урона */
  dmgCoeff?: number;
  /** Множитель коэффициента защиты */
  defCoeff?: number;
  /** Бонус к шансу крита */
  critBonus?: number;
  bossOnly?: boolean;
  remainingLevels: number;
}

export interface GameRunEventChoiceEffect {
  /** Изменение текущего HP */
  lifeDelta?: number;
  /** Увеличить максимальное HP на N */
  maxLifeDelta?: number;
  /** Полностью восстановить здоровье */
  fullHeal?: boolean;
  /** Регенерировать часть HP после боя на N боёв */
  regenTurns?: number;
  repairEquippedBy?: number;
  grantItemId?: string | null;
  modifier?: GameRunModifier | null;
}

export interface GameRunEventChoice {
  id: string;
  title: string;
  flavor: string;
  description: string;
  effect: GameRunEventChoiceEffect;
  disabled?: boolean;
}

export interface GameRunEventState {
  id: string;
  kind: GameEventKind;
  title: string;
  description: string;
  sourceLevel: number;
  choices: GameRunEventChoice[];
  resolvedChoiceId?: string | null;
  resultText?: string | null;
}

export interface GameRunRouteChoice {
  id: string;
  kind: GameRouteNodeKind;
  title: string;
  flavor: string;
  description: string;
  lane: number;
  column: number;
  disabled?: boolean;
}

export interface GameRunRouteLink {
  fromId: string;
  toId: string;
}

export interface GameRunRouteState {
  id: string;
  sourceLevel: number;
  choices: GameRunRouteChoice[];
  links: GameRunRouteLink[];
  selectableChoiceIds: string[];
  resolvedChoiceId?: string | null;
  resultText?: string | null;
}

export interface GameRunMapNode {
  id: string;
  kind: GameMapNodeKind;
  title: string;
  flavor: string;
  description: string;
  column: number;
  lane: number;
  battleLevel?: number | null;
}

export interface GameRunMapState {
  nodes: GameRunMapNode[];
  links: GameRunRouteLink[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
  selectableNodeIds: string[];
}

export interface GameRunRewardChoice {
  id: string;
  kind: 'letter' | 'simple' | 'durable' | 'event';
  title: string;
  flavor: string;
  description: string;
  itemId?: string;
  letter?: string | null;
  /** Эффект события (для kind='event') */
  effect?: GameRunEventChoiceEffect | null;
  disabled?: boolean;
}

export type BossArchetypeId = 'precision' | 'steadiness' | 'endurance' | 'flawless';

export interface GameRunResult {
  wpm: number;
  acc: number;
  passed: boolean;
  livesLeft: number;
  level: number;
  isBoss: boolean;
  bossArchetype: BossArchetypeId | null;
  minAccuracy: number;
  maxErrors: number | null;
  rhythmDeviation: number | null;
  maxRhythmDeviation: number | null;
  timedOut: boolean;
  elapsed: number;
  timeLimitSeconds: number | null;
  victory: boolean;
  brokenItems: string[];
}

export interface GameRunState {
  level: number;
  /** Текущее HP забега */
  lives: number;
  /** Максимальное HP (начинается с baseHp, может расти через передышки) */
  maxLives: number;
  /** Оставшиеся раунды регенерации (восстановление 1 HP после боя) */
  regenTurns: number;
  completedLevels: number;
  targetSpeedCpm: number;
  levelText: string;
  activeModifiers: GameRunModifier[];
  /** Текущее состояние боя (null если бой не идёт) */
  battleState: BattleState | null;
  map: GameRunMapState | null;
  pendingRoute: GameRunRouteState | null;
  pendingEvent: GameRunEventState | null;
  result: GameRunResult | null;
  rewardChoices: GameRunRewardChoice[] | null;
  selectedRewardMessage: string | null;
  /** If this run uses a daily seed, store the seed string */
  dailySeed: string | null;
}

/** Ghost snapshot saved per level for comparison */
export interface GameGhostLevelEntry {
  level: number;
  wpm: number;
  acc: number;
  elapsed: number;
  passed: boolean;
}

/** Ghost data persisted between runs */
export interface GameGhostRun {
  /** ISO date when this ghost run was recorded */
  date: string;
  /** Levels reached in the ghost run */
  maxLevel: number;
  /** Per-level entries */
  levels: GameGhostLevelEntry[];
}

/** Daily run result saved per day */
export interface GameDailyRunResult {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Highest level reached */
  maxLevel: number;
  /** Total completed levels */
  completedLevels: number;
  /** Best WPM across the run */
  bestWpm: number;
  /** Average accuracy */
  avgAcc: number;
  /** Total time in seconds */
  totalTime: number;
  /** Number of attempts this day */
  attempts: number;
}

/** Daily run history */
export interface GameDailyRunState {
  /** Results keyed by ISO date */
  history: Record<string, GameDailyRunResult>;
}

export interface GameState {
  highestLevel: number;
  inventory: GameInventoryItem[];
  discoveredItemIds: string[];
  achievements: string[];
  equipped: GameEquipmentState;
  currentRun?: GameRunState | null;
  /** Ghost of previous best run */
  ghostRun?: GameGhostRun | null;
  /** Daily run state */
  dailyRun?: GameDailyRunState | null;
}
