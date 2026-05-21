import type { CustomThemeColors } from './settings';

export const THEME_MANIFEST_VERSION = 1;
export const THEME_MANIFEST_TYPE = 'theme';
export const THEME_STYLE_CSS_FILE_CANDIDATES = ['theme.css', 'style.css'] as const;
export const THEME_STYLE_SCSS_FILE_CANDIDATES = ['theme.scss', 'style.scss'] as const;

export type ThemeDefinitionSource = 'built-in' | 'custom' | 'addon' | 'package';

export interface ThemeStyleDefinition {
  colors?: CustomThemeColors;
  variables?: Record<string, string>;
  css?: string;
  scss?: string;
  compiledScss?: string;
  bodyClasses?: string[];
  rootClasses?: string[];
  bodyAttributes?: Record<string, string>;
  rootAttributes?: Record<string, string>;
}

export interface ThemeManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  icon?: string;
  description?: string;
  author?: string;
  minAppVersion?: string;
  type: typeof THEME_MANIFEST_TYPE;
  preview?: Partial<CustomThemeColors>;
  style: ThemeStyleDefinition;
}

export interface InstalledTheme {
  id: string;
  manifest: ThemeManifest;
  fileName: string;
  installedAt: string;
}

export interface ThemeRegistryEntry {
  id: string;
  fileName: string;
  installedAt: string;
}

export interface ThemeRegistryState {
  themes: ThemeRegistryEntry[];
}

export interface ThemeInstallResult {
  ok: boolean;
  error?: string;
  theme?: InstalledTheme;
}

export interface ThemeDefinition {
  id: string;
  label: string;
  source: ThemeDefinitionSource;
  editable: boolean;
  deletable: boolean;
  icon?: string;
  description?: string;
  version?: string;
  preview?: Partial<CustomThemeColors>;
  style: ThemeStyleDefinition;
}

export type ThemeDefinitions = Record<string, ThemeDefinition>;

export function normalizeThemeOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeThemeStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeThemeStringRecord(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => typeof entryValue === 'string')
    .map(([key, entryValue]) => [key.trim(), (entryValue as string).trim()] as const)
    .filter(([key, entryValue]) => key.length > 0 && entryValue.length > 0);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function normalizeThemeColors(value: unknown): CustomThemeColors | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const colors = value as Record<string, unknown>;

  const bg = normalizeThemeOptionalString(colors.bg);
  const surface = normalizeThemeOptionalString(colors.surface);
  const surface2 = normalizeThemeOptionalString(colors.surface2);
  const text = normalizeThemeOptionalString(colors.text);
  const subtext = normalizeThemeOptionalString(colors.subtext);
  const accent = normalizeThemeOptionalString(colors.accent);
  const green = normalizeThemeOptionalString(colors.green);
  const red = normalizeThemeOptionalString(colors.red);
  const yellow = normalizeThemeOptionalString(colors.yellow);

  if (!bg || !surface || !surface2 || !text || !subtext || !accent || !green || !red || !yellow) {
    return undefined;
  }

  return {
    bg,
    surface,
    surface2,
    surface3: normalizeThemeOptionalString(colors.surface3),
    text,
    textDim: normalizeThemeOptionalString(colors.textDim),
    subtext,
    accent,
    accentHover: normalizeThemeOptionalString(colors.accentHover),
    accentDim: normalizeThemeOptionalString(colors.accentDim),
    green,
    red,
    yellow,
    fontSans: normalizeThemeOptionalString(colors.fontSans),
    fontMono: normalizeThemeOptionalString(colors.fontMono),
    radius: normalizeThemeOptionalString(colors.radius),
    radiusSm: normalizeThemeOptionalString(colors.radiusSm),
    transitionSpeed: normalizeThemeOptionalString(colors.transitionSpeed),
  };
}

export function hasThemeStyleContent(style: ThemeStyleDefinition) {
  return Boolean(
    style.colors
    || style.css
    || style.scss
    || (style.variables && Object.keys(style.variables).length > 0)
    || (style.bodyClasses && style.bodyClasses.length > 0)
    || (style.rootClasses && style.rootClasses.length > 0)
    || (style.bodyAttributes && Object.keys(style.bodyAttributes).length > 0)
    || (style.rootAttributes && Object.keys(style.rootAttributes).length > 0),
  );
}
