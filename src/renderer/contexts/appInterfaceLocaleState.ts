import type {
  ImportedInterfaceLocaleDefinition,
  InstalledAddon,
  InterfaceLocaleDefinition,
  Progress,
  UserSettings,
} from '../../shared/types';
import { collectAddonInterfaceLocales } from '../../core/addons/addonMerger';
import { getBuiltInInterfaceLocaleMap } from '../../core/i18n';

export function resolveImportedInterfaceLocales(progress: Progress): Record<string, ImportedInterfaceLocaleDefinition> {
  return progress.importedInterfaceLocales ?? {};
}

export function isInterfaceLocaleAvailableOutsideImports({
  addonLocales,
  installedAddons,
  localeId,
  modLocales,
}: {
  addonLocales?: InterfaceLocaleDefinition[];
  installedAddons: InstalledAddon[];
  localeId: string;
  modLocales: InterfaceLocaleDefinition[];
}) {
  const resolvedAddonLocales = addonLocales ?? collectAddonInterfaceLocales(installedAddons);
  return Boolean(
    getBuiltInInterfaceLocaleMap()[localeId]
    || resolvedAddonLocales.find(locale => locale.id === localeId)
    || modLocales.find(locale => locale.id === localeId),
  );
}

export function removeImportedInterfaceLocaleFromProgress({
  localeId,
  localeStillAvailable,
  progress,
  settings,
}: {
  localeId: string;
  localeStillAvailable: boolean;
  progress: Progress;
  settings: UserSettings;
}): Progress {
  if (!progress.importedInterfaceLocales?.[localeId]) return progress;

  const { [localeId]: _removed, ...rest } = progress.importedInterfaceLocales;
  const shouldResetInterfaceLanguage = settings.interfaceLanguage === localeId && !localeStillAvailable;
  const nextSettings = shouldResetInterfaceLanguage && progress.settings
    ? { ...progress.settings, interfaceLanguage: 'ru' }
    : progress.settings;

  return {
    ...progress,
    ...(nextSettings ? { settings: nextSettings } : {}),
    importedInterfaceLocales: rest,
  };
}
