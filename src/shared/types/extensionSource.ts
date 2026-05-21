import type { InstalledAddon, InstalledMod } from './addon';
import type { ModPermission } from './modApi';
import type { InstalledTheme } from './theme';

export const EXTENSION_SOURCE_MANIFEST_VERSION = 1;
export const EXTENSION_SOURCE_MANIFEST_TYPE = 'extension-source';

export const EXTENSION_SOURCE_TYPES = ['local', 'url', 'github'] as const;
export type ExtensionSourceType = typeof EXTENSION_SOURCE_TYPES[number];

export const EXTENSION_CATALOG_KINDS = ['addons', 'mods', 'themes'] as const;
export type ExtensionCatalogKind = typeof EXTENSION_CATALOG_KINDS[number];

export const EXTENSION_CATALOG_ENTRY_STATUSES = [
  'available',
  'installed',
  'update-available',
  'source-disabled',
  'source-error',
  'incompatible',
  'invalid',
] as const;
export type ExtensionCatalogEntryStatus = typeof EXTENSION_CATALOG_ENTRY_STATUSES[number];

export const EXTENSION_CATALOG_INSTALL_SUPPORTS = ['direct', 'manual'] as const;
export type ExtensionCatalogInstallSupport = typeof EXTENSION_CATALOG_INSTALL_SUPPORTS[number];

export const EXTENSION_CATALOG_ISSUE_STAGES = ['manifest', 'list', 'card', 'package'] as const;
export type ExtensionCatalogIssueStage = typeof EXTENSION_CATALOG_ISSUE_STAGES[number];

export const EXTENSION_CATALOG_ISSUE_SEVERITIES = ['warning', 'error'] as const;
export type ExtensionCatalogIssueSeverity = typeof EXTENSION_CATALOG_ISSUE_SEVERITIES[number];

export const EXTENSION_CATALOG_ISSUE_FALLBACKS = [
  'stale-cache',
  'skipped-card',
  'manual-only',
  'blocked-install',
] as const;
export type ExtensionCatalogIssueFallback = typeof EXTENSION_CATALOG_ISSUE_FALLBACKS[number];

export const EXTENSION_SOURCE_SYNC_STATUSES = ['never', 'ready', 'error'] as const;
export type ExtensionSourceSyncStatus = typeof EXTENSION_SOURCE_SYNC_STATUSES[number];

export function isExtensionCatalogKind(value: unknown): value is ExtensionCatalogKind {
  return typeof value === 'string' && (EXTENSION_CATALOG_KINDS as readonly string[]).includes(value);
}

export function isExtensionSourceType(value: unknown): value is ExtensionSourceType {
  return typeof value === 'string' && (EXTENSION_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isExtensionCatalogEntryStatus(value: unknown): value is ExtensionCatalogEntryStatus {
  return typeof value === 'string' && (EXTENSION_CATALOG_ENTRY_STATUSES as readonly string[]).includes(value);
}

export function isExtensionCatalogInstallSupport(value: unknown): value is ExtensionCatalogInstallSupport {
  return typeof value === 'string' && (EXTENSION_CATALOG_INSTALL_SUPPORTS as readonly string[]).includes(value);
}

export function isExtensionCatalogIssueStage(value: unknown): value is ExtensionCatalogIssueStage {
  return typeof value === 'string' && (EXTENSION_CATALOG_ISSUE_STAGES as readonly string[]).includes(value);
}

export function isExtensionCatalogIssueSeverity(value: unknown): value is ExtensionCatalogIssueSeverity {
  return typeof value === 'string' && (EXTENSION_CATALOG_ISSUE_SEVERITIES as readonly string[]).includes(value);
}

export function isExtensionCatalogIssueFallback(value: unknown): value is ExtensionCatalogIssueFallback {
  return typeof value === 'string' && (EXTENSION_CATALOG_ISSUE_FALLBACKS as readonly string[]).includes(value);
}

export function isExtensionSourceSyncStatus(value: unknown): value is ExtensionSourceSyncStatus {
  return typeof value === 'string' && (EXTENSION_SOURCE_SYNC_STATUSES as readonly string[]).includes(value);
}

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

export const EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS = [
  'newer-available',
  'newest-blocked',
] as const;
export type ExtensionCatalogDuplicateRecommendationReason = typeof EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS[number];

export function isExtensionCatalogDuplicateRecommendationReason(
  value: unknown,
): value is ExtensionCatalogDuplicateRecommendationReason {
  return typeof value === 'string'
    && (EXTENSION_CATALOG_DUPLICATE_RECOMMENDATION_REASONS as readonly string[]).includes(value);
}

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
  type: typeof EXTENSION_SOURCE_MANIFEST_TYPE;
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
  status: ExtensionSourceSyncStatus;
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
  permissions: ModPermission[];
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

export function isExtensionCatalogEntryBlocked(entry: ExtensionCatalogEntry) {
  return entry.status === 'invalid'
    || entry.status === 'source-disabled'
    || entry.status === 'source-error'
    || entry.status === 'incompatible'
    || entry.installSupport !== 'direct'
    || entry.issues.some(issue => issue.fallback === 'blocked-install');
}

export function canInstallExtensionCatalogEntry(entry: ExtensionCatalogEntry) {
  return !isExtensionCatalogEntryBlocked(entry) && entry.status !== 'installed';
}

export function getExtensionCatalogEntryBlockReason(entry: ExtensionCatalogEntry) {
  const blockingIssue = entry.issues.find(issue => issue.fallback === 'blocked-install' || issue.severity === 'error');
  if (blockingIssue) return blockingIssue.message;

  if (entry.status === 'invalid') return entry.lastError ?? 'Catalog entry is invalid.';
  if (entry.status === 'source-disabled') return 'Extension source is disabled.';
  if (entry.status === 'source-error') return entry.lastError ?? 'Extension source is not synchronized.';
  if (entry.status === 'incompatible') return 'Catalog entry is not compatible with this app version.';
  if (entry.installSupport !== 'direct') return 'Catalog entry requires manual installation.';
  return undefined;
}

export function hasExtensionCatalogAttention(entry: ExtensionCatalogEntry) {
  return entry.status === 'incompatible'
    || entry.status === 'invalid'
    || entry.status === 'source-disabled'
    || entry.status === 'source-error'
    || entry.installSupport === 'manual'
    || entry.issues.length > 0
    || entry.duplicateRecommendationReason !== undefined
    || entry.duplicateSourceIds.length > 0;
}
