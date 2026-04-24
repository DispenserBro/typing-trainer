import * as fs from 'fs';
import * as path from 'path';
import { installAddonFromJSON, scanAddons, validateAddonManifest } from './addonLoader';
import { installModFromFolder, installModFromPackage, scanMods, validateModManifest } from './modLoader';
import { installThemeFromJSON, scanThemes, validateThemeManifest } from './themeLoader';
import type { AddonManifest, ModManifest } from '../../shared/types/addon';
import type {
  ExtensionCatalogEntry,
  ExtensionCatalogInstallResult,
  ExtensionCatalogKind,
  ExtensionSourceCachedLists,
  ExtensionSourceInput,
  ExtensionSourceInstallResult,
  ExtensionSourceManifest,
  ExtensionSourceRegistryState,
  ExtensionSourceSyncResult,
  InstalledExtensionSource,
} from '../../shared/types/extensionSource';
import { EXTENSION_SOURCE_MANIFEST_VERSION } from '../../shared/types/extensionSource';
import type { ThemeManifest } from '../../shared/types/theme';
import { THEME_STYLE_CSS_FILE_CANDIDATES, THEME_STYLE_SCSS_FILE_CANDIDATES } from '../../shared/types/theme';

const REGISTRY_FILE = 'extension-sources.json';
const DEFAULT_GITHUB_BRANCH = 'main';
const DEFAULT_ENTRY_MANIFEST_FILE = 'manifest.json';
const CATALOG_CARD_CANDIDATES = ['card.md', 'README.md'];

function isMarkdownFileRef(value: string) {
  return /\.md(?:own)?$/i.test(value.trim());
}

function normalizeMarkdownCardContent(value: string | undefined) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface ExtensionSourceValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: ExtensionSourceManifest;
}

type SyncedSourcePayload = {
  resolvedManifestUri: string;
  manifest: ExtensionSourceManifest;
  lists: ExtensionSourceCachedLists;
  sourceCardUri?: string;
  sourceCardMarkdown?: string;
};

function normalizeKebabId(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidKebabId(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/g, '');
}

function joinPosixPath(...parts: string[]) {
  return parts
    .map(part => trimSlashes(part))
    .filter(Boolean)
    .join('/');
}

function buildRawGithubManifestUrl(owner: string, repo: string, branch: string, manifestPath: string) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${manifestPath}`;
}

function dirnameUrl(url: string) {
  return new URL('./', url).toString();
}

function readJsonArrayOfStrings(content: string, label: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }

  if (!Array.isArray(parsed) || parsed.some(entry => typeof entry !== 'string')) {
    throw new Error(`${label} must be a JSON array of strings.`);
  }

  return parsed.map(entry => entry.trim()).filter(Boolean);
}

async function readRemoteText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function readLocalText(filePath: string) {
  return fs.readFileSync(filePath, 'utf-8');
}

async function readTextByUri(uri: string) {
  return isHttpUrl(uri) ? readRemoteText(uri) : readLocalText(uri);
}

async function readOptionalTextByUri(uri: string) {
  try {
    return await readTextByUri(uri);
  } catch {
    return undefined;
  }
}

function loadRegistry(dataDir: string): ExtensionSourceRegistryState {
  const filePath = path.join(dataDir, REGISTRY_FILE);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { sources: [] };
  }
}

function saveRegistry(dataDir: string, state: ExtensionSourceRegistryState) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, REGISTRY_FILE), JSON.stringify(state, null, 2), 'utf-8');
}

export function validateExtensionSourceManifest(raw: unknown): ExtensionSourceValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Manifest is not a valid JSON object.'] };
  }

  const manifestLike = raw as Record<string, unknown>;

  if (typeof manifestLike.manifestVersion !== 'number') {
    errors.push('Missing or invalid "manifestVersion".');
  } else if (manifestLike.manifestVersion > EXTENSION_SOURCE_MANIFEST_VERSION) {
    errors.push(
      `Unsupported manifestVersion ${manifestLike.manifestVersion} (max ${EXTENSION_SOURCE_MANIFEST_VERSION}).`,
    );
  }

  const id = normalizeKebabId(manifestLike.id);
  if (!id) {
    errors.push('Missing or invalid "id".');
  } else if (!isValidKebabId(id)) {
    errors.push('"id" must be kebab-case (lowercase, digits, hyphens).');
  }

  const name = normalizeOptionalString(manifestLike.name);
  if (!name) {
    errors.push('Missing or invalid "name".');
  }

  const version = normalizeOptionalString(manifestLike.version);
  if (!version) {
    errors.push('Missing or invalid "version".');
  }

  if (manifestLike.type !== 'extension-source') {
    errors.push('Source "type" must be "extension-source".');
  }

  const lists = manifestLike.lists;
  if (!lists || typeof lists !== 'object') {
    errors.push('Missing or invalid "lists".');
  }

  if (errors.length > 0) return { ok: false, errors };

  const listRefs = lists as Record<string, unknown>;
  const cards = manifestLike.cards && typeof manifestLike.cards === 'object'
    ? (manifestLike.cards as Record<string, unknown>)
    : undefined;

  const manifest: ExtensionSourceManifest = {
    manifestVersion: manifestLike.manifestVersion as number,
    id,
    name: name!,
    version: version!,
    icon: normalizeOptionalString(manifestLike.icon),
    type: 'extension-source',
    description: normalizeOptionalString(manifestLike.description),
    author: normalizeOptionalString(manifestLike.author),
    basePath: normalizeOptionalString(manifestLike.basePath),
    lists: {
      addons: normalizeOptionalString(listRefs.addons),
      mods: normalizeOptionalString(listRefs.mods),
      themes: normalizeOptionalString(listRefs.themes),
    },
    cards: cards ? {
      source: normalizeOptionalString(cards.source),
      addons: normalizeOptionalString(cards.addons),
      mods: normalizeOptionalString(cards.mods),
      themes: normalizeOptionalString(cards.themes),
    } : undefined,
  };

  return { ok: true, errors: [], manifest };
}

function getResolvedManifestUri(input: ExtensionSourceInput) {
  if (input.type === 'local') {
    return path.resolve(input.manifestPath);
  }

  if (input.type === 'url') {
    return input.manifestUrl.trim();
  }

  const manifestUrl = normalizeOptionalString(input.manifestUrl);
  if (manifestUrl) {
    try {
      const parsed = new URL(manifestUrl);
      const host = parsed.hostname.toLowerCase();
      const segments = parsed.pathname.split('/').filter(Boolean);

      if (host === 'raw.githubusercontent.com') {
        return parsed.toString();
      }

      if (host === 'github.com' && segments.length >= 2) {
        const [owner, repo, mode, ...rest] = segments;

        if (!mode) {
          return buildRawGithubManifestUrl(owner, repo, DEFAULT_GITHUB_BRANCH, DEFAULT_ENTRY_MANIFEST_FILE);
        }

        if (mode === 'blob') {
          const [branch = DEFAULT_GITHUB_BRANCH, ...fileParts] = rest;
          return buildRawGithubManifestUrl(
            owner,
            repo,
            branch,
            fileParts.join('/') || DEFAULT_ENTRY_MANIFEST_FILE,
          );
        }

        if (mode === 'tree') {
          const [branch = DEFAULT_GITHUB_BRANCH, ...dirParts] = rest;
          return buildRawGithubManifestUrl(
            owner,
            repo,
            branch,
            joinPosixPath(...dirParts, DEFAULT_ENTRY_MANIFEST_FILE),
          );
        }
      }
    } catch {
      return manifestUrl;
    }

    return manifestUrl;
  }

  const owner = trimSlashes(input.owner || '');
  const repo = trimSlashes(input.repo || '');
  const branch = trimSlashes(input.branch || DEFAULT_GITHUB_BRANCH);
  const manifestPath = trimLeadingSlash(input.manifestPath || DEFAULT_ENTRY_MANIFEST_FILE);
  const basePath = trimSlashes(input.basePath || '');
  const fullPath = joinPosixPath(basePath, manifestPath);
  return buildRawGithubManifestUrl(owner, repo, branch, fullPath);
}

function resolveLocalRef(manifestUri: string, manifest: ExtensionSourceManifest, ref: string) {
  const manifestDir = path.dirname(manifestUri);
  const baseDir = manifest.basePath
    ? path.resolve(manifestDir, manifest.basePath)
    : manifestDir;
  return path.resolve(baseDir, ref);
}

function resolveRemoteRef(manifestUri: string, manifest: ExtensionSourceManifest, ref: string) {
  const manifestDirUrl = dirnameUrl(manifestUri);
  const baseUrl = manifest.basePath
    ? new URL(manifest.basePath.replace(/^\.\//, ''), manifestDirUrl).toString()
    : manifestDirUrl;
  return new URL(ref.replace(/^\.\//, ''), baseUrl).toString();
}

function resolveSourceRef(input: ExtensionSourceInput, manifestUri: string, manifest: ExtensionSourceManifest, ref: string) {
  return input.type === 'local'
    ? resolveLocalRef(manifestUri, manifest, ref)
    : resolveRemoteRef(manifestUri, manifest, ref);
}

async function readTextFromSource(input: ExtensionSourceInput, uri: string) {
  if (input.type === 'local') {
    return readLocalText(uri);
  }
  return readRemoteText(uri);
}

async function syncSourceInput(input: ExtensionSourceInput): Promise<SyncedSourcePayload> {
  const resolvedManifestUri = getResolvedManifestUri(input);
  const manifestText = await readTextFromSource(input, resolvedManifestUri);

  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(manifestText);
  } catch {
    throw new Error('Source manifest is not valid JSON.');
  }

  const validation = validateExtensionSourceManifest(rawManifest);
  if (!validation.ok || !validation.manifest) {
    throw new Error(validation.errors.join(' '));
  }

  const manifest = validation.manifest;
  const lists: ExtensionSourceCachedLists = {};

  for (const key of ['addons', 'mods', 'themes'] as const) {
    const ref = manifest.lists[key];
    if (!ref) continue;
    const resolvedRef = resolveSourceRef(input, resolvedManifestUri, manifest, ref);
    const content = await readTextFromSource(input, resolvedRef);
    lists[key] = {
      ref: resolvedRef,
      entries: readJsonArrayOfStrings(content, `${key} list`),
    };
  }

  let sourceCardMarkdown: string | undefined;
  let sourceCardUri: string | undefined;
  if (manifest.cards?.source && isMarkdownFileRef(manifest.cards.source)) {
    const resolvedCardRef = resolveSourceRef(input, resolvedManifestUri, manifest, manifest.cards.source);
    const rawSourceCardMarkdown = await readTextFromSource(input, resolvedCardRef);
    const nextSourceCardMarkdown = normalizeMarkdownCardContent(rawSourceCardMarkdown);
    if (nextSourceCardMarkdown) {
      sourceCardUri = resolvedCardRef;
      sourceCardMarkdown = nextSourceCardMarkdown;
    }
  }

  return {
    resolvedManifestUri,
    manifest,
    lists,
    sourceCardUri,
    sourceCardMarkdown,
  };
}

function withSuccessSyncState(
  entry: InstalledExtensionSource,
  synced: SyncedSourcePayload,
): InstalledExtensionSource {
  const now = new Date().toISOString();
  return {
    ...entry,
    id: synced.manifest.id,
    syncState: {
      status: 'ready',
      lastCheckedAt: now,
      lastSyncAt: now,
      resolvedManifestUri: synced.resolvedManifestUri,
      manifest: synced.manifest,
      lists: synced.lists,
      sourceCardUri: synced.sourceCardUri,
      sourceCardMarkdown: synced.sourceCardMarkdown,
    },
  };
}

function withErrorSyncState(
  entry: InstalledExtensionSource,
  error: string,
): InstalledExtensionSource {
  return {
    ...entry,
    syncState: {
      ...entry.syncState,
      status: 'error',
      lastCheckedAt: new Date().toISOString(),
      lastError: error,
    },
  };
}

function getBlankSourceEntry(input: ExtensionSourceInput): InstalledExtensionSource {
  return {
    id: '',
    enabled: true,
    installedAt: new Date().toISOString(),
    input,
    syncState: { status: 'never' },
  };
}

function normalizeCatalogEntryId(value: string) {
  return trimSlashes(value.trim());
}

function getSourceStatusPriority(source: InstalledExtensionSource) {
  if (!source.enabled) return 'source-disabled' as const;
  if (source.syncState.status === 'error') return 'source-error' as const;
  return null;
}

function createCatalogEntryKey(sourceId: string, kind: ExtensionCatalogKind, entryId: string) {
  return `${sourceId}:${kind}:${entryId}`;
}

function createCatalogManifestKey(kind: ExtensionCatalogKind, manifestId: string) {
  return `${kind}:${manifestId}`;
}

function getCatalogListRef(source: InstalledExtensionSource, kind: ExtensionCatalogKind) {
  return source.syncState.lists?.[kind]?.ref;
}

function resolveCatalogEntryManifestUri(listRef: string, entryId: string) {
  const normalizedEntryId = normalizeCatalogEntryId(entryId);
  if (!normalizedEntryId) {
    throw new Error('Catalog entry id is empty.');
  }

  if (isHttpUrl(listRef)) {
    const listDir = dirnameUrl(listRef);
    return new URL(`${normalizedEntryId}/${DEFAULT_ENTRY_MANIFEST_FILE}`, listDir).toString();
  }

  return path.resolve(path.dirname(listRef), normalizedEntryId, DEFAULT_ENTRY_MANIFEST_FILE);
}

function resolveCatalogEntryCardCandidates(manifestUri: string) {
  if (isHttpUrl(manifestUri)) {
    const base = dirnameUrl(manifestUri);
    return CATALOG_CARD_CANDIDATES.map(fileName => new URL(fileName, base).toString());
  }

  const base = path.dirname(manifestUri);
  return CATALOG_CARD_CANDIDATES.map(fileName => path.resolve(base, fileName));
}

function resolveThemeStyleSidecarCandidates(manifestUri: string, candidates: readonly string[]) {
  if (isHttpUrl(manifestUri)) {
    const base = dirnameUrl(manifestUri);
    return candidates.map(fileName => new URL(fileName, base).toString());
  }

  const base = path.dirname(manifestUri);
  return candidates.map(fileName => path.resolve(base, fileName));
}

async function readThemeStyleSidecarsByUri(manifestUri: string) {
  let css: string | undefined;
  for (const candidate of resolveThemeStyleSidecarCandidates(manifestUri, THEME_STYLE_CSS_FILE_CANDIDATES)) {
    const content = normalizeOptionalString(await readOptionalTextByUri(candidate));
    if (!content) continue;
    css = content;
    break;
  }

  let scss: string | undefined;
  for (const candidate of resolveThemeStyleSidecarCandidates(manifestUri, THEME_STYLE_SCSS_FILE_CANDIDATES)) {
    const content = normalizeOptionalString(await readOptionalTextByUri(candidate));
    if (!content) continue;
    scss = content;
    break;
  }

  return { css, scss };
}

function resolveCatalogPackageFileUri(manifestUri: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (isHttpUrl(manifestUri)) {
    return new URL(normalized, dirnameUrl(manifestUri)).toString();
  }
  return path.resolve(path.dirname(manifestUri), normalized);
}

function canDirectInstallCatalogEntry(
  source: InstalledExtensionSource,
  resolved: ResolvedCatalogEntryPayload,
) {
  if (resolved.kind !== 'mods') return true;
  if (source.input.type === 'local') return true;
  return resolved.packageFiles.length > 0;
}

function compareVersionStrings(left?: string, right?: string) {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;

  const leftParts = left.split(/[.-]/g);
  const rightParts = right.split(/[.-]/g);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? '0';
    const rightPart = rightParts[index] ?? '0';
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

    if (bothNumeric) {
      if (leftNumber !== rightNumber) return leftNumber > rightNumber ? 1 : -1;
      continue;
    }

    if (leftPart !== rightPart) {
      return leftPart.localeCompare(rightPart);
    }
  }

  return 0;
}

type ResolvedCatalogEntryPayload = {
  cardMarkdown?: string;
  dependencies: string[];
  entryId: string;
  icon?: string;
  kind: ExtensionCatalogKind;
  manifestAuthor?: string;
  manifestDescription?: string;
  manifestId: string;
  manifestName: string;
  manifestType: string;
  manifestVersion: string;
  packageFiles: string[];
  minAppVersion?: string;
  permissions: string[];
  resolvedCardUri?: string;
  resolvedManifestUri: string;
  manifestText: string;
};

async function resolveCatalogEntryPayload(
  source: InstalledExtensionSource,
  kind: ExtensionCatalogKind,
  entryId: string,
): Promise<ResolvedCatalogEntryPayload> {
  const listRef = getCatalogListRef(source, kind);
  if (!listRef) {
    throw new Error(`Source "${source.id}" does not provide a ${kind} list.`);
  }

  const resolvedManifestUri = resolveCatalogEntryManifestUri(listRef, entryId);
  const manifestText = await readTextByUri(resolvedManifestUri);

  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(manifestText);
  } catch {
    throw new Error('Extension manifest is not valid JSON.');
  }

  const themeSidecars = kind === 'themes'
    ? await readThemeStyleSidecarsByUri(resolvedManifestUri)
    : undefined;

  const validation = kind === 'mods'
    ? validateModManifest(rawManifest)
    : kind === 'themes'
      ? validateThemeManifest(rawManifest, {
          sidecarCss: themeSidecars?.css,
          sidecarScss: themeSidecars?.scss,
        })
      : validateAddonManifest(rawManifest);

  if (!validation.ok || !validation.manifest) {
    throw new Error(validation.errors.join(' '));
  }

  let resolvedCardUri: string | undefined;
  let cardMarkdown: string | undefined;

  for (const candidate of resolveCatalogEntryCardCandidates(resolvedManifestUri)) {
    if (!isMarkdownFileRef(candidate)) continue;
    const nextMarkdown = normalizeMarkdownCardContent(await readOptionalTextByUri(candidate));
    if (!nextMarkdown) continue;
    resolvedCardUri = candidate;
    cardMarkdown = nextMarkdown;
    break;
  }

  if (kind === 'mods') {
    const manifest = validation.manifest as ModManifest;
    return {
      kind,
      entryId: normalizeCatalogEntryId(entryId),
      icon: manifest.icon,
      manifestId: manifest.id,
      manifestName: manifest.name,
      manifestVersion: manifest.version,
      manifestDescription: manifest.description,
      manifestAuthor: manifest.author,
      manifestType: manifest.type,
      minAppVersion: manifest.minAppVersion,
      packageFiles: manifest.files ?? [],
      dependencies: manifest.dependencies ?? [],
      permissions: manifest.permissions ?? [],
      resolvedManifestUri,
      resolvedCardUri,
      cardMarkdown,
      manifestText,
    };
  }

  if (kind === 'themes') {
    const manifest = validation.manifest as ThemeManifest;
    return {
      kind,
      entryId: normalizeCatalogEntryId(entryId),
      icon: manifest.icon,
      manifestId: manifest.id,
      manifestName: manifest.name,
      manifestVersion: manifest.version,
      manifestDescription: manifest.description,
      manifestAuthor: manifest.author,
      manifestType: manifest.type,
      minAppVersion: manifest.minAppVersion,
      packageFiles: [],
      dependencies: [],
      permissions: [],
      resolvedManifestUri,
      resolvedCardUri,
      cardMarkdown,
      manifestText: JSON.stringify(manifest, null, 2),
    };
  }

  const manifest = validation.manifest as AddonManifest;
  return {
    kind,
    entryId: normalizeCatalogEntryId(entryId),
    icon: manifest.icon,
    manifestId: manifest.id,
    manifestName: manifest.name,
    manifestVersion: manifest.version,
    manifestDescription: manifest.description,
    manifestAuthor: manifest.author,
    manifestType: manifest.type,
    minAppVersion: manifest.minAppVersion,
    packageFiles: [],
    dependencies: manifest.dependencies ?? [],
    permissions: [],
    resolvedManifestUri,
    resolvedCardUri,
    cardMarkdown,
    manifestText,
  };
}

function buildCatalogEntryStatus(
  source: InstalledExtensionSource,
  kind: ExtensionCatalogKind,
  manifestId: string | undefined,
  manifestVersion: string | undefined,
  installedAddonVersions: Map<string, string>,
  installedModVersions: Map<string, string>,
  installedThemeVersions: Map<string, string>,
): { installedVersion?: string; status: ExtensionCatalogEntry['status'] } {
  const sourceStatus = getSourceStatusPriority(source);
  if (sourceStatus) {
    return { status: sourceStatus };
  }

  if (!manifestId) {
    return { status: 'invalid' };
  }

  const installedVersion = kind === 'mods'
    ? installedModVersions.get(manifestId)
    : kind === 'themes'
      ? installedThemeVersions.get(manifestId)
      : installedAddonVersions.get(manifestId);

  if (!installedVersion) {
    return { status: 'available' };
  }

  if (compareVersionStrings(manifestVersion, installedVersion) > 0) {
    return { installedVersion, status: 'update-available' };
  }

  return { installedVersion, status: 'installed' };
}

export function scanExtensionSources(dataDir: string): InstalledExtensionSource[] {
  const registry = loadRegistry(dataDir);
  return [...(registry.sources ?? [])].sort((left, right) => right.installedAt.localeCompare(left.installedAt));
}

export async function scanExtensionCatalog(
  dataDir: string,
  addonsDir: string,
  modsDir: string,
  themesDir: string,
): Promise<ExtensionCatalogEntry[]> {
  const sources = scanExtensionSources(dataDir);
  const installedAddonVersions = new Map(
    scanAddons(addonsDir).map(addon => [addon.id, addon.manifest.version]),
  );
  const installedModVersions = new Map(
    scanMods(modsDir).map(mod => [mod.id, mod.manifest.version]),
  );
  const installedThemeVersions = new Map(
    scanThemes(themesDir).map(theme => [theme.id, theme.manifest.version]),
  );

  const entries: ExtensionCatalogEntry[] = [];

  for (const source of sources) {
    const sourceName = source.syncState.manifest?.name ?? source.id;

    for (const kind of ['addons', 'mods', 'themes'] as const) {
      const cachedEntries = source.syncState.lists?.[kind]?.entries ?? [];
      for (const rawEntryId of cachedEntries) {
        const entryId = normalizeCatalogEntryId(rawEntryId);
        if (!entryId) continue;

        try {
          const resolved = await resolveCatalogEntryPayload(source, kind, entryId);
          const status = buildCatalogEntryStatus(
            source,
            kind,
            resolved.manifestId,
            resolved.manifestVersion,
            installedAddonVersions,
            installedModVersions,
            installedThemeVersions,
          );

          entries.push({
            id: createCatalogEntryKey(source.id, kind, entryId),
            sourceId: source.id,
            sourceName,
            sourceEnabled: source.enabled,
            kind,
            entryId,
            manifestId: resolved.manifestId,
            manifestName: resolved.manifestName,
            manifestVersion: resolved.manifestVersion,
            icon: resolved.icon,
            manifestDescription: resolved.manifestDescription,
            manifestAuthor: resolved.manifestAuthor,
            manifestType: resolved.manifestType,
            minAppVersion: resolved.minAppVersion,
            installedVersion: status.installedVersion,
            status: status.status,
            installSupport: canDirectInstallCatalogEntry(source, resolved) ? 'direct' : 'manual',
            dependencies: resolved.dependencies,
            packageFiles: resolved.packageFiles,
            permissions: resolved.permissions,
            duplicateSourceIds: [],
            duplicateSourceNames: [],
            resolvedManifestUri: resolved.resolvedManifestUri,
            resolvedCardUri: resolved.resolvedCardUri,
            cardMarkdown: resolved.cardMarkdown,
          });
        } catch (error) {
          entries.push({
            id: createCatalogEntryKey(source.id, kind, entryId),
            sourceId: source.id,
            sourceName,
            sourceEnabled: source.enabled,
            kind,
            entryId,
            status: 'invalid',
            installSupport: kind === 'mods' ? 'manual' : 'direct',
            dependencies: [],
            packageFiles: [],
            permissions: [],
            duplicateSourceIds: [],
            duplicateSourceNames: [],
            lastError: error instanceof Error ? error.message : 'Failed to resolve the catalog entry.',
          });
        }
      }
    }
  }

  const duplicateIndex = new Map<string, ExtensionCatalogEntry[]>();
  for (const entry of entries) {
    if (!entry.manifestId) continue;
    const duplicateKey = createCatalogManifestKey(entry.kind, entry.manifestId);
    const group = duplicateIndex.get(duplicateKey);
    if (group) {
      group.push(entry);
    } else {
      duplicateIndex.set(duplicateKey, [entry]);
    }
  }

  for (const group of duplicateIndex.values()) {
    const uniqueSourceIds = new Set(group.map(entry => entry.sourceId));
    if (uniqueSourceIds.size < 2) continue;

    for (const entry of group) {
      const duplicates = group.filter(candidate => candidate.sourceId !== entry.sourceId);
      entry.duplicateSourceIds = duplicates.map(candidate => candidate.sourceId);
      entry.duplicateSourceNames = Array.from(new Set(duplicates.map(candidate => candidate.sourceName)));
    }
  }

  return entries.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return (left.manifestName ?? left.entryId).localeCompare(right.manifestName ?? right.entryId);
  });
}

export async function installExtensionSource(
  dataDir: string,
  input: ExtensionSourceInput,
): Promise<ExtensionSourceInstallResult> {
  const registry = loadRegistry(dataDir);
  const baseEntry = getBlankSourceEntry(input);

  let synced: SyncedSourcePayload;
  try {
    synced = await syncSourceInput(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to read the extension source.',
    };
  }

  const nextEntry = withSuccessSyncState(baseEntry, synced);
  const existingIndex = registry.sources.findIndex(source => source.id === nextEntry.id);

  if (existingIndex >= 0) {
    const previous = registry.sources[existingIndex];
    registry.sources[existingIndex] = {
      ...nextEntry,
      enabled: previous.enabled,
      installedAt: previous.installedAt,
    };
  } else {
    registry.sources.push(nextEntry);
  }

  saveRegistry(dataDir, registry);

  return { ok: true, source: nextEntry };
}

export async function updateExtensionSource(
  dataDir: string,
  sourceId: string,
  input: ExtensionSourceInput,
): Promise<ExtensionSourceInstallResult> {
  const registry = loadRegistry(dataDir);
  const existingIndex = registry.sources.findIndex(source => source.id === sourceId);
  if (existingIndex < 0) {
    return { ok: false, error: 'Extension source not found.' };
  }

  const previous = registry.sources[existingIndex];
  let synced: SyncedSourcePayload;
  try {
    synced = await syncSourceInput(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update the extension source.',
    };
  }

  if (synced.manifest.id !== sourceId) {
    return {
      ok: false,
      error: `Source id changed from "${sourceId}" to "${synced.manifest.id}".`,
    };
  }

  const nextEntry = withSuccessSyncState({
    ...previous,
    input,
  }, synced);
  registry.sources[existingIndex] = nextEntry;
  saveRegistry(dataDir, registry);

  return { ok: true, source: nextEntry };
}

export function removeExtensionSource(dataDir: string, sourceId: string) {
  const registry = loadRegistry(dataDir);
  const nextSources = registry.sources.filter(source => source.id !== sourceId);
  if (nextSources.length === registry.sources.length) return false;
  saveRegistry(dataDir, { sources: nextSources });
  return true;
}

export function toggleExtensionSource(dataDir: string, sourceId: string, enabled: boolean) {
  const registry = loadRegistry(dataDir);
  const source = registry.sources.find(entry => entry.id === sourceId);
  if (!source) return false;
  source.enabled = enabled;
  saveRegistry(dataDir, registry);
  return true;
}

export async function syncExtensionSource(
  dataDir: string,
  sourceId: string,
): Promise<ExtensionSourceSyncResult> {
  const registry = loadRegistry(dataDir);
  const sourceIndex = registry.sources.findIndex(entry => entry.id === sourceId);
  if (sourceIndex < 0) {
    return { ok: false, error: 'Extension source not found.' };
  }

  const previous = registry.sources[sourceIndex];
  try {
    const synced = await syncSourceInput(previous.input);
    if (synced.manifest.id !== previous.id) {
      return {
        ok: false,
        error: `Source id changed from "${previous.id}" to "${synced.manifest.id}".`,
      };
    }

    const nextEntry = withSuccessSyncState(previous, synced);
    registry.sources[sourceIndex] = nextEntry;
    saveRegistry(dataDir, registry);
    return { ok: true, source: nextEntry };
  } catch (error) {
    const nextEntry = withErrorSyncState(
      previous,
      error instanceof Error ? error.message : 'Failed to sync the extension source.',
    );
    registry.sources[sourceIndex] = nextEntry;
    saveRegistry(dataDir, registry);
    return { ok: false, error: nextEntry.syncState.lastError, source: nextEntry };
  }
}

export async function syncAllExtensionSources(dataDir: string): Promise<ExtensionSourceSyncResult[]> {
  const sources = scanExtensionSources(dataDir)
    .filter(source => source.enabled);

  const results: ExtensionSourceSyncResult[] = [];
  for (const source of sources) {
    results.push(await syncExtensionSource(dataDir, source.id));
  }

  return results;
}

export async function installExtensionCatalogEntry(
  dataDir: string,
  addonsDir: string,
  modsDir: string,
  themesDir: string,
  sourceId: string,
  kind: 'addons' | 'mods' | 'themes',
  entryId: string,
): Promise<ExtensionCatalogInstallResult> {
  const source = scanExtensionSources(dataDir).find(entry => entry.id === sourceId);
  if (!source) {
    return { ok: false, error: 'Extension source not found.' };
  }

  try {
    const resolved = await resolveCatalogEntryPayload(source, kind, entryId);
    if (!canDirectInstallCatalogEntry(source, resolved)) {
      return {
        ok: false,
        error: 'This catalog entry requires manual installation because the package file list is missing.',
      };
    }

    const result = kind === 'mods'
      ? await (async () => {
          if (source.input.type === 'local') {
            return installModFromFolder(modsDir, resolved.resolvedManifestUri);
          }

          const packageFiles = await Promise.all(
            resolved.packageFiles.map(async (relativePath) => ({
              relativePath,
              content: await readTextByUri(resolveCatalogPackageFileUri(resolved.resolvedManifestUri, relativePath)),
            })),
          );
          return installModFromPackage(modsDir, resolved.manifestText, packageFiles);
        })()
      : kind === 'themes'
        ? installThemeFromJSON(themesDir, resolved.manifestText)
        : installAddonFromJSON(addonsDir, resolved.manifestText);

    return {
      ...result,
      entry: {
        id: createCatalogEntryKey(source.id, kind, resolved.entryId),
        sourceId: source.id,
        sourceName: source.syncState.manifest?.name ?? source.id,
        sourceEnabled: source.enabled,
        kind,
        entryId: resolved.entryId,
        manifestId: resolved.manifestId,
        manifestName: resolved.manifestName,
        manifestVersion: resolved.manifestVersion,
        icon: resolved.icon,
        manifestDescription: resolved.manifestDescription,
        manifestAuthor: resolved.manifestAuthor,
        manifestType: resolved.manifestType,
        minAppVersion: resolved.minAppVersion,
        status: result.ok ? 'installed' : 'available',
        installSupport: canDirectInstallCatalogEntry(source, resolved) ? 'direct' : 'manual',
        dependencies: resolved.dependencies,
        packageFiles: resolved.packageFiles,
        permissions: resolved.permissions,
        duplicateSourceIds: [],
        duplicateSourceNames: [],
        resolvedManifestUri: resolved.resolvedManifestUri,
        resolvedCardUri: resolved.resolvedCardUri,
        cardMarkdown: resolved.cardMarkdown,
        ...(result.error ? { lastError: result.error } : {}),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to install the catalog entry.',
    };
  }
}
