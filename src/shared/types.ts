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

export interface Lesson {
  name: string;
  keys: string[];
}

export interface Layout {
  label: string;
  lang: string;
  fingers: FingerMap;
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

export interface HistoryEntry {
  date: string;
  mode: 'test' | 'lesson' | 'practice';
  wpm: number;
  acc: number;
}

export interface PracticeState {
  unlocked: number;
  worstChar: string | null;
  sessionsToday: number;
  minutesToday: number;
  lastDate: string;
}

export interface UserSettings {
  speedUnit: 'wpm' | 'cpm' | 'cps';
  cursorStyle: 'underline' | 'block' | 'line';
  cursorSmooth: 'smooth' | 'instant';
  theme: string;
  language: string;    // language id, e.g. "en", "ru"
  layout: string;      // layout id, e.g. "qwerty", "йцукен"
  useYo: boolean;      // include ё (Russian only)
  showKeyboard: boolean;
  endWithSpace: boolean;
}

export type DailyGoalType = 'minutes' | 'sessions';
export type TextDisplayMode = 'block' | 'running';

export interface PracticeSettings {
  dailyGoalType: DailyGoalType;
  dailyGoalValue: number;
  noStepBack: boolean;
  textDisplay: TextDisplayMode;
}

export interface Progress {
  settings?: UserSettings;
  practiceSettings?: PracticeSettings;
  keyStats?: Record<string, Record<string, CharStat>>;
  history?: Record<string, HistoryEntry[]>;
  lessons?: Record<string, Record<number, number>>;
  practice?: Record<string, PracticeState>;
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
  mode: 'test' | 'lesson' | 'practice' | '';
  lessonIdx: number;
  errPositions: Set<number>;
}

export type SpeedUnit = 'wpm' | 'cpm' | 'cps';
export type FingerName = keyof FingerMap;

export interface ElectronAPI {
  getLayouts(): Promise<LayoutsData>;
  getWords(lang: string): Promise<string[]>;
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
