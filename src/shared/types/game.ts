export type GameItemRarity = 1 | 2 | 3;
export type GameItemSlotType = 'trinket';
export type GameEquipmentSlot = 'slotA' | 'slotB' | 'slotC';
export type GameItemEffectKind = 'speed' | 'accuracy' | 'timer' | 'lives' | 'reward';
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

export interface GameAchievementDefinition {
  id: string;
  name: string;
  description: string;
}

export type GameEventKind = 'rest' | 'cache' | 'risk' | 'shop';
export type GameRouteNodeKind = 'battle' | 'rest' | 'treasure' | 'shop' | 'risk';
export type GameMapNodeKind = 'battle' | 'boss' | 'rest' | 'treasure' | 'shop' | 'risk';

export interface GameRunModifier {
  id: string;
  name: string;
  description: string;
  speedRequirementReductionPercent?: number;
  accuracyRequirementReduction?: number;
  bossTimerBonusSeconds?: number;
  bossOnly?: boolean;
  remainingLevels: number;
}

export interface GameRunEventChoiceEffect {
  lifeDelta?: number;
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
  kind: 'letter' | 'simple' | 'durable';
  title: string;
  flavor: string;
  description: string;
  itemId?: string;
  letter?: string | null;
  disabled?: boolean;
}

export interface GameRunResult {
  wpm: number;
  acc: number;
  passed: boolean;
  livesLeft: number;
  level: number;
  isBoss: boolean;
  minAccuracy: number;
  timedOut: boolean;
  elapsed: number;
  timeLimitSeconds: number | null;
  victory: boolean;
  brokenItems: string[];
}

export interface GameRunState {
  level: number;
  lives: number;
  completedLevels: number;
  targetSpeedCpm: number;
  levelText: string;
  activeModifiers: GameRunModifier[];
  map: GameRunMapState | null;
  pendingRoute: GameRunRouteState | null;
  pendingEvent: GameRunEventState | null;
  result: GameRunResult | null;
  rewardChoices: GameRunRewardChoice[] | null;
  selectedRewardMessage: string | null;
}

export interface GameState {
  highestLevel: number;
  inventory: GameInventoryItem[];
  discoveredItemIds: string[];
  achievements: string[];
  equipped: GameEquipmentState;
  currentRun?: GameRunState | null;
}
