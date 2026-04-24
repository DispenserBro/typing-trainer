import type { ModeProfiles, Progress, UserSettings } from '../../shared/types';
import { extractPresetSettings } from './appDefaults';

export function resolveModeProfiles(modeProfiles?: ModeProfiles): ModeProfiles {
  return modeProfiles ?? {};
}

export function saveModeProfileToProgress(progress: Progress, mode: string, settings: UserSettings): Progress {
  return {
    ...progress,
    modeProfiles: {
      ...(progress.modeProfiles ?? {}),
      [mode]: extractPresetSettings(settings),
    },
  };
}

export function clearModeProfileFromProgress(progress: Progress, mode: string): Progress {
  if (!progress.modeProfiles?.[mode]) return progress;
  const profiles = { ...progress.modeProfiles };
  delete profiles[mode];
  return { ...progress, modeProfiles: profiles };
}
