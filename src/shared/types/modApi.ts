import type { AddonInterfaceLocaleDefinition } from './addon';
import type { GameAchievementDefinition, GameState, GameItemDefinition } from './game';
import type { Lesson } from './layout';
import type { HistoryEntry, Session, SessionKeypress } from './practice';
import type { PracticeSettings, UserSettings } from './settings';

export const MOD_PERMISSIONS = [
  'sections',
  'settings',
  'items',
  'achievements',
  'rules',
  'ui',
  'events',
  'words',
  'lessons',
  'i18n',
  'modes',
] as const;

/**
 * What a mod is allowed to do. The manifest declares these permissions so the
 * user can review them before enabling the mod.
 */
export type ModPermission = typeof MOD_PERMISSIONS[number];

export function isModPermission(value: unknown): value is ModPermission {
  return typeof value === 'string' && (MOD_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeModPermissions(value: unknown): ModPermission[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ModPermission>();
  const permissions: ModPermission[] = [];
  for (const entry of value) {
    if (!isModPermission(entry) || seen.has(entry)) continue;
    seen.add(entry);
    permissions.push(entry);
  }
  return permissions;
}

export interface ModSessionStartEvent {
  mode: Session['mode'];
  textLength: number;
  lessonIndex: number | null;
}

export interface ModSessionFinishEvent {
  layoutId: string;
  entry: HistoryEntry;
}

export interface ModKeyPressEvent {
  mode: Session['mode'];
  lessonIndex: number | null;
  textLength: number;
  keypress: SessionKeypress;
}

export interface ModModeSwitchEvent {
  fromMode: string;
  toMode: string;
}

export type ModSettingChangeEvent =
  | {
    scope: 'user';
    key: keyof UserSettings;
    previousValue: UserSettings[keyof UserSettings];
    nextValue: UserSettings[keyof UserSettings];
  }
  | {
    scope: 'practice';
    key: keyof PracticeSettings;
    previousValue: PracticeSettings[keyof PracticeSettings];
    nextValue: PracticeSettings[keyof PracticeSettings];
  };

export interface ModLessonCompleteEvent {
  layoutId: string;
  lessonId: string;
  lessonName: string;
  lessonIndex: number;
  section: string | null;
  sectionCompleted: boolean;
  allCompleted: boolean;
}

export interface ModGameStateChangeEvent {
  previousState: GameState;
  nextState: GameState;
}

export interface ModEventPayloadMap {
  sessionStart: ModSessionStartEvent;
  sessionFinish: ModSessionFinishEvent;
  keyPress: ModKeyPressEvent;
  modeSwitch: ModModeSwitchEvent;
  settingChange: ModSettingChangeEvent;
  lessonComplete: ModLessonCompleteEvent;
  gameStateChange: ModGameStateChangeEvent;
}

export type ModEventName = keyof ModEventPayloadMap;
export type ModEventHandler<K extends ModEventName = ModEventName> = (data: ModEventPayloadMap[K]) => void;

export const MOD_EVENT_NAMES = [
  'sessionStart',
  'sessionFinish',
  'keyPress',
  'modeSwitch',
  'settingChange',
  'lessonComplete',
  'gameStateChange',
] as const satisfies readonly ModEventName[];

export function isModEventName(value: unknown): value is ModEventName {
  return typeof value === 'string' && (MOD_EVENT_NAMES as readonly string[]).includes(value);
}

export interface ModRuleValueMap {
  'game.baseHp': number;
  'game.baseLives': number;
}

export type ModRuleId = keyof ModRuleValueMap;
export type ModRuleValue = ModRuleValueMap[ModRuleId];

export const MOD_RULE_IDS = [
  'game.baseHp',
  'game.baseLives',
] as const satisfies readonly ModRuleId[];

export function isModRuleId(value: unknown): value is ModRuleId {
  return typeof value === 'string' && (MOD_RULE_IDS as readonly string[]).includes(value);
}

export function isModRuleValue(ruleId: ModRuleId, value: unknown): value is ModRuleValue {
  switch (ruleId) {
    case 'game.baseHp':
    case 'game.baseLives':
      return typeof value === 'number' && Number.isFinite(value);
    default:
      return false;
  }
}

export interface ModSectionsAPI {
  disable(sectionId: string): void;
  enable(sectionId: string): void;
  getDisabled(): string[];
}

export interface ModSettingsAPI {
  override<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void;
  removeOverride(key: string): void;
  get<K extends keyof UserSettings>(key: K): UserSettings[K];
}

export const MOD_USER_SETTING_KEYS = [
  'speedUnit',
  'cursorStyle',
  'cursorSmooth',
  'highlightCurrentChar',
  'textDisplay',
  'theme',
  'interfaceLanguage',
  'language',
  'layout',
  'useYo',
  'showKeyboard',
  'showHands',
  'handsOpacity',
  'keyStrokeWidth',
  'keyboardPanelHeight',
  'keyboardPanelOffset',
  'keyboardPanelZoom',
  'endWithSpace',
  'textFontSize',
  'focusMode',
  'interfaceDensity',
  'largeText',
  'reducedMotion',
  'highContrast',
  'showStats',
  'showTextPanel',
  'keyboardPosition',
  'colorVisionMode',
  'onboardingCompleted',
] as const satisfies readonly (keyof UserSettings)[];

export function isModUserSettingKey(value: unknown): value is keyof UserSettings {
  return typeof value === 'string' && (MOD_USER_SETTING_KEYS as readonly string[]).includes(value);
}

const MOD_SPEED_UNITS = ['wpm', 'cpm', 'cps'] as const;
const MOD_CURSOR_STYLES = ['underline', 'block', 'line'] as const;
const MOD_CURSOR_SMOOTH_MODES = ['smooth', 'instant'] as const;
const MOD_TEXT_DISPLAY_MODES = ['block', 'running'] as const;
const MOD_INTERFACE_DENSITIES = ['compact', 'default', 'comfortable'] as const;
const MOD_KEYBOARD_POSITIONS = ['bottom', 'below-text'] as const;

export function isModUserSettingValue<K extends keyof UserSettings>(
  key: K,
  value: unknown,
): value is UserSettings[K] {
  switch (key) {
    case 'speedUnit':
      return isOneOf(MOD_SPEED_UNITS, value);
    case 'cursorStyle':
      return isOneOf(MOD_CURSOR_STYLES, value);
    case 'cursorSmooth':
      return isOneOf(MOD_CURSOR_SMOOTH_MODES, value);
    case 'textDisplay':
      return isOneOf(MOD_TEXT_DISPLAY_MODES, value);
    case 'interfaceDensity':
      return isOneOf(MOD_INTERFACE_DENSITIES, value);
    case 'keyboardPosition':
      return isOneOf(MOD_KEYBOARD_POSITIONS, value);
    case 'highlightCurrentChar':
    case 'useYo':
    case 'showKeyboard':
    case 'showHands':
    case 'endWithSpace':
    case 'focusMode':
    case 'largeText':
    case 'reducedMotion':
    case 'highContrast':
    case 'showStats':
    case 'showTextPanel':
    case 'onboardingCompleted':
      return typeof value === 'boolean';
    case 'handsOpacity':
    case 'keyStrokeWidth':
    case 'keyboardPanelHeight':
    case 'keyboardPanelOffset':
    case 'keyboardPanelZoom':
    case 'textFontSize':
      return typeof value === 'number' && Number.isFinite(value);
    case 'theme':
    case 'interfaceLanguage':
    case 'language':
    case 'layout':
    case 'colorVisionMode':
      return isNonEmptyString(value);
    default:
      return false;
  }
}

export interface ModItemsAPI {
  add(item: GameItemDefinition): void;
  remove(itemId: string): void;
  replace(itemId: string, item: GameItemDefinition): void;
  getAll(): GameItemDefinition[];
}

const MOD_ITEM_RARITIES = [1, 2, 3] as const;
const MOD_ITEM_SLOT_TYPES = ['trinket'] as const;
const MOD_ITEM_REWARD_KINDS = ['simple', 'durable'] as const;
const MOD_ITEM_EFFECT_KINDS = [
  'speed',
  'accuracy',
  'timer',
  'lives',
  'reward',
  'enemyAttack',
  'enemyDefense',
  'dodge',
  'playerAttack',
  'playerDamage',
  'dmgCoeff',
  'defCoeff',
  'critBonus',
] as const;
const MOD_ITEM_EFFECT_UNITS = ['flat', 'percent', 'seconds'] as const;

function isOneOf<T extends readonly unknown[]>(values: T, value: unknown): value is T[number] {
  return values.includes(value);
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalDurability(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isModItemEffect(value: unknown): value is GameItemDefinition['effects'][number] {
  if (!isRecord(value)) return false;
  return isOneOf(MOD_ITEM_EFFECT_KINDS, value.kind)
    && typeof value.value === 'number'
    && Number.isFinite(value.value)
    && isOneOf(MOD_ITEM_EFFECT_UNITS, value.unit)
    && typeof value.description === 'string';
}

function isModDurabilityRules(value: unknown): value is NonNullable<GameItemDefinition['durabilityRules']> {
  if (!isRecord(value)) return false;
  return typeof value.normalPass === 'number'
    && Number.isFinite(value.normalPass)
    && typeof value.normalFail === 'number'
    && Number.isFinite(value.normalFail)
    && typeof value.bossPass === 'number'
    && Number.isFinite(value.bossPass)
    && typeof value.bossFail === 'number'
    && Number.isFinite(value.bossFail);
}

export function isModGameItemDefinition(value: unknown): value is GameItemDefinition {
  if (!isRecord(value)) return false;
  const durabilityRules = value.durabilityRules;

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.shortName)
    && isNonEmptyString(value.description)
    && isOneOf(MOD_ITEM_RARITIES, value.rarity)
    && isOneOf(MOD_ITEM_SLOT_TYPES, value.slotType)
    && typeof value.icon === 'string'
    && isOneOf(MOD_ITEM_REWARD_KINDS, value.rewardKind)
    && isOptionalBoolean(value.bossOnly)
    && isOptionalNumber(value.speedRequirementReductionPercent)
    && isOptionalNumber(value.accuracyRequirementReduction)
    && isOptionalNumber(value.bossTimerBonusSeconds)
    && isOptionalNumber(value.enemyAttackReduction)
    && isOptionalNumber(value.enemyDefenseReduction)
    && isOptionalNumber(value.dodgeBonus)
    && isOptionalNumber(value.playerAttackBonus)
    && isOptionalNumber(value.playerDamageBonus)
    && isOptionalNumber(value.dmgCoeff)
    && isOptionalNumber(value.defCoeff)
    && isOptionalNumber(value.critBonus)
    && isOptionalDurability(value.maxDurability)
    && (durabilityRules === undefined || durabilityRules === null || isModDurabilityRules(durabilityRules))
    && Array.isArray(value.effects)
    && value.effects.every(isModItemEffect);
}

export interface ModAchievementsAPI {
  add(achievement: GameAchievementDefinition): void;
  remove(achievementId: string): void;
  replace(achievementId: string, achievement: GameAchievementDefinition): void;
  getAll(): GameAchievementDefinition[];
}

function isModAchievementCondition(value: unknown): value is NonNullable<GameAchievementDefinition['conditions']>[number] {
  return isRecord(value) && isNonEmptyString(value.type);
}

export function isModGameAchievementDefinition(value: unknown): value is GameAchievementDefinition {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.description)
    && isNonEmptyString(value.category)
    && (
      value.conditions === undefined
      || (Array.isArray(value.conditions) && value.conditions.every(isModAchievementCondition))
    );
}

export interface ModRulesAPI {
  set<K extends ModRuleId>(ruleId: K, value: ModRuleValueMap[K]): void;
  remove(ruleId: ModRuleId): void;
  get<K extends ModRuleId>(ruleId: K): ModRuleValueMap[K] | undefined;
}

export interface ModEventsAPI {
  on<K extends ModEventName>(event: K, handler: ModEventHandler<K>): void;
  off<K extends ModEventName>(event: K, handler: ModEventHandler<K>): void;
}

export interface ModWordsAPI {
  add(words: string[]): void;
  remove(words: string[]): void;
  getAll(): string[];
}

export function normalizeModWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const words: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const word = entry.trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words;
}

export interface ModLessonsAPI {
  add(layoutId: string, lessons: Lesson[]): void;
  remove(layoutId: string, lessonIds: string[]): void;
  replace(layoutId: string, lessonId: string, lesson: Lesson): void;
  getAll(layoutId: string): Lesson[];
}

export function isModLesson(value: unknown): value is Lesson {
  if (typeof value !== 'object' || value === null) return false;
  const lesson = value as Partial<Lesson>;
  return typeof lesson.id === 'string'
    && lesson.id.trim().length > 0
    && typeof lesson.name === 'string'
    && lesson.name.trim().length > 0
    && Array.isArray(lesson.keys)
    && lesson.keys.every(key => typeof key === 'string');
}

export function normalizeModLessons(value: unknown): Lesson[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isModLesson);
}

export const MOD_PANEL_LOCATIONS = [
  'page-top',
  'page-bottom',
  'overlay',
] as const;

export type ModPanelLocation = typeof MOD_PANEL_LOCATIONS[number];

export function isModPanelLocation(value: unknown): value is ModPanelLocation {
  return typeof value === 'string' && (MOD_PANEL_LOCATIONS as readonly string[]).includes(value);
}

export interface ModPanel {
  id: string;
  location: ModPanelLocation;
  html: string;
}

export function isModPanel(value: unknown): value is ModPanel {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isModPanelLocation(value.location)
    && typeof value.html === 'string';
}

export interface ModUIAPI {
  registerPanel(panel: ModPanel): void;
  removePanel(panelId: string): void;
  injectCSS(css: string): void;
}

export const MOD_MODE_GROUPS = [
  'top',
  'bottom',
] as const;

export type ModModeGroup = typeof MOD_MODE_GROUPS[number];

export function isModModeGroup(value: unknown): value is ModModeGroup {
  return typeof value === 'string' && (MOD_MODE_GROUPS as readonly string[]).includes(value);
}

export interface ModModeDefinition {
  id: string;
  label: string;
  icon: string;
  group: ModModeGroup;
  html: string;
}

export function isModModeDefinition(value: unknown): value is ModModeDefinition {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && typeof value.icon === 'string'
    && isModModeGroup(value.group)
    && typeof value.html === 'string';
}

export interface ModModesAPI {
  register(mode: ModModeDefinition): void;
  unregister(modeId: string): void;
}

export interface ModI18nAPI {
  registerLocale(locale: AddonInterfaceLocaleDefinition): void;
  registerLocales(locales: AddonInterfaceLocaleDefinition[]): void;
}

export function isModInterfaceLocaleDefinition(value: unknown): value is AddonInterfaceLocaleDefinition {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.nativeLabel)
    && isRecord(value.dictionary);
}

export interface ModLogAPI {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface ModAPI {
  readonly modId: string;
  readonly modName: string;
  sections: ModSectionsAPI;
  settings: ModSettingsAPI;
  items: ModItemsAPI;
  achievements: ModAchievementsAPI;
  rules: ModRulesAPI;
  events: ModEventsAPI;
  words: ModWordsAPI;
  lessons: ModLessonsAPI;
  ui: ModUIAPI;
  modes: ModModesAPI;
  i18n: ModI18nAPI;
  log: ModLogAPI;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
