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
  | 'incompatible'
  | 'invalid';
export type ExtensionCatalogInstallSupport = 'direct' | 'manual';
export type ExtensionCatalogIssueStage = 'manifest' | 'list' | 'card' | 'package';
export type ExtensionCatalogIssueSeverity = 'warning' | 'error';
export type ExtensionCatalogIssueFallback = 'stale-cache' | 'skipped-card' | 'manual-only' | 'blocked-install';

export interface ExtensionCatalogIssue {
  stage: ExtensionCatalogIssueStage;
  severity: ExtensionCatalogIssueSeverity;
  message: string;
  code?: string;
  params?: Record<string, string | number>;
  target?: string;
  fallback?: ExtensionCatalogIssueFallback;
}

export interface ExtensionCatalogCompatibility {
  appVersion: string;
  compatible: boolean;
  minAppVersion?: string;
}

export type ExtensionCatalogDuplicateRecommendationReason = 'newer-available' | 'newest-blocked';

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
  lastErrorStage?: Extract<ExtensionCatalogIssueStage, 'manifest' | 'list' | 'card'>;
  lastErrorTarget?: string;
  lastErrorFallback?: Extract<ExtensionCatalogIssueFallback, 'stale-cache'>;
  resolvedManifestUri?: string;
  manifest?: ExtensionSourceManifest;
  lists?: ExtensionSourceCachedLists;
  sourceCardUri?: string;
  sourceCardMarkdown?: string;
  sourceCardIssue?: ExtensionCatalogIssue;
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
  compatibility?: ExtensionCatalogCompatibility;
  installedVersion?: string;
  status: ExtensionCatalogEntryStatus;
  installSupport: ExtensionCatalogInstallSupport;
  dependencies: string[];
  packageFiles: string[];
  permissions: string[];
  duplicateSourceIds: string[];
  duplicateSourceNames: string[];
  duplicatePreferredSourceName?: string;
  duplicatePreferredVersion?: string;
  duplicateRecommendationReason?: ExtensionCatalogDuplicateRecommendationReason;
  resolvedManifestUri?: string;
  resolvedCardUri?: string;
  cardMarkdown?: string;
  lastError?: string;
  issues: ExtensionCatalogIssue[];
}

export interface ExtensionCatalogInstallResult {
  ok: boolean;
  error?: string;
  addon?: InstalledAddon;
  mod?: InstalledMod;
  theme?: InstalledTheme;
  entry?: ExtensionCatalogEntry;
}

export interface ExtensionCatalogPreflightResult {
  ok: boolean;
  blocked: boolean;
  error?: string;
  entry?: ExtensionCatalogEntry;
  issues: ExtensionCatalogIssue[];
}
