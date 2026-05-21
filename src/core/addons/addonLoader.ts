/**
 * Addon loader — validates and manages content addon JSON files on disk.
 * Addons are single JSON files stored directly in the `addons/` directory.
 * Runs in the main (Node) process only.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { AddonManifest, AddonRegistryState, InstalledAddon } from '../../shared/types/addon';
import { ADDON_MANIFEST_TYPE, ADDON_MANIFEST_VERSION } from '../../shared/types/addon';
import { resolveSafeRegistryFilePath } from './pathSafety';

const REGISTRY_FILE = 'addon-registry.json';

/* ── Validation ─────────────────────────────────────────── */

export interface AddonValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: AddonManifest;
}

export function validateAddonManifest(raw: unknown): AddonValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Manifest is not a valid JSON object.'] };
  }

  const m = raw as Record<string, unknown>;

  if (typeof m.manifestVersion !== 'number') {
    errors.push('Missing or invalid "manifestVersion".');
  } else if (m.manifestVersion > ADDON_MANIFEST_VERSION) {
    errors.push(`Unsupported manifestVersion ${m.manifestVersion} (max ${ADDON_MANIFEST_VERSION}).`);
  }

  if (typeof m.id !== 'string' || m.id.length === 0) {
    errors.push('Missing or invalid "id".');
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(m.id) && m.id.length > 1) {
    errors.push('"id" must be kebab-case (lowercase, digits, hyphens).');
  }

  if (typeof m.name !== 'string' || m.name.length === 0) {
    errors.push('Missing or invalid "name".');
  }

  if (typeof m.version !== 'string' || m.version.length === 0) {
    errors.push('Missing or invalid "version".');
  }

  if (m.type !== ADDON_MANIFEST_TYPE) {
    errors.push(`Addon "type" must be "${ADDON_MANIFEST_TYPE}". For scripts, use a mod instead.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  // Нормализуем resources — сохраняем реальные категории из JSON
  let resources = m.resources as any;
  if (resources?.achievements?.achievements && Array.isArray(resources.achievements.achievements)) {
    resources = {
      ...resources,
      achievements: {
        ...resources.achievements,
        achievements: resources.achievements.achievements.map((ach: any) => ({
          ...ach,
          category: ach.category || 'game', // Если category не указана, используем 'game' по умолчанию
        })),
      },
    };
  }

  const manifest: AddonManifest = {
    manifestVersion: m.manifestVersion as number,
    id: m.id as string,
    name: m.name as string,
    version: m.version as string,
    icon: typeof m.icon === 'string' ? m.icon : undefined,
    description: m.description as string | undefined,
    author: m.author as string | undefined,
    minAppVersion: m.minAppVersion as string | undefined,
    type: ADDON_MANIFEST_TYPE,
    dependencies: Array.isArray(m.dependencies) ? m.dependencies.filter((d: unknown) => typeof d === 'string') : undefined,
    resources,
  };

  return { ok: true, errors: [], manifest };
}

/* ── Registry persistence ───────────────────────────────── */

export function loadAddonRegistry(addonsDir: string): AddonRegistryState {
  const file = path.join(addonsDir, REGISTRY_FILE);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { addons: [] };
  }
}

export function saveAddonRegistry(addonsDir: string, state: AddonRegistryState): void {
  fs.mkdirSync(addonsDir, { recursive: true });
  fs.writeFileSync(
    path.join(addonsDir, REGISTRY_FILE),
    JSON.stringify(state, null, 2),
    'utf-8',
  );
}

/* ── Scan addons directory (reads JSON files) ───────────── */

export function scanAddons(addonsDir: string): InstalledAddon[] {
  const registry = loadAddonRegistry(addonsDir);

  if (!fs.existsSync(addonsDir)) return [];

  const files = fs.readdirSync(addonsDir)
    .filter(f => f.endsWith('.json') && f !== REGISTRY_FILE);

  const found: InstalledAddon[] = [];

  for (const fileName of files) {
    const filePath = path.join(addonsDir, fileName);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const rawText = fs.readFileSync(filePath, 'utf-8');
      const raw = JSON.parse(rawText);
      
      const result = validateAddonManifest(raw);
      if (!result.ok || !result.manifest) continue;

      const existing = registry.addons.find(a => a.id === result.manifest!.id);
      found.push({
        id: result.manifest.id,
        enabled: existing?.enabled ?? true,
        manifest: result.manifest,
        fileName,
        installedAt: existing?.installedAt ?? new Date().toISOString(),
      });
    } catch {
      // Skip broken files silently
    }
  }

  // Persist refreshed registry (only minimal data: id, enabled, fileName, installedAt)
  saveAddonRegistry(addonsDir, {
    addons: found.map(a => ({
      id: a.id,
      enabled: a.enabled,
      fileName: a.fileName,
      installedAt: a.installedAt,
    })),
  });

  return found;
}

/* ── Install addon from JSON content ────────────────────── */

export function installAddonFromJSON(
  addonsDir: string,
  jsonContent: string,
): { ok: boolean; error?: string; addon?: InstalledAddon } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonContent);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }

  const result = validateAddonManifest(raw);
  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.errors.join(' ') };
  }

  const manifest = result.manifest;
  const fileName = `${manifest.id}.json`;

  // Write addon as a single JSON file
  fs.mkdirSync(addonsDir, { recursive: true });
  fs.writeFileSync(
    path.join(addonsDir, fileName),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  const registry = loadAddonRegistry(addonsDir);
  const existing = registry.addons.findIndex(a => a.id === manifest.id);

  const installedAddon: InstalledAddon = {
    id: manifest.id,
    enabled: true,
    manifest,
    fileName,
    installedAt: new Date().toISOString(),
  };

  // Store only minimal entry in registry
  const registryEntry = {
    id: installedAddon.id,
    enabled: installedAddon.enabled,
    fileName: installedAddon.fileName,
    installedAt: installedAddon.installedAt,
  };

  if (existing >= 0) {
    registry.addons[existing] = registryEntry;
  } else {
    registry.addons.push(registryEntry);
  }

  saveAddonRegistry(addonsDir, registry);

  return { ok: true, addon: installedAddon };
}

/* ── Remove addon ───────────────────────────────────────── */

export function removeAddon(
  addonsDir: string,
  addonId: string,
): boolean {
  const registry = loadAddonRegistry(addonsDir);
  const addon = registry.addons.find(a => a.id === addonId);
  if (!addon) return false;

  // Remove the JSON file
  const filePath = resolveSafeRegistryFilePath(addonsDir, addon.fileName);
  if (filePath && fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  registry.addons = registry.addons.filter(a => a.id !== addonId);
  saveAddonRegistry(addonsDir, registry);

  return true;
}

/* ── Toggle addon ───────────────────────────────────────── */

export function toggleAddon(
  addonsDir: string,
  addonId: string,
  enabled: boolean,
): boolean {
  const registry = loadAddonRegistry(addonsDir);
  const addon = registry.addons.find(a => a.id === addonId);
  if (!addon) return false;

  addon.enabled = enabled;
  saveAddonRegistry(addonsDir, registry);

  return true;
}
