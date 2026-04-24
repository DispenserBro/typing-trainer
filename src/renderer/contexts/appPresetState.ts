import type { CustomPresets, Progress, UserPreset, UserSettings } from '../../shared/types';
import {
  BUILT_IN_PRESETS,
  extractPresetSettings,
} from './appDefaults';

export function resolveCustomPresets(customPresets?: CustomPresets): CustomPresets {
  return { ...BUILT_IN_PRESETS, ...(customPresets ?? {}) };
}

export function applyPresetToSettings(settings: UserSettings, preset?: UserPreset): UserSettings {
  return preset ? { ...settings, ...preset.settings } : settings;
}

export function addCurrentSettingsPreset(progress: Progress, settings: UserSettings, name: string) {
  const id = `custom_${Date.now()}`;
  const preset: UserPreset = { name, settings: extractPresetSettings(settings) };
  return {
    id,
    progress: {
      ...progress,
      customPresets: { ...(progress.customPresets ?? {}), [id]: preset },
    },
  };
}

export function deleteCustomPreset(progress: Progress, presetId: string): Progress {
  if (!progress.customPresets?.[presetId]) return progress;
  const { [presetId]: _removed, ...rest } = progress.customPresets;
  return {
    ...progress,
    customPresets: rest,
  };
}
