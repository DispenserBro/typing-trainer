import type {
  ImportedInterfaceLocaleDefinition,
  ThemeDefinitions,
} from '../../shared/types';

export const BUILT_IN_THEME_IDS = [
  'dark-orange',
  'catppuccin',
  'nord',
  'monokai',
  'light',
] as const;

export type SettingsThemeOption = {
  id: string;
  label: string;
};

export function buildImportedInterfaceLocaleEntries(
  importedInterfaceLocales: Record<string, ImportedInterfaceLocaleDefinition>,
): ImportedInterfaceLocaleDefinition[] {
  return Object.values(importedInterfaceLocales)
    .sort((left, right) => right.importedAt.localeCompare(left.importedAt));
}

export function buildSettingsThemeOptions(
  availableThemes: ThemeDefinitions,
  builtInThemeIds: readonly string[] = BUILT_IN_THEME_IDS,
): SettingsThemeOption[] {
  return [
    ...builtInThemeIds.map(themeId => ({ id: themeId, label: themeId })),
    ...Object.values(availableThemes)
      .filter(theme => !builtInThemeIds.includes(theme.id))
      .map(theme => ({ id: theme.id, label: theme.label })),
  ];
}
