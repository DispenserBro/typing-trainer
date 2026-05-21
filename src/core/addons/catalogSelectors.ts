import type {
  ExtensionCatalogEntry,
  ExtensionCatalogKind,
  InstalledAddon,
  InstalledExtensionSource,
  InstalledMod,
  InstalledTheme,
} from '../../shared/types';
import {
  canInstallExtensionCatalogEntry,
  hasExtensionCatalogAttention,
} from '../../shared/types/extensionSource';

export type AddonContentKind =
  | 'words'
  | 'lessons'
  | 'layouts'
  | 'languages'
  | 'items'
  | 'achievements'
  | 'themes'
  | 'practicePacks'
  | 'interfaceLocales';

export type ExtensionCatalogListFilter = 'all' | 'attention' | ExtensionCatalogKind;
export type InstalledAddonContentFilter = 'all' | AddonContentKind;

function normalizeSearch(search: string) {
  return search.trim().toLowerCase();
}

function matchesSearchParts(search: string, parts: Array<string | null | undefined>) {
  const needle = normalizeSearch(search);
  if (!needle) return true;
  return parts.filter(Boolean).join(' ').toLowerCase().includes(needle);
}

export function getAddonContentKinds(addon: InstalledAddon): AddonContentKind[] {
  const resources = addon.manifest.resources;
  if (!resources) return [];

  const tags: AddonContentKind[] = [];
  if (resources.words?.length) tags.push('words');
  if (resources.lessons?.length) tags.push('lessons');
  if (resources.layouts?.length) tags.push('layouts');
  if (resources.languages?.length) tags.push('languages');
  if (resources.items?.items?.length) tags.push('items');
  if (resources.achievements?.achievements?.length) tags.push('achievements');
  if (resources.themes && Object.keys(resources.themes.themes).length) tags.push('themes');
  if (resources.practicePacks?.packs?.length) tags.push('practicePacks');
  if (resources.interfaceLocales?.locales?.length || resources.locales?.length) tags.push('interfaceLocales');
  return tags;
}

export function getSourceLocationLabel(source: InstalledExtensionSource) {
  if (source.input.type === 'local') return source.input.manifestPath;
  if (source.input.type === 'url') return source.input.manifestUrl;
  if (source.input.manifestUrl?.trim()) return source.input.manifestUrl;

  const repoLabel = `${source.input.owner}/${source.input.repo}`;
  const branchLabel = source.input.branch?.trim() || 'main';
  const basePath = source.input.basePath?.trim();
  return basePath ? `${repoLabel}#${branchLabel}/${basePath}` : `${repoLabel}#${branchLabel}`;
}

export function catalogEntryMatchesSearch(entry: ExtensionCatalogEntry, search: string) {
  return matchesSearchParts(search, [
    entry.entryId,
    entry.sourceName,
    entry.manifestId,
    entry.manifestName,
    entry.manifestDescription,
    entry.manifestAuthor,
  ]);
}

export function installedAddonMatchesSearch(addon: InstalledAddon, search: string) {
  return matchesSearchParts(search, [
    addon.id,
    addon.manifest.name,
    addon.manifest.description,
    addon.manifest.author,
    addon.manifest.version,
  ]);
}

export function installedModMatchesSearch(mod: InstalledMod, search: string) {
  return matchesSearchParts(search, [
    mod.id,
    mod.manifest.name,
    mod.manifest.description,
    mod.manifest.author,
    mod.manifest.version,
  ]);
}

export function installedThemeMatchesSearch(theme: InstalledTheme, search: string) {
  return matchesSearchParts(search, [
    theme.id,
    theme.manifest.name,
    theme.manifest.description,
    theme.manifest.author,
    theme.manifest.version,
  ]);
}

export function extensionSourceMatchesSearch(source: InstalledExtensionSource, search: string) {
  const manifest = source.syncState.manifest;
  return matchesSearchParts(search, [
    source.id,
    manifest?.name,
    manifest?.description,
    manifest?.author,
    getSourceLocationLabel(source),
  ]);
}

function getCatalogSortScore(entry: ExtensionCatalogEntry) {
  if (entry.status === 'update-available' && canInstallExtensionCatalogEntry(entry)) return 0;
  if (entry.status === 'available' && canInstallExtensionCatalogEntry(entry)) return 1;
  if (entry.status === 'update-available') return 2;
  if (entry.status === 'installed') return 3;
  if (entry.duplicateRecommendationReason) return 4;
  if (hasExtensionCatalogAttention(entry)) return 5;
  return 6;
}

export function compareCatalogEntries(left: ExtensionCatalogEntry, right: ExtensionCatalogEntry) {
  const scoreDiff = getCatalogSortScore(left) - getCatalogSortScore(right);
  if (scoreDiff !== 0) return scoreDiff;
  if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
  return (left.manifestName ?? left.entryId).localeCompare(right.manifestName ?? right.entryId);
}

export function filterExtensionCatalogEntries({
  entries,
  filter,
  search,
}: {
  entries: ExtensionCatalogEntry[];
  filter: ExtensionCatalogListFilter;
  search: string;
}) {
  return entries
    .filter((entry) => {
      if (filter === 'attention' && !hasExtensionCatalogAttention(entry)) return false;
      if (filter !== 'all' && filter !== 'attention' && entry.kind !== filter) return false;
      return catalogEntryMatchesSearch(entry, search);
    })
    .sort(compareCatalogEntries);
}

export function countAttentionCatalogEntries(entries: ExtensionCatalogEntry[]) {
  return entries.filter(hasExtensionCatalogAttention).length;
}

export function filterInstalledAddons({
  addons,
  contentFilter,
  search,
}: {
  addons: InstalledAddon[];
  contentFilter: InstalledAddonContentFilter;
  search: string;
}) {
  return addons.filter(addon => installedAddonMatchesSearch(addon, search))
    .filter(addon => contentFilter === 'all' || getAddonContentKinds(addon).includes(contentFilter));
}

export function getAvailableInstalledAddonContentKinds(addons: InstalledAddon[], search: string) {
  return Array.from(new Set(
    addons
      .filter(addon => installedAddonMatchesSearch(addon, search))
      .flatMap(addon => getAddonContentKinds(addon)),
  ));
}

export function filterInstalledMods(mods: InstalledMod[], search: string) {
  return mods.filter(mod => installedModMatchesSearch(mod, search));
}

export function filterInstalledThemes(themes: InstalledTheme[], search: string) {
  return themes.filter(theme => installedThemeMatchesSearch(theme, search));
}

export function filterExtensionSources(sources: InstalledExtensionSource[], search: string) {
  return sources.filter(source => extensionSourceMatchesSearch(source, search));
}
