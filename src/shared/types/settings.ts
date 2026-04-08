export type SpeedUnit = 'wpm' | 'cpm' | 'cps';
export type TextDisplayMode = 'block' | 'running';
export type DailyGoalType = 'minutes' | 'sessions';
export type PracticeTrainingMode = 'normal' | 'rhythm';
export type PracticeAdaptationStrength = 'low' | 'medium' | 'high';
export type PracticeAdaptationFocus = 'balanced' | 'chars' | 'bigrams' | 'rhythm';

export interface UserSettings {
  speedUnit: SpeedUnit;
  cursorStyle: 'underline' | 'block' | 'line';
  cursorSmooth: 'smooth' | 'instant';
  highlightCurrentChar: boolean;
  textDisplay: TextDisplayMode;
  theme: string;
  language: string;
  layout: string;
  useYo: boolean;
  showKeyboard: boolean;
  showHands: boolean;
  keyboardPanelHeight: number;
  keyboardPanelOffset: number;
  keyboardPanelZoom: number;
  endWithSpace: boolean;
  textFontSize: number;
}

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
