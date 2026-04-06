/* ═══════════════════════════════════════════════════════════
   Shared type definitions
   ═══════════════════════════════════════════════════════════ */

export interface FingerMap {
  index_left: string[];
  index_right: string[];
  middle_left: string[];
  middle_right: string[];
  ring_left: string[];
  ring_right: string[];
  pinky_left: string[];
  pinky_right: string[];
}

export type LessonType = 'keys' | 'row' | 'bigrams' | 'transitions' | 'rhythm';
export type LayoutRow = 'top' | 'middle' | 'bottom';

export interface LayoutRows {
  top: string[];
  middle: string[];
  bottom: string[];
}

export interface Lesson {
  id: string;
  name: string;
  keys: string[];
  section?: string;
  description?: string;
  type?: LessonType;
  row?: LayoutRow;
  bigramSet?: string;
  bigrams?: string[];
  transitionRows?: LayoutRow[];
  focusFingers?: FingerName[];
}

export interface Layout {
  label: string;
  lang: string;
  fingers: FingerMap;
  rows: LayoutRows;
  lessonOrder: Lesson[];
  practiceUnlockOrder: string[];
}

export interface LanguageInfo {
  id: string;
  label: string;
  wordsFile: string;          // e.g. "words_en.json"
}

export interface LayoutsData {
  languages: LanguageInfo[];
  layouts: Record<string, Layout>;
}

export interface CharStat {
  hits: number;
  misses: number;
  totalTime: number;
}

export interface SessionKeypress {
  position: number;
  expected: string;
  actual: string;
  correct: boolean;
  interval: number;
  timestamp: number;
}

export interface HistoryEntry {
  date: string;
  mode: 'test' | 'lesson' | 'practice' | 'game';
  wpm: number;
  acc: number;
  trainingMode?: PracticeTrainingMode;
  charStats?: Record<string, CharStat>;
}

export interface PracticeRhythmSessionEntry {
  id: string;
  date: string;
  trainingMode: PracticeTrainingMode;
  wpm: number;
  acc: number;
  textLength: number;
  intervals: number[];
  averageInterval: number;
  averageDeviation: number;
  rhythmScore: number;
  worstInterval: number;
}

export interface PracticeState {
  worstChar: string | null;
  sessionsToday: number;
  minutesToday: number;
  lastDate: string;
}

export interface LayoutProgressState {
  unlocked: number;
  unlockProgress: number;
}

export type PracticeInsightRow = 'top' | 'middle' | 'bottom';

export interface PracticeInsightAggregate {
  hits: number;
  misses: number;
  totalTime: number;
  weakness: number;
}

export interface PracticeBigramInsight {
  hits: number;
  misses: number;
  totalTransitionTime: number;
  weakness: number;
}

export interface PracticeRhythmInsight {
  samples: number;
  averageInterval: number;
  averageDeviation: number;
  weakness: number;
}

export interface LayoutPracticeInsights {
  chars: Record<string, PracticeInsightAggregate>;
  bigrams: Record<string, PracticeBigramInsight>;
  fingers: Partial<Record<keyof FingerMap, PracticeInsightAggregate>>;
  rows: Record<PracticeInsightRow, PracticeInsightAggregate>;
  rhythm: PracticeRhythmInsight;
  lastUpdated: string;
}

export interface PracticeInsightsState {
  byLayout: Record<string, LayoutPracticeInsights>;
}

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

export interface UserSettings {
  speedUnit: 'wpm' | 'cpm' | 'cps';
  cursorStyle: 'underline' | 'block' | 'line';
  cursorSmooth: 'smooth' | 'instant';
  highlightCurrentChar: boolean;
  textDisplay: TextDisplayMode;
  theme: string;
  language: string;    // language id, e.g. "en", "ru"
  layout: string;      // layout id, e.g. "qwerty", "йцукен"
  useYo: boolean;      // include ё (Russian only)
  showKeyboard: boolean;
  showHands: boolean;
  keyboardPanelHeight: number;
  keyboardPanelOffset: number;
  keyboardPanelZoom: number;
  endWithSpace: boolean;
  textFontSize: number;
}

export type DailyGoalType = 'minutes' | 'sessions';
export type TextDisplayMode = 'block' | 'running';
export type PracticeTrainingMode = 'normal' | 'rhythm';
export type PracticeAdaptationStrength = 'low' | 'medium' | 'high';
export type PracticeAdaptationFocus = 'balanced' | 'chars' | 'bigrams' | 'rhythm';

export interface PracticeSettings {
  dailyGoalType: DailyGoalType;
  dailyGoalValue: number;
  goalSpeedCpm: number;
  trainingMode: PracticeTrainingMode;
  smartAdaptationEnabled: boolean;
  smartAdaptationStrength: PracticeAdaptationStrength;
  smartAdaptationFocus: PracticeAdaptationFocus;
  noStepBack: boolean;
}

export interface Progress {
  settings?: UserSettings;
  practiceSettings?: PracticeSettings;
  keyStats?: Record<string, Record<string, CharStat>>;
  practiceInsights?: PracticeInsightsState;
  practiceRhythmHistory?: Record<string, PracticeRhythmSessionEntry[]>;
  history?: Record<string, HistoryEntry[]>;
  lessons?: Record<string, Record<number, number>>;
  layoutProgress?: Record<string, LayoutProgressState>;
  practice?: Record<string, PracticeState>;
  game?: GameState;
}

export interface CustomThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  subtext: string;
  accent: string;
  green: string;
  red: string;
  yellow: string;
}

export type CustomThemes = Record<string, CustomThemeColors>;

export interface Session {
  active: boolean;
  text: string;
  pos: number;
  errors: number;
  totalChars: number;
  startTime: number;
  charStats: Record<string, CharStat>;
  lastKeyTime: number;
  timer: ReturnType<typeof setInterval> | null;
  timerValue: number;
  mode: 'test' | 'lesson' | 'practice' | 'game' | '';
  lessonIdx: number;
  errPositions: Set<number>;
  keypresses: SessionKeypress[];
}

export type SpeedUnit = 'wpm' | 'cpm' | 'cps';
export type FingerName = keyof FingerMap;

export interface ElectronAPI {
  getLayouts(): Promise<LayoutsData>;
  getWords(lang: string): Promise<string[]>;
  getLessonBigrams(lang: string): Promise<Record<string, string[]>>;
  getProgress(): Promise<Progress>;
  saveProgress(data: Progress): Promise<boolean>;
  getCustomThemes(): Promise<CustomThemes>;
  saveCustomThemes(data: CustomThemes): Promise<boolean>;
  winMinimize(): void;
  winMaximize(): void;
  winClose(): void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
