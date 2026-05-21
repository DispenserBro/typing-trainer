import * as path from 'path';
import type { Progress } from '../../shared/types';

export type SetupPreferences = {
  settings?: Partial<NonNullable<Progress['settings']>>;
  extensionSources: string[];
};

export function normalizeSetupPreferences(raw: unknown): SetupPreferences | null {
  if (!raw || typeof raw !== 'object') return null;

  const input = raw as Record<string, unknown>;
  const settings = input.settings && typeof input.settings === 'object'
    ? input.settings as Partial<NonNullable<Progress['settings']>>
    : undefined;
  const extensionSources = Array.isArray(input.extensionSources)
    ? input.extensionSources.filter((sourceRef): sourceRef is string => typeof sourceRef === 'string')
    : [];

  return {
    ...(settings ? { settings } : {}),
    extensionSources,
  };
}

export function applySetupPreferenceSettings(
  progress: Progress,
  setupPreferences: SetupPreferences,
): Progress {
  if (!setupPreferences.settings) return progress;

  return {
    ...progress,
    settings: {
      ...(progress.settings ?? {}),
      ...setupPreferences.settings,
    } as NonNullable<Progress['settings']>,
  };
}

export function resolveBundledExtensionSourceManifestPath(appPath: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('data/local-extension-sources/')) return null;
  if (normalized.split('/').some(part => part === '..')) return null;
  return path.join(appPath, ...normalized.split('/'));
}

export function resolveSetupPreferenceExtensionSourceManifestPaths(
  appPath: string,
  setupPreferences: SetupPreferences,
): string[] {
  return setupPreferences.extensionSources
    .map(sourceRef => resolveBundledExtensionSourceManifestPath(appPath, sourceRef))
    .filter((manifestPath): manifestPath is string => Boolean(manifestPath));
}
