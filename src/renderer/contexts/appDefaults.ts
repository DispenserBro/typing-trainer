import type {
  GameState,
  ModePracticeSettings,
  PracticeSettings,
  PresetSettings,
  UserPreset,
  UserSettings,
} from '../../shared/types';

export const BUILT_IN_THEMES = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light'];

export const BUILT_IN_PRESETS: Record<string, UserPreset> = {
  learning: {
    name: 'Обучение',
    builtIn: true,
    settings: {
      cursorStyle: 'underline', cursorSmooth: 'smooth', highlightCurrentChar: true,
      textDisplay: 'block', theme: 'dark-orange', showKeyboard: true, showHands: true,
      handsOpacity: 72, keyStrokeWidth: 1.5, keyboardPanelZoom: 100,
      endWithSpace: true, textFontSize: 1.125, focusMode: false, interfaceDensity: 'default',
      largeText: false, reducedMotion: false, highContrast: false,
      showStats: true, showTextPanel: true, keyboardPosition: 'bottom', colorVisionMode: 'normal',
    },
  },
  speed: {
    name: 'Скоростная тренировка',
    builtIn: true,
    settings: {
      cursorStyle: 'line', cursorSmooth: 'smooth', highlightCurrentChar: true,
      textDisplay: 'running', theme: 'dark-orange', showKeyboard: false, showHands: false,
      handsOpacity: 72, keyStrokeWidth: 1.5, keyboardPanelZoom: 100,
      endWithSpace: true, textFontSize: 1.3, focusMode: true, interfaceDensity: 'compact',
      largeText: false, reducedMotion: false, highContrast: false,
      showStats: false, showTextPanel: true, keyboardPosition: 'bottom', colorVisionMode: 'normal',
    },
  },
  game: {
    name: 'Игра',
    builtIn: true,
    settings: {
      cursorStyle: 'block', cursorSmooth: 'smooth', highlightCurrentChar: true,
      textDisplay: 'block', theme: 'dark-orange', showKeyboard: true, showHands: false,
      handsOpacity: 72, keyStrokeWidth: 1.5, keyboardPanelZoom: 80,
      endWithSpace: true, textFontSize: 1.125, focusMode: false, interfaceDensity: 'default',
      largeText: false, reducedMotion: false, highContrast: false,
      showStats: true, showTextPanel: true, keyboardPosition: 'bottom', colorVisionMode: 'normal',
    },
  },
};

export function extractPresetSettings(s: UserSettings): PresetSettings {
  return {
    cursorStyle: s.cursorStyle, cursorSmooth: s.cursorSmooth,
    highlightCurrentChar: s.highlightCurrentChar, textDisplay: s.textDisplay,
    theme: s.theme, showKeyboard: s.showKeyboard, showHands: s.showHands,
    handsOpacity: s.handsOpacity, keyStrokeWidth: s.keyStrokeWidth,
    keyboardPanelZoom: s.keyboardPanelZoom, endWithSpace: s.endWithSpace,
    textFontSize: s.textFontSize, focusMode: s.focusMode,
    interfaceDensity: s.interfaceDensity,
    largeText: s.largeText, reducedMotion: s.reducedMotion, highContrast: s.highContrast,
    showStats: s.showStats, showTextPanel: s.showTextPanel,
    keyboardPosition: s.keyboardPosition, colorVisionMode: s.colorVisionMode,
  };
}

export function normalizeTextFontSize(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return 1.125;
  return value > 4 ? value / 16 : value;
}

export function normalizeKeyboardPanelHeight(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 292;
  return Math.max(22, Math.min(520, Math.round(value)));
}

export function normalizeKeyboardPanelOffset(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const normalized = Math.abs(value) > 100
    ? Math.round((value / 220) * 100)
    : Math.round(value);
  return Math.max(-100, Math.min(100, normalized));
}

export function normalizeKeyboardPanelZoom(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 100;
  return Math.max(10, Math.min(300, Math.round(value)));
}

export function defaultSettings(s?: Partial<UserSettings>): UserSettings {
  const legacyTextFontSize = (s as (Partial<UserSettings> & { gameTextFontSize?: number }) | undefined)?.gameTextFontSize;

  return {
    speedUnit: s?.speedUnit ?? 'cpm',
    cursorStyle: s?.cursorStyle ?? 'underline',
    cursorSmooth: s?.cursorSmooth ?? 'smooth',
    highlightCurrentChar: s?.highlightCurrentChar ?? true,
    textDisplay: s?.textDisplay ?? 'block',
    theme: s?.theme ?? 'dark-orange',
    language: s?.language ?? '',
    layout: s?.layout ?? '',
    useYo: s?.useYo ?? false,
    showKeyboard: s?.showKeyboard ?? true,
    showHands: s?.showHands ?? true,
    handsOpacity: Math.max(0, Math.min(100, Math.round(s?.handsOpacity ?? 72))),
    keyStrokeWidth: Math.max(0, Math.min(4, s?.keyStrokeWidth ?? 1.5)),
    keyboardPanelHeight: normalizeKeyboardPanelHeight(s?.keyboardPanelHeight),
    keyboardPanelOffset: normalizeKeyboardPanelOffset(s?.keyboardPanelOffset),
    keyboardPanelZoom: normalizeKeyboardPanelZoom(s?.keyboardPanelZoom),
    endWithSpace: s?.endWithSpace ?? true,
    textFontSize: normalizeTextFontSize(s?.textFontSize ?? legacyTextFontSize),
    focusMode: s?.focusMode ?? false,
    interfaceDensity: s?.interfaceDensity ?? 'default',
    largeText: s?.largeText ?? false,
    reducedMotion: s?.reducedMotion ?? false,
    highContrast: s?.highContrast ?? false,
    showStats: s?.showStats ?? true,
    showTextPanel: s?.showTextPanel ?? true,
    keyboardPosition: s?.keyboardPosition ?? 'bottom',
    colorVisionMode: s?.colorVisionMode ?? 'normal',
    onboardingCompleted: s?.onboardingCompleted ?? false,
  };
}

export function defaultPracticeSettings(p?: Partial<PracticeSettings>): PracticeSettings {
  const legacy = p as (Partial<PracticeSettings> & { selectedCustomContentId?: string }) | undefined;
  return {
    dailyGoalType: p?.dailyGoalType ?? 'minutes',
    dailyGoalValue: p?.dailyGoalValue ?? 15,
    goalSpeedCpm: p?.goalSpeedCpm ?? 150,
    trainingMode: p?.trainingMode ?? 'normal',
    contentMode: p?.contentMode ?? 'adaptive-words',
    selectedContentPackId: p?.selectedContentPackId ?? legacy?.selectedCustomContentId ?? '',
    smartAdaptationEnabled: p?.smartAdaptationEnabled ?? true,
    smartAdaptationStrength: p?.smartAdaptationStrength ?? 'medium',
    smartAdaptationFocus: p?.smartAdaptationFocus ?? 'balanced',
    noStepBack: p?.noStepBack ?? false,
  };
}

export function defaultModePracticeSettings(settings?: Partial<ModePracticeSettings>): ModePracticeSettings {
  const sprintDurationSeconds = settings?.sprintDurationSeconds == null
    ? undefined
    : Math.max(15, Math.min(60, Math.round(settings.sprintDurationSeconds / 15) * 15));

  return {
    contentMode: settings?.contentMode,
    selectedContentPackId: settings?.selectedContentPackId ?? '',
    sprintDurationSeconds,
  };
}

export function defaultGameState(game?: Partial<GameState>): GameState {
  const equipped = (game?.equipped ?? {}) as Partial<
    GameState['equipped'] & Record<'active' | 'passiveA' | 'passiveB', string | null>
  >;
  const hasSlotA = Object.prototype.hasOwnProperty.call(equipped, 'slotA');
  const hasSlotB = Object.prototype.hasOwnProperty.call(equipped, 'slotB');
  const hasSlotC = Object.prototype.hasOwnProperty.call(equipped, 'slotC');

  return {
    highestLevel: Math.max(1, Math.floor(game?.highestLevel ?? 1)),
    inventory: Array.isArray(game?.inventory) ? game.inventory : [],
    discoveredItemIds: Array.isArray(game?.discoveredItemIds) ? game.discoveredItemIds : [],
    achievements: Array.isArray(game?.achievements) ? game.achievements : [],
    equipped: {
      slotA: hasSlotA ? (equipped.slotA ?? null) : (equipped.active ?? null),
      slotB: hasSlotB ? (equipped.slotB ?? null) : (equipped.passiveA ?? null),
      slotC: hasSlotC ? (equipped.slotC ?? null) : (equipped.passiveB ?? null),
    },
    currentRun: game?.currentRun ?? null,
    ghostRun: game?.ghostRun ?? null,
    dailyRun: game?.dailyRun ?? null,
  };
}

export function createInventoryItemId() {
  return `itm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
