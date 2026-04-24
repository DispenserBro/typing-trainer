import type { CustomThemes, ExportPayload, Progress, UserSettings } from '../../shared/types';
import {
  defaultPracticeSettings,
  defaultSettings,
} from './appDefaults';

export const CONFIG_EXPORT_FILENAME = 'typing-trainer-config.json';

export type ParsedConfigImport =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string };

export function buildConfigExportPayload(progress: Progress): ExportPayload {
  return {
    version: 1,
    type: 'full',
    settings: progress.settings,
    practiceSettings: progress.practiceSettings,
    modePracticeSettings: progress.modePracticeSettings,
    customPresets: progress.customPresets,
    customPracticePacks: progress.customPracticePacks,
    importedInterfaceLocales: progress.importedInterfaceLocales,
  };
}

export function getThemeExportFilename(themeName: string): string {
  return `theme-${themeName}.json`;
}

export function buildThemeExportPayload(
  themeName: string,
  themes: CustomThemes,
): ExportPayload | null {
  const colors = themes[themeName];
  if (!colors) return null;
  return { version: 1, type: 'theme', theme: { name: themeName, colors } };
}

export function parseConfigImport(content: string): ParsedConfigImport {
  try {
    const payload = JSON.parse(content) as ExportPayload;
    if (!payload || payload.version !== 1) {
      return { ok: false, error: 'Неподдерживаемый формат файла' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'Ошибка чтения файла' };
  }
}

export function applyImportedConfigProgress({
  currentProgress,
  currentSettings,
  payload,
}: {
  currentProgress: Progress;
  currentSettings: UserSettings;
  payload: ExportPayload;
}): { progress: Progress; settings: UserSettings } | null {
  if ((payload.type !== 'config' && payload.type !== 'full') || !payload.settings) {
    return null;
  }

  const settings = defaultSettings({ ...currentSettings, ...payload.settings });
  return {
    settings,
    progress: {
      ...currentProgress,
      settings,
      ...(payload.practiceSettings ? { practiceSettings: defaultPracticeSettings(payload.practiceSettings) } : {}),
      ...(payload.modePracticeSettings ? { modePracticeSettings: payload.modePracticeSettings } : {}),
      ...(payload.customPresets ? { customPresets: { ...(currentProgress.customPresets ?? {}), ...payload.customPresets } } : {}),
      ...(payload.customPracticePacks ? { customPracticePacks: { ...(currentProgress.customPracticePacks ?? {}), ...payload.customPracticePacks } } : {}),
      ...(payload.importedInterfaceLocales ? { importedInterfaceLocales: { ...(currentProgress.importedInterfaceLocales ?? {}), ...payload.importedInterfaceLocales } } : {}),
    },
  };
}
