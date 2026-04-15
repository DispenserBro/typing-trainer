export type SpeedUnit = 'wpm' | 'cpm' | 'cps';
export type TextDisplayMode = 'block' | 'running';
export type DailyGoalType = 'minutes' | 'sessions';
export type PracticeTrainingMode = 'normal' | 'rhythm';
export type PracticeContentMode = 'adaptive-words' | 'syllables' | 'pseudo-words' | 'sentences' | 'custom';
export type PracticeAdaptationStrength = 'low' | 'medium' | 'high';
export type PracticeAdaptationFocus = 'balanced' | 'chars' | 'bigrams' | 'rhythm';
export type InterfaceDensity = 'compact' | 'default' | 'comfortable';
export type KeyboardPosition = 'bottom' | 'below-text';
export type ModePracticeSettingsId = 'test' | 'survival' | 'flawless';

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
  handsOpacity: number;
  keyStrokeWidth: number;
  keyboardPanelHeight: number;
  keyboardPanelOffset: number;
  keyboardPanelZoom: number;
  endWithSpace: boolean;
  textFontSize: number;
  focusMode: boolean;
  interfaceDensity: InterfaceDensity;
  largeText: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  showStats: boolean;
  showTextPanel: boolean;
  keyboardPosition: KeyboardPosition;
  colorVisionMode: string;
  onboardingCompleted: boolean;
}

export interface PracticeSettings {
  dailyGoalType: DailyGoalType;
  dailyGoalValue: number;
  goalSpeedCpm: number;
  trainingMode: PracticeTrainingMode;
  contentMode: PracticeContentMode;
  selectedContentPackId: string;
  smartAdaptationEnabled: boolean;
  smartAdaptationStrength: PracticeAdaptationStrength;
  smartAdaptationFocus: PracticeAdaptationFocus;
  noStepBack: boolean;
}

export interface ModePracticeSettings {
  contentMode?: PracticeContentMode;
  selectedContentPackId?: string;
  sprintDurationSeconds?: number;
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
  /** Дополнительные параметры (шрифт, радиус, анимация) — все необязательные для обратной совместимости */
  fontSans?: string;
  fontMono?: string;
  radius?: string;
  radiusSm?: string;
  transitionSpeed?: string;
}

export type CustomThemes = Record<string, CustomThemeColors>;

/** Ключи UserSettings, которые сохраняются в пресете интерфейса */
export type PresetSettingKey =
  | 'cursorStyle' | 'cursorSmooth' | 'highlightCurrentChar'
  | 'textDisplay' | 'theme' | 'showKeyboard' | 'showHands'
  | 'handsOpacity' | 'keyStrokeWidth' | 'keyboardPanelZoom'
  | 'endWithSpace' | 'textFontSize' | 'focusMode' | 'interfaceDensity'
  | 'largeText' | 'reducedMotion' | 'highContrast'
  | 'showStats' | 'showTextPanel' | 'keyboardPosition' | 'colorVisionMode';

export type PresetSettings = Pick<UserSettings, PresetSettingKey>;

export interface UserPreset {
  name: string;
  builtIn?: boolean;
  settings: PresetSettings;
}

export type CustomPresets = Record<string, UserPreset>;
