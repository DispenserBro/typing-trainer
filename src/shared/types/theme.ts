import type { CustomThemeColors } from './settings';

export const THEME_MANIFEST_VERSION = 1;
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
  type: 'theme';
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
