import type { Progress } from '../../shared/types';
import type { LayoutProgressState, PracticeState } from '../../shared/types/practice';

export const CURRENT_PROGRESS_SCHEMA_VERSION = 1;

export type ProgressMigrationDiagnostic = {
  code: string;
  message: string;
};

export type ProgressMigrationResult = {
  diagnostics: ProgressMigrationDiagnostic[];
  migrated: boolean;
  ok: boolean;
  progress: Progress;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneProgressRecord(value: Record<string, unknown>): Progress {
  return JSON.parse(JSON.stringify(value)) as Progress;
}

function normalizeSchemaVersion(value: unknown): number | null {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function migrateLegacyLayoutProgress(progress: Progress): boolean {
  const practiceByLayout = progress.practice as Record<string, PracticeState & { unlocked?: unknown }> | undefined;
  if (!practiceByLayout || typeof practiceByLayout !== 'object') return false;

  let migrated = false;
  const layoutProgress = {
    ...(progress.layoutProgress ?? {}),
  } as Record<string, LayoutProgressState>;

  for (const [layoutId, practiceState] of Object.entries(practiceByLayout)) {
    if (!practiceState || typeof practiceState !== 'object') continue;
    if (layoutProgress[layoutId]) continue;
    const unlocked = practiceState.unlocked;
    if (typeof unlocked !== 'number' || Number.isNaN(unlocked)) continue;

    layoutProgress[layoutId] = {
      unlocked,
      unlockProgress: 0,
    };
    migrated = true;
  }

  if (migrated) {
    progress.layoutProgress = layoutProgress;
  }
  return migrated;
}

export function createEmptyProgress(appVersion?: string): Progress {
  return {
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    ...(appVersion ? { appVersion } : {}),
  };
}

export function normalizeProgressForSave(progress: Progress, appVersion?: string): Progress {
  return {
    ...progress,
    schemaVersion: CURRENT_PROGRESS_SCHEMA_VERSION,
    ...(appVersion ? { appVersion } : {}),
  };
}

export function migrateProgress(raw: unknown, appVersion?: string): Progress {
  return migrateProgressData(raw, appVersion).progress;
}

export function migrateProgressData(raw: unknown, appVersion?: string): ProgressMigrationResult {
  const diagnostics: ProgressMigrationDiagnostic[] = [];

  if (!isRecord(raw)) {
    diagnostics.push({
      code: 'progress.invalidRoot',
      message: 'progress.json root must be a JSON object.',
    });
    return {
      diagnostics,
      migrated: true,
      ok: false,
      progress: createEmptyProgress(appVersion),
    };
  }

  const schemaVersion = normalizeSchemaVersion(raw.schemaVersion);
  if (schemaVersion === null) {
    diagnostics.push({
      code: 'progress.invalidSchemaVersion',
      message: 'progress.json schemaVersion must be an integer.',
    });
    return {
      diagnostics,
      migrated: true,
      ok: false,
      progress: createEmptyProgress(appVersion),
    };
  }

  if (schemaVersion > CURRENT_PROGRESS_SCHEMA_VERSION) {
    diagnostics.push({
      code: 'progress.unsupportedSchemaVersion',
      message: `progress.json schemaVersion ${schemaVersion} is newer than supported ${CURRENT_PROGRESS_SCHEMA_VERSION}.`,
    });
    return {
      diagnostics,
      migrated: false,
      ok: false,
      progress: createEmptyProgress(appVersion),
    };
  }

  const progress = cloneProgressRecord(raw);
  let migrated = schemaVersion !== CURRENT_PROGRESS_SCHEMA_VERSION;
  if (schemaVersion < CURRENT_PROGRESS_SCHEMA_VERSION) {
    diagnostics.push({
      code: 'progress.v0.schemaVersion',
      message: 'Stamped legacy progress.json with the current schema version.',
    });
  }

  if (schemaVersion < 1 && migrateLegacyLayoutProgress(progress)) {
    diagnostics.push({
      code: 'progress.v0.layoutProgress',
      message: 'Migrated legacy practice unlocked counters to layoutProgress.',
    });
    migrated = true;
  }

  return {
    diagnostics,
    migrated,
    ok: true,
    progress: normalizeProgressForSave(progress, appVersion),
  };
}
