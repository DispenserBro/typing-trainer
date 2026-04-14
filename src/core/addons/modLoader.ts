/**
 * Mod loader — validates and manages mod folders on disk.
 * Mods live in `mods/` as subdirectories, each containing `manifest.json` + entry JS.
 * Runs in the main (Node) process only.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ModManifest, ModPermission, ModRegistryState, InstalledMod } from '../../shared/types/addon';
import { ADDON_MANIFEST_VERSION } from '../../shared/types/addon';

const REGISTRY_FILE = 'mod-registry.json';
const MOD_MANIFEST_FILE = 'manifest.json';

/* ── Validation ─────────────────────────────────────────── */

export interface ModValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: ModManifest;
}

export function validateModManifest(raw: unknown): ModValidationResult {
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

  if (m.type !== 'mod') {
    errors.push('Mod "type" must be "mod". For content packs, use an addon instead.');
  }

  if (typeof m.entry !== 'string' || m.entry.length === 0) {
    errors.push('Mods must have an "entry" string pointing to a JS file.');
  }

  if (!Array.isArray(m.permissions)) {
    errors.push('Mods must have a "permissions" array.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const manifest: ModManifest = {
    manifestVersion: m.manifestVersion as number,
    id: m.id as string,
    name: m.name as string,
    version: m.version as string,
    description: m.description as string | undefined,
    author: m.author as string | undefined,
    minAppVersion: m.minAppVersion as string | undefined,
    type: 'mod',
    entry: m.entry as string,
    permissions: m.permissions as ModPermission[],
    dependencies: Array.isArray(m.dependencies) ? m.dependencies.filter((d: unknown) => typeof d === 'string') : undefined,
  };

  return { ok: true, errors: [], manifest };
}

/* ── Registry persistence ───────────────────────────────── */

export function loadModRegistry(modsDir: string): ModRegistryState {
  const file = path.join(modsDir, REGISTRY_FILE);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { mods: [] };
  }
}

export function saveModRegistry(modsDir: string, state: ModRegistryState): void {
  fs.mkdirSync(modsDir, { recursive: true });
  fs.writeFileSync(
    path.join(modsDir, REGISTRY_FILE),
    JSON.stringify(state, null, 2),
    'utf-8',
  );
}

/* ── Scan mods directory (reads subdirectories with manifest.json) ── */

export function scanMods(modsDir: string): InstalledMod[] {
  const registry = loadModRegistry(modsDir);

  if (!fs.existsSync(modsDir)) return [];

  const dirs = fs.readdirSync(modsDir, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const found: InstalledMod[] = [];

  for (const dir of dirs) {
    const manifestPath = path.join(modsDir, dir.name, MOD_MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const result = validateModManifest(raw);
      if (!result.ok || !result.manifest) continue;

      const existing = registry.mods.find(m => m.id === result.manifest!.id);
      found.push({
        id: result.manifest.id,
        enabled: existing?.enabled ?? true,
        manifest: result.manifest,
        dirName: dir.name,
        installedAt: existing?.installedAt ?? new Date().toISOString(),
      });
    } catch {
      // Skip broken manifests silently
    }
  }

  // Persist refreshed registry (only minimal data: id, enabled, dirName, installedAt)
  saveModRegistry(modsDir, {
    mods: found.map(m => ({
      id: m.id,
      enabled: m.enabled,
      dirName: m.dirName,
      installedAt: m.installedAt,
    })),
  });

  return found;
}

/* ── Install mod from a manifest.json file (copies entire source folder) ── */

export function installModFromFolder(
  modsDir: string,
  sourceManifestPath: string,
): { ok: boolean; error?: string; mod?: InstalledMod } {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf-8'));
  } catch {
    return { ok: false, error: 'Invalid JSON in manifest.json.' };
  }

  const result = validateModManifest(raw);
  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.errors.join(' ') };
  }

  const manifest = result.manifest;
  const dirName = manifest.id;
  const destDir = path.join(modsDir, dirName);
  const sourceDir = path.dirname(sourceManifestPath);

  // Create destination directory
  fs.mkdirSync(destDir, { recursive: true });

  // Copy manifest
  fs.writeFileSync(
    path.join(destDir, MOD_MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  // Copy all JS files from source directory
  try {
    const files = fs.readdirSync(sourceDir).filter(
      (f: string) => f.endsWith('.js'),
    );
    for (const file of files) {
      fs.copyFileSync(path.join(sourceDir, file), path.join(destDir, file));
    }
  } catch { /* ignore copy errors */ }

  const registry = loadModRegistry(modsDir);
  const existing = registry.mods.findIndex(m => m.id === manifest.id);

  const installedMod: InstalledMod = {
    id: manifest.id,
    enabled: true,
    manifest,
    dirName,
    installedAt: new Date().toISOString(),
  };

  // Store only minimal entry in registry
  const registryEntry = {
    id: installedMod.id,
    enabled: installedMod.enabled,
    dirName: installedMod.dirName,
    installedAt: installedMod.installedAt,
  };

  if (existing >= 0) {
    registry.mods[existing] = registryEntry;
  } else {
    registry.mods.push(registryEntry);
  }

  saveModRegistry(modsDir, registry);

  return { ok: true, mod: installedMod };
}

/* ── Remove mod ─────────────────────────────────────────── */

export function removeMod(
  modsDir: string,
  modId: string,
): boolean {
  const registry = loadModRegistry(modsDir);
  const mod = registry.mods.find(m => m.id === modId);
  if (!mod) return false;

  // Remove the entire mod folder
  const modDir = path.join(modsDir, mod.dirName);
  if (fs.existsSync(modDir)) {
    fs.rmSync(modDir, { recursive: true, force: true });
  }

  registry.mods = registry.mods.filter(m => m.id !== modId);
  saveModRegistry(modsDir, registry);

  return true;
}

/* ── Toggle mod ─────────────────────────────────────────── */

export function toggleMod(
  modsDir: string,
  modId: string,
  enabled: boolean,
): boolean {
  const registry = loadModRegistry(modsDir);
  const mod = registry.mods.find(m => m.id === modId);
  if (!mod) return false;

  mod.enabled = enabled;
  saveModRegistry(modsDir, registry);

  return true;
}

/* ── Read mod entry script ──────────────────────────────── */

export function readModScript(
  modsDir: string,
  modId: string,
): string | null {
  try {
    const registry = loadModRegistry(modsDir);
    const modEntry = registry.mods.find(m => m.id === modId);
    if (!modEntry) return null;
    
    // Load manifest to get entry file name
    const manifestPath = path.join(modsDir, modEntry.dirName, MOD_MANIFEST_FILE);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const entryFile = manifest.entry || 'index.js';
    
    const scriptPath = path.join(modsDir, modEntry.dirName, entryFile);
    if (!fs.existsSync(scriptPath)) return null;
    return fs.readFileSync(scriptPath, 'utf-8');
  } catch {
    return null;
  }
}
