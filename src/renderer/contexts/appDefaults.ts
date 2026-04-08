import type { GameState, PracticeSettings, UserSettings } from '../../shared/types';

export const BUILT_IN_THEMES = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light'];

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
    keyboardPanelHeight: normalizeKeyboardPanelHeight(s?.keyboardPanelHeight),
    keyboardPanelOffset: normalizeKeyboardPanelOffset(s?.keyboardPanelOffset),
    keyboardPanelZoom: normalizeKeyboardPanelZoom(s?.keyboardPanelZoom),
    endWithSpace: s?.endWithSpace ?? true,
    textFontSize: normalizeTextFontSize(s?.textFontSize ?? legacyTextFontSize),
  };
}

export function defaultPracticeSettings(p?: Partial<PracticeSettings>): PracticeSettings {
  return {
    dailyGoalType: p?.dailyGoalType ?? 'minutes',
    dailyGoalValue: p?.dailyGoalValue ?? 15,
    goalSpeedCpm: p?.goalSpeedCpm ?? 150,
    trainingMode: p?.trainingMode ?? 'normal',
    smartAdaptationEnabled: p?.smartAdaptationEnabled ?? true,
    smartAdaptationStrength: p?.smartAdaptationStrength ?? 'medium',
    smartAdaptationFocus: p?.smartAdaptationFocus ?? 'balanced',
    noStepBack: p?.noStepBack ?? false,
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
  };
}

export function createInventoryItemId() {
  return `itm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
