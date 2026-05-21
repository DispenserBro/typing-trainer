/**
 * Mod loader — validates and manages mod folders on disk.
 * Mods live in `mods/` as subdirectories, each containing `manifest.json` + entry JS.
 * Runs in the main (Node) process only.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ModLocaleResourceFile } from '../../shared/types/electron';
import type { ModManifest, ModRegistryState, InstalledMod } from '../../shared/types/addon';
import { ADDON_MANIFEST_VERSION, MOD_MANIFEST_TYPE } from '../../shared/types/addon';
import { isModPermission, normalizeModPermissions } from '../../shared/types/modApi';

const REGISTRY_FILE = 'mod-registry.json';
const MOD_MANIFEST_FILE = 'manifest.json';
const MOD_LOCALE_DIRS = ['locales', 'i18n'];
const MOD_RESERVED_FILES = new Set([REGISTRY_FILE]);

type ModPackageFile = {
  content: string;
  relativePath: string;
};

function normalizePackageRelativePath(value: string) {
  return value
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');
}

function isSafePackageRelativePath(value: string) {
  const normalized = normalizePackageRelativePath(value);
  if (!normalized) return false;
  if (path.posix.isAbsolute(normalized)) return false;

  const segments = normalized.split('/');
  return segments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..');
}

function normalizeManifestPackageFiles(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const normalized = normalizePackageRelativePath(entry);
    if (!isSafePackageRelativePath(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result.length > 0 ? result : undefined;
}

function isResolvedPathInside(parentDir: string, targetPath: string) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(targetPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function ensureSafeInstallDir(modsDir: string, modId: string) {
  const destDir = path.resolve(modsDir, modId);
  if (!isResolvedPathInside(modsDir, destDir)) {
    throw new Error('Resolved mod install path is outside the mods directory.');
  }
  return destDir;
}

function prepareModDestination(modsDir: string, modId: string) {
  const destDir = ensureSafeInstallDir(modsDir, modId);
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  return destDir;
}

function writeNormalizedModManifest(destDir: string, manifest: ModManifest) {
  fs.writeFileSync(
    path.join(destDir, MOD_MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
}

function persistInstalledMod(modsDir: string, manifest: ModManifest): InstalledMod {
  const registry = loadModRegistry(modsDir);
  const existing = registry.mods.findIndex(m => m.id === manifest.id);

  const installedMod: InstalledMod = {
    id: manifest.id,
    enabled: true,
    manifest,
    dirName: manifest.id,
    installedAt: new Date().toISOString(),
  };

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
  return installedMod;
}

function validatePackagedModFiles(manifest: ModManifest, files: ModPackageFile[]) {
  if (!isSafePackageRelativePath(manifest.entry)) {
    return 'Mods must have a relative "entry" path inside the package.';
  }

  const normalizedFiles = files.map(file => normalizePackageRelativePath(file.relativePath));
  const fileSet = new Set(normalizedFiles);
  if (!fileSet.has(normalizePackageRelativePath(manifest.entry))) {
    return `Packaged mod is missing the entry file "${manifest.entry}".`;
  }

  if (manifest.files?.length) {
    for (const declaredFile of manifest.files) {
      const normalized = normalizePackageRelativePath(declaredFile);
      if (!fileSet.has(normalized)) {
        return `Packaged mod is missing the declared file "${declaredFile}".`;
      }
    }
  }

  return null;
}

function writePackagedModFiles(destDir: string, files: ModPackageFile[]) {
  for (const file of files) {
    const normalized = normalizePackageRelativePath(file.relativePath);
    if (!isSafePackageRelativePath(normalized)) {
      throw new Error(`Unsafe package file path "${file.relativePath}".`);
    }
    if (MOD_RESERVED_FILES.has(path.posix.basename(normalized))) {
      continue;
    }

    const targetPath = path.resolve(destDir, normalized);
    if (!isResolvedPathInside(destDir, targetPath)) {
      throw new Error(`Resolved package file path "${normalized}" escapes the mod directory.`);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, file.content, 'utf-8');
  }
}

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

  if (m.type !== MOD_MANIFEST_TYPE) {
    errors.push(`Mod "type" must be "${MOD_MANIFEST_TYPE}". For content packs, use an addon instead.`);
  }

  if (typeof m.entry !== 'string' || m.entry.length === 0) {
    errors.push('Mods must have an "entry" string pointing to a JS file.');
  } else if (!isSafePackageRelativePath(m.entry)) {
    errors.push('Mods must have a relative "entry" path inside the mod package.');
  }

  if (!Array.isArray(m.permissions)) {
    errors.push('Mods must have a "permissions" array.');
  } else {
    const invalidPermissions = m.permissions.filter((permission) => (
      !isModPermission(permission)
    ));
    if (invalidPermissions.length > 0) {
      errors.push(`Mod "permissions" contains unknown values: ${invalidPermissions.join(', ')}.`);
    }
  }

  if (m.files !== undefined) {
    if (!Array.isArray(m.files)) {
      errors.push('Mod "files" must be an array of relative file paths.');
    } else if (m.files.some((file) => typeof file !== 'string' || !isSafePackageRelativePath(file))) {
      errors.push('Mod "files" must contain only safe relative file paths.');
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const manifest: ModManifest = {
    manifestVersion: m.manifestVersion as number,
    id: m.id as string,
    name: m.name as string,
    version: m.version as string,
    icon: typeof m.icon === 'string' ? m.icon : undefined,
    description: m.description as string | undefined,
    author: m.author as string | undefined,
    minAppVersion: m.minAppVersion as string | undefined,
    type: MOD_MANIFEST_TYPE,
    entry: m.entry as string,
    files: normalizeManifestPackageFiles(m.files),
    permissions: normalizeModPermissions(m.permissions),
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
  const destDir = prepareModDestination(modsDir, dirName);
  const sourceDir = path.dirname(sourceManifestPath);

  // Copy the full mod folder so script-side assets, locales/*.json and locales/*.po survive installation.
  try {
    if (path.resolve(sourceDir) !== path.resolve(destDir)) {
      fs.cpSync(sourceDir, destDir, {
        recursive: true,
        force: true,
        filter: (source) => !MOD_RESERVED_FILES.has(path.basename(source)),
      });
    }
  } catch { /* ignore copy errors */ }

  // Store the normalized manifest after copying to drop unsupported manifest-only resources.
  writeNormalizedModManifest(destDir, manifest);
  return { ok: true, mod: persistInstalledMod(modsDir, manifest) };
}

export function installModFromPackage(
  modsDir: string,
  manifestContent: string,
  files: ModPackageFile[],
): { ok: boolean; error?: string; mod?: InstalledMod } {
  let raw: unknown;
  try {
    raw = JSON.parse(manifestContent);
  } catch {
    return { ok: false, error: 'Invalid JSON in manifest.json.' };
  }

  const result = validateModManifest(raw);
  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.errors.join(' ') };
  }

  const manifest = result.manifest;
  const validationError = validatePackagedModFiles(manifest, files);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const destDir = prepareModDestination(modsDir, manifest.id);
  try {
    writePackagedModFiles(destDir, files);
    writeNormalizedModManifest(destDir, manifest);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to write the mod package files.',
    };
  }

  return { ok: true, mod: persistInstalledMod(modsDir, manifest) };
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

function getInstalledModDir(modsDir: string, modId: string): string | null {
  const registry = loadModRegistry(modsDir);
  const modEntry = registry.mods.find(m => m.id === modId);
  if (!modEntry) return null;
  return path.join(modsDir, modEntry.dirName);
}

function readLocaleFilesFromDir(
  rootDir: string,
  dir: string,
  target: ModLocaleResourceFile[],
) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (extension !== '.json' && extension !== '.po') continue;

    const filePath = path.join(dir, entry.name);
    target.push({
      name: entry.name,
      relativePath: path.relative(rootDir, filePath).replace(/\\/g, '/'),
      extension: extension === '.po' ? 'po' : 'json',
      content: fs.readFileSync(filePath, 'utf-8'),
    });
  }
}

export function readModLocaleResources(
  modsDir: string,
  modId: string,
): ModLocaleResourceFile[] {
  try {
    const modDir = getInstalledModDir(modsDir, modId);
    if (!modDir || !fs.existsSync(modDir)) return [];

    const files: ModLocaleResourceFile[] = [];
    for (const localeDir of MOD_LOCALE_DIRS) {
      readLocaleFilesFromDir(modDir, path.join(modDir, localeDir), files);
    }

    return files;
  } catch {
    return [];
  }
}
