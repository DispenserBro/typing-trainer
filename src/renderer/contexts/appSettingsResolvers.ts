import type { Progress, TextDisplayMode, UserSettings } from '../../shared/types';
import { defaultSettings } from './appDefaults';

export function resolveSettings(progress: Progress): UserSettings {
  const base = defaultSettings(progress.settings);
  const legacyTextDisplay = (progress.practiceSettings as (Partial<{ textDisplay?: TextDisplayMode }> & {
    textDisplay?: TextDisplayMode;
  } | undefined))?.textDisplay;

  return {
    ...base,
    textDisplay: progress.settings?.textDisplay ?? legacyTextDisplay ?? base.textDisplay,
  };
}
