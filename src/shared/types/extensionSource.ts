import type { InstalledAddon, InstalledMod } from './addon';
import type { InstalledTheme } from './theme';

export const EXTENSION_SOURCE_MANIFEST_VERSION = 1;

export type ExtensionSourceType = 'local' | 'url' | 'github';
export type ExtensionCatalogKind = 'addons' | 'mods' | 'themes';
export type ExtensionCatalogEntryStatus =
  | 'available'
  | 'installed'
  | 'update-available'
  | 'source-disabled'
  | 'source-error'
  | 'invalid';
export type ExtensionCatalogInstallSupport = 'direct' | 'manual';

export interface LocalExtensionSourceInput {
  type: 'local';
  manifestPath: string;
}

export interface UrlExtensionSourceInput {
  type: 'url';
  manifestUrl: string;
}

export interface GitHubExtensionSourceInput {
  type: 'github';
  manifestUrl?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  basePath?: string;
  manifestPath?: string;
}

export type ExtensionSourceInput =
  | LocalExtensionSourceInput
  | UrlExtensionSourceInput
  | GitHubExtensionSourceInput;

export interface ExtensionSourceCatalogRefs {
  addons?: string;
  mods?: string;
  themes?: string;
}

export interface ExtensionSourceCardRefs {
  source?: string;
  addons?: string;
  mods?: string;
  themes?: string;
}

export interface ExtensionSourceManifest {
  manifestVersion: number;
  id: string;
  name: string;
  version: string;
  icon?: string;
  type: 'extension-source';
  description?: string;
  author?: string;
  basePath?: string;
  lists: ExtensionSourceCatalogRefs;
  cards?: ExtensionSourceCardRefs;
}

export interface ExtensionSourceCachedList {
  ref: string;
  entries: string[];
}

export interface ExtensionSourceCachedLists {
  addons?: ExtensionSourceCachedList;
  mods?: ExtensionSourceCachedList;
  themes?: ExtensionSourceCachedList;
}

export interface ExtensionSourceSyncState {
  status: 'never' | 'ready' | 'error';
  lastCheckedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  resolvedManifestUri?: string;
  manifest?: ExtensionSourceManifest;
  lists?: ExtensionSourceCachedLists;
  sourceCardUri?: string;
  sourceCardMarkdown?: string;
}

export interface InstalledExtensionSource {
  id: string;
  enabled: boolean;
  installedAt: string;
  input: ExtensionSourceInput;
  syncState: ExtensionSourceSyncState;
}

export interface ExtensionSourceRegistryState {
  sources: InstalledExtensionSource[];
}

export interface ExtensionSourceInstallResult {
  ok: boolean;
  error?: string;
  source?: InstalledExtensionSource;
}

export interface ExtensionSourceSyncResult {
  ok: boolean;
  error?: string;
  source?: InstalledExtensionSource;
}

export interface ExtensionCatalogEntry {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceEnabled: boolean;
  kind: ExtensionCatalogKind;
  entryId: string;
  manifestId?: string;
  manifestName?: string;
  manifestVersion?: string;
  icon?: string;
  manifestDescription?: string;
  manifestAuthor?: string;
  manifestType?: string;
  minAppVersion?: string;
  installedVersion?: string;
  status: ExtensionCatalogEntryStatus;
  installSupport: ExtensionCatalogInstallSupport;
  dependencies: string[];
  packageFiles: string[];
  permissions: string[];
  duplicateSourceIds: string[];
  duplicateSourceNames: string[];
  resolvedManifestUri?: string;
  resolvedCardUri?: string;
  cardMarkdown?: string;
  lastError?: string;
}

export interface ExtensionCatalogInstallResult {
  ok: boolean;
  error?: string;
  addon?: InstalledAddon;
  mod?: InstalledMod;
  theme?: InstalledTheme;
  entry?: ExtensionCatalogEntry;
}
