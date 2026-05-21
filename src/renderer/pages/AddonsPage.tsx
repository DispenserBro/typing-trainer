import { useEffect, useMemo, useState, type ReactElement } from 'react';
import * as LucideIcons from 'lucide-react';
import { useAppExtensions, useAppSettings } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import {
  AlertTriangle,
  BookOpen,
  Download,
  FolderOpen,
  Github,
  Globe,
  Link2Off,
  Package,
  Palette,
  Pencil,
  Puzzle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  ExtensionSourceInput,
  ExtensionSourceType,
  ExtensionCatalogEntry,
  ExtensionCatalogKind,
  InstalledAddon,
  InstalledExtensionSource,
  InstalledMod,
  InstalledTheme,
  ModPermission,
  TranslationParams,
} from '../../shared/types';
import {
  EXTENSION_SOURCE_TYPES,
  canInstallExtensionCatalogEntry,
  isExtensionSourceType,
} from '../../shared/types/extensionSource';
import {
  countAttentionCatalogEntries,
  filterExtensionCatalogEntries,
  filterExtensionSources,
  filterInstalledAddons,
  filterInstalledMods,
  filterInstalledThemes,
  getAddonContentKinds,
  getAvailableInstalledAddonContentKinds,
  getSourceLocationLabel,
  type AddonContentKind,
} from '../../core/addons/catalogSelectors';
import {
  buildExtensionCatalogEmptyStateViewModel,
  buildExtensionCatalogInstallActionViewModel,
  type ExtensionCatalogEmptyIconKind,
} from '../../core/addons/extensionCatalogUi';
import { Button } from '../components/ui/Button';
import { ChipList } from '../components/ui/ChipList';
import { CountTabButton } from '../components/ui/CountTabButton';
import { EmptyStatePanel } from '../components/ui/EmptyStatePanel';
import { ModalLayout } from '../components/ui/ModalLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { SafeMarkdown } from '../components/ui/SafeMarkdown';
import { SelectInput } from '../components/ui/SelectInput';
import { TextInput } from '../components/ui/TextInput';

type AddonsView = 'catalog' | 'installed';
type CatalogFilter = 'all' | 'attention' | ExtensionCatalogKind;
type InstalledFilter = 'all' | 'addons' | 'mods' | 'themes';

type SourceFormState = {
  manifestPath: string;
  manifestUrl: string;
  mode: 'create' | 'edit';
  sourceId?: string;
  sourceType: ExtensionSourceType;
};

type MarkdownPreviewState = {
  author?: string;
  baseUri?: string;
  compatible?: boolean;
  description?: string;
  entry?: ExtensionCatalogEntry;
  appVersion?: string;
  markdown: string;
  minAppVersion?: string;
  title: string;
  version?: string;
};

type CatalogIssue = ExtensionCatalogEntry['issues'][number];
type CatalogIssueSectionKey = 'attention' | 'limitations' | 'diagnostics';

function getInitialSourceFormState(): SourceFormState {
  return {
    manifestPath: '',
    manifestUrl: '',
    mode: 'create',
    sourceType: 'local',
  };
}

/* ── Addon helpers ──────────────────────────────────────── */

function getAddonContentKindLabel(kind: AddonContentKind, t: (key: string) => string) {
  return t(`addons.tags.${kind}`);
}

function resourceTags(addon: InstalledAddon, t: (key: string) => string): string[] {
  return getAddonContentKinds(addon).map(kind => getAddonContentKindLabel(kind, t));
}

/* ── Source helpers ─────────────────────────────────────── */

function getSourceTypeLabel(type: ExtensionSourceType, t: (key: string) => string) {
  if (type === 'local') return t('addons.sources.types.local');
  if (type === 'url') return t('addons.sources.types.url');
  return t('addons.sources.types.github');
}

function getSourceTypeIcon(type: ExtensionSourceType) {
  if (type === 'local') return <FolderOpen size={24} />;
  if (type === 'url') return <Globe size={24} />;
  return <Github size={24} />;
}

function getSourceTypeOptions(t: (key: string) => string) {
  return EXTENSION_SOURCE_TYPES.map(type => ({
    label: getSourceTypeLabel(type, t),
    value: type,
  }));
}

function toLucideIconKey(value: string) {
  return value
    .trim()
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function resolveLucideIcon(iconName?: string): LucideIcon | null {
  if (!iconName?.trim()) return null;

  const directMatch = (LucideIcons as Record<string, unknown>)[iconName.trim()];
  if (directMatch && (typeof directMatch === 'function' || typeof directMatch === 'object')) {
    return directMatch as LucideIcon;
  }

  const normalizedKey = toLucideIconKey(iconName);
  const normalizedMatch = (LucideIcons as Record<string, unknown>)[normalizedKey];
  if (normalizedMatch && (typeof normalizedMatch === 'function' || typeof normalizedMatch === 'object')) {
    return normalizedMatch as LucideIcon;
  }

  return null;
}

function renderManifestIcon(iconName: string | undefined, fallback: ReactElement) {
  const IconComponent = resolveLucideIcon(iconName);
  return IconComponent ? <IconComponent size={24} /> : fallback;
}

function getSourceCounts(source: InstalledExtensionSource, t: (key: string, params?: Record<string, string | number>) => string) {
  const lists = source.syncState.lists;
  const chips: string[] = [];
  if (lists?.addons) chips.push(t('addons.sources.counts.addons', { count: lists.addons.entries.length }));
  if (lists?.mods) chips.push(t('addons.sources.counts.mods', { count: lists.mods.entries.length }));
  if (lists?.themes) chips.push(t('addons.sources.counts.themes', { count: lists.themes.entries.length }));
  return chips;
}

function getSourceStatusLabel(source: InstalledExtensionSource, t: (key: string) => string) {
  if (!source.enabled) return t('addons.sources.status.disabled');
  if (source.syncState.status === 'ready') return t('addons.sources.status.ready');
  if (source.syncState.status === 'error') return t('addons.sources.status.error');
  return t('addons.sources.status.never');
}

function getCatalogKindLabel(kind: ExtensionCatalogKind, t: (key: string) => string) {
  if (kind === 'addons') return t('addons.catalog.kinds.addons');
  if (kind === 'mods') return t('addons.catalog.kinds.mods');
  return t('addons.catalog.kinds.themes');
}

function getCatalogStatusLabel(entry: ExtensionCatalogEntry, t: (key: string) => string) {
  switch (entry.status) {
    case 'installed':
      return t('addons.catalog.status.installed');
    case 'update-available':
      return t('addons.catalog.status.updateAvailable');
    case 'source-disabled':
      return t('addons.catalog.status.sourceDisabled');
    case 'source-error':
      return t('addons.catalog.status.sourceError');
    case 'incompatible':
      return t('addons.catalog.status.incompatible');
    case 'invalid':
      return t('addons.catalog.status.invalid');
    default:
      return t('addons.catalog.status.available');
  }
}

function getIssueText(
  issue: CatalogIssue,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (issue.code) {
    return t(issue.code, issue.params);
  }

  const genericKey = issue.stage === 'list'
    ? 'addons.catalog.issue.listProblem'
    : issue.stage === 'card'
      ? 'addons.catalog.issue.cardProblem'
      : issue.stage === 'package'
        ? 'addons.catalog.issue.packageProblem'
        : 'addons.catalog.issue.manifestProblem';

  return t(genericKey, { details: issue.message });
}

function getIssueClassName(issue: CatalogIssue) {
  const variants = ['addon-card__issue'];

  if (issue.fallback === 'blocked-install') {
    variants.push('addon-card__issue--compatibility');
  } else if (issue.fallback === 'manual-only') {
    variants.push('addon-card__issue--manual');
  } else if (issue.stage === 'card') {
    variants.push('addon-card__issue--card');
  } else if (issue.stage === 'manifest' && issue.severity === 'warning') {
    variants.push('addon-card__issue--dependency');
  } else if (issue.severity === 'error') {
    variants.push('addon-card__issue--error');
  }

  return variants.join(' ');
}

function getVisibleIssues(entry: ExtensionCatalogEntry, severity: 'warning' | 'error') {
  const seen = new Set<string>();
  const issues: ExtensionCatalogEntry['issues'] = [];

  for (const issue of entry.issues) {
    if (issue.severity !== severity) continue;
    const key = issue.code ? `${issue.code}:${JSON.stringify(issue.params ?? {})}` : issue.message;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    issues.push(issue);
  }

  return issues;
}

function getIssueSectionKey(issue: CatalogIssue): CatalogIssueSectionKey {
  if (issue.fallback === 'manual-only') return 'limitations';
  if (issue.stage === 'card' || issue.stage === 'list' || issue.fallback === 'stale-cache') return 'diagnostics';
  return 'attention';
}

function getIssueSectionTitle(section: CatalogIssueSectionKey, t: (key: string) => string) {
  if (section === 'limitations') return t('addons.catalog.issueSections.limitations');
  if (section === 'diagnostics') return t('addons.catalog.issueSections.diagnostics');
  return t('addons.catalog.issueSections.attention');
}

function getGroupedIssues(entry: ExtensionCatalogEntry) {
  const grouped: Record<CatalogIssueSectionKey, CatalogIssue[]> = {
    attention: [],
    limitations: [],
    diagnostics: [],
  };

  for (const issue of [...getVisibleIssues(entry, 'error'), ...getVisibleIssues(entry, 'warning')]) {
    grouped[getIssueSectionKey(issue)].push(issue);
  }

  return grouped;
}

function getSourceErrorMessage(source: InstalledExtensionSource, t: (key: string) => string) {
  if (!source.syncState.lastError) return null;
  if (source.syncState.lastErrorFallback === 'stale-cache') {
    return `${source.syncState.lastError} ${t('addons.catalog.fallback.staleCache')}`;
  }
  return source.syncState.lastError;
}

function getSourceIssueMessage(source: InstalledExtensionSource, t: (key: string, params?: Record<string, string | number>) => string) {
  const issue = source.syncState.sourceCardIssue;
  if (!issue) return null;
  if (issue.code) return t(issue.code, issue.params);
  return t('addons.catalog.issue.cardProblem', { details: issue.message });
}

function CatalogIssueSections({
  entry,
  t,
}: {
  entry: ExtensionCatalogEntry;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const groupedIssues = getGroupedIssues(entry);
  const sections: CatalogIssueSectionKey[] = ['attention', 'limitations', 'diagnostics'];
  const visibleSections = sections.filter(section => groupedIssues[section].length > 0);

  if (visibleSections.length === 0 && !entry.lastError) return null;

  return (
    <div className="addon-card__issue-sections">
      {visibleSections.map(section => (
        <div key={section} className={`addon-card__issue-section addon-card__issue-section--${section}`}>
          <div className="addon-card__issue-section-title">{getIssueSectionTitle(section, t)}</div>
          {groupedIssues[section].map(issue => (
            <div key={`${section}-${issue.code ?? issue.message}`} className={getIssueClassName(issue)}>
              <AlertTriangle size={13} />
              <span>{getIssueText(issue, t)}</span>
            </div>
          ))}
        </div>
      ))}
      {visibleSections.length === 0 && entry.lastError ? (
        <div className="addon-card__issue-section addon-card__issue-section--attention">
          <div className="addon-card__issue-section-title">{getIssueSectionTitle('attention', t)}</div>
          <div className="addon-card__issue addon-card__issue--error">
            <AlertTriangle size={13} />
            <span>{entry.lastError}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getDuplicateRecommendationText(
  entry: ExtensionCatalogEntry,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (!entry.duplicatePreferredSourceName || !entry.duplicatePreferredVersion || !entry.duplicateRecommendationReason) {
    return null;
  }

  const params = {
    source: entry.duplicatePreferredSourceName,
    version: entry.duplicatePreferredVersion,
  };

  if (entry.duplicateRecommendationReason === 'newest-blocked') {
    return t('addons.catalog.duplicateRecommendation.newestBlocked', params);
  }

  return t('addons.catalog.duplicateRecommendation.newerAvailable', params);
}

function getEmptyStateIcon(kind: ExtensionCatalogEmptyIconKind): ReactElement {
  if (kind === 'addons') return <Puzzle size={48} />;
  if (kind === 'mods') return <Wrench size={48} />;
  if (kind === 'sources') return <Globe size={48} />;
  if (kind === 'themes') return <Palette size={48} />;
  return <Package size={48} />;
}

function createMarkdownPreviewFromCatalogEntry(
  entry: ExtensionCatalogEntry,
  t: (key: string, params?: Record<string, string | number>) => string,
): MarkdownPreviewState | null {
  if (!entry.cardMarkdown) return null;

  return {
    author: entry.manifestAuthor,
    baseUri: entry.resolvedCardUri,
    title: entry.manifestName ?? entry.entryId,
    description: `${entry.sourceName} · ${getCatalogKindLabel(entry.kind, t)}`,
    entry,
    appVersion: entry.compatibility?.appVersion,
    compatible: entry.compatibility?.compatible,
    markdown: entry.cardMarkdown,
    minAppVersion: entry.minAppVersion,
    version: entry.manifestVersion,
  };
}

function formatDuplicateSourceNames(sourceNames: string[], t: (key: string, params?: Record<string, string | number>) => string) {
  if (sourceNames.length <= 3) return sourceNames.join(', ');
  return t('addons.catalog.duplicateSourcesCompact', {
    count: sourceNames.length - 3,
    sources: sourceNames.slice(0, 3).join(', '),
  });
}

function createSourceInputFromForm(form: SourceFormState): ExtensionSourceInput | null {
  if (form.sourceType === 'local') {
    const manifestPath = form.manifestPath.trim();
    if (!manifestPath) return null;
    return { type: 'local', manifestPath };
  }

  if (form.sourceType === 'url') {
    const manifestUrl = form.manifestUrl.trim();
    if (!manifestUrl) return null;
    return { type: 'url', manifestUrl };
  }

  const manifestUrl = form.manifestUrl.trim();
  if (!manifestUrl) return null;

  return {
    type: 'github',
    manifestUrl,
  };
}

/* ── Mod helpers ────────────────────────────────────────── */

function modPermissionLabels(mod: InstalledMod, t: (key: string) => string): string[] {
  const map: Record<string, string> = {
    sections: t('addons.permissions.sections'),
    settings: t('addons.permissions.settings'),
    items: t('addons.permissions.items'),
    achievements: t('addons.permissions.achievements'),
    rules: t('addons.permissions.rules'),
    ui: t('addons.permissions.ui'),
    events: t('addons.permissions.events'),
    words: t('addons.permissions.words'),
    lessons: t('addons.permissions.lessons'),
    i18n: t('addons.permissions.i18n'),
    modes: t('addons.permissions.modes'),
  };
  return (mod.manifest.permissions ?? []).map((p: ModPermission) => map[p] ?? p);
}

function ExtensionCardActions({
  enabled,
  disabled = false,
  disableTitle,
  enableTitle,
  onRemove,
  onToggle,
  removeTitle,
}: {
  enabled: boolean;
  disabled?: boolean;
  disableTitle: string;
  enableTitle: string;
  onRemove: () => void;
  onToggle: () => void;
  removeTitle: string;
}) {
  return (
    <div className="addon-card__actions">
      <button
        className="addon-card__toggle"
        title={disabled ? enableTitle : enabled ? disableTitle : enableTitle}
        disabled={disabled}
        onClick={() => !disabled && onToggle()}
      >
        {enabled && !disabled
          ? <ToggleRight size={28} className="addon-toggle--on" />
          : <ToggleLeft size={28} className="addon-toggle--off" />}
      </button>
      <button
        className="addon-card__remove"
        title={removeTitle}
        onClick={onRemove}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SourceCard({
  onEdit,
  onOpenCard,
  onRemove,
  onSync,
  onToggle,
  source,
  t,
}: {
  onEdit: (source: InstalledExtensionSource) => void;
  onOpenCard: (source: InstalledExtensionSource) => void;
  onRemove: (sourceId: string) => void;
  onSync: (sourceId: string) => void;
  onToggle: (sourceId: string, enabled: boolean) => void;
  source: InstalledExtensionSource;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const manifest = source.syncState.manifest;
  const counts = getSourceCounts(source, t);
  const hasError = source.syncState.status === 'error';
  const sourceStatusClass = source.enabled ? source.syncState.status : 'disabled';
  const sourceErrorMessage = getSourceErrorMessage(source, t);
  const sourceCardWarning = getSourceIssueMessage(source, t);

  return (
    <div className={`addon-card addon-card--source${source.enabled ? '' : ' addon-card--disabled'}${hasError ? ' addon-card--blocked' : ''}`}>
      <div className="addon-card__icon">
        {renderManifestIcon(manifest?.icon, getSourceTypeIcon(source.input.type))}
      </div>
      <div className="addon-card__body">
        <div className="addon-card__source-head">
          <div className="addon-card__header">
            <span className="addon-card__name">{manifest?.name ?? source.id}</span>
            {manifest?.version ? <span className="addon-card__version">v{manifest.version}</span> : null}
            {manifest?.author ? <span className="addon-card__author">{manifest.author}</span> : null}
          </div>
          <button
            className="addon-card__toggle addon-card__toggle--source-head"
            title={source.enabled ? t('addons.actions.disable') : t('addons.actions.enable')}
            onClick={() => onToggle(source.id, !source.enabled)}
          >
            {source.enabled
              ? <ToggleRight size={28} className="addon-toggle--on" />
              : <ToggleLeft size={28} className="addon-toggle--off" />}
          </button>
        </div>
      </div>
      <div className="addon-card__source-actions addon-card__source-actions--full">
        <Button variant="ghost" size="sm" className="addon-card__action-btn" onClick={() => onSync(source.id)}>
          <RefreshCw size={14} />
          <span>{t('addons.sources.actions.sync')}</span>
        </Button>
        <Button variant="ghost" size="sm" className="addon-card__action-btn" onClick={() => onEdit(source)}>
          <Pencil size={14} />
          <span>{t('addons.sources.actions.edit')}</span>
        </Button>
        {source.syncState.sourceCardMarkdown ? (
          <Button variant="ghost" size="sm" className="addon-card__action-btn" onClick={() => onOpenCard(source)}>
            <BookOpen size={14} />
            <span>{t('addons.actions.openCard')}</span>
          </Button>
        ) : null}
        <button
          className="addon-card__remove"
          title={t('addons.actions.remove')}
          onClick={() => onRemove(source.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      <div className="addon-card__source-content">
        <p className="addon-card__desc">
          {manifest?.description ?? t('addons.sources.noDescription')}
        </p>
        <div className="addon-card__source-meta">
          <span>{getSourceTypeLabel(source.input.type, t)}</span>
          <span>{getSourceLocationLabel(source)}</span>
        </div>
        {hasError && sourceErrorMessage ? (
          <div className="addon-card__issue addon-card__issue--error">
            <AlertTriangle size={13} />
            <span>{sourceErrorMessage}</span>
          </div>
        ) : null}
        {!hasError && sourceCardWarning ? (
          <div className="addon-card__issue addon-card__issue--card">
            <AlertTriangle size={13} />
            <span>{sourceCardWarning}</span>
          </div>
        ) : null}
      </div>
      <div className="addon-card__source-footer">
        <div className="addon-card__source-footer-side addon-card__source-footer-side--start">
          <ChipList
            className="addon-card__tags addon-card__tags--footer"
            chips={[
              {
                id: `${source.id}-status`,
                className: `addon-card__tag addon-card__tag--status addon-card__tag--status-${sourceStatusClass}`,
                content: sourceStatusClass === 'ready'
                  ? <RefreshCw size={12} aria-label={getSourceStatusLabel(source, t)} />
                  : getSourceStatusLabel(source, t),
              },
            ]}
          />
        </div>
        <div className="addon-card__source-footer-center">
          {source.syncState.lastSyncAt ? (
            <div className="addon-card__source-sync">
              <span className="addon-card__source-sync-label">{t('addons.sources.lastSync')}</span>
              <span className="addon-card__source-sync-value">
                {new Date(source.syncState.lastSyncAt).toLocaleString()}
              </span>
            </div>
          ) : null}
        </div>
        <div className="addon-card__source-footer-side addon-card__source-footer-side--end">
          {counts.length > 0 ? (
            <ChipList
              className="addon-card__tags addon-card__tags--footer addon-card__tags--counts"
              chips={counts.map((count, index) => ({
                id: `${source.id}-count-${index}`,
                className: 'addon-card__tag',
                content: count,
              }))}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CatalogCard({
  entry,
  onInstall,
  onOpenCard,
  t,
}: {
  entry: ExtensionCatalogEntry;
  onInstall: (entry: ExtensionCatalogEntry) => void;
  onOpenCard: (entry: ExtensionCatalogEntry) => void;
  t: (key: string, params?: TranslationParams) => string;
}) {
  const installAction = buildExtensionCatalogInstallActionViewModel(entry, t);
  const dependencies = entry.dependencies.join(', ');
  const duplicateSources = formatDuplicateSourceNames(entry.duplicateSourceNames, t);
  const permissions = entry.permissions.join(', ');
  const canOpenCard = Boolean(entry.cardMarkdown?.trim());
  const duplicateRecommendation = getDuplicateRecommendationText(entry, t);

  return (
    <div
      className={`addon-card addon-card--catalog${entry.status === 'invalid' || entry.status === 'incompatible' ? ' addon-card--blocked' : ''}${canOpenCard ? ' addon-card--clickable' : ''}`}
      onClick={() => canOpenCard && onOpenCard(entry)}
      onKeyDown={(event) => {
        if (!canOpenCard) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenCard(entry);
        }
      }}
      role={canOpenCard ? 'button' : undefined}
      tabIndex={canOpenCard ? 0 : undefined}
    >
      <div className="addon-card__icon">
        {renderManifestIcon(
          entry.icon,
          entry.kind === 'mods' ? <Wrench size={24} /> : entry.kind === 'themes' ? <Package size={24} /> : <Puzzle size={24} />,
        )}
      </div>
      <div className="addon-card__body">
        <div className="addon-card__source-head">
          <div className="addon-card__header">
            <span className="addon-card__name">{entry.manifestName ?? entry.entryId}</span>
            {entry.manifestVersion ? <span className="addon-card__version">v{entry.manifestVersion}</span> : null}
            {entry.manifestAuthor ? <span className="addon-card__author">{entry.manifestAuthor}</span> : null}
          </div>
          <div className="addon-card__catalog-actions">
            <Button
              variant={installAction.variant}
              size="sm"
              className="addon-card__action-btn"
              disabled={installAction.disabled}
              title={installAction.blockReason}
              onClick={(event) => {
                event.stopPropagation();
                if (installAction.canInstall) onInstall(entry);
              }}
            >
              {installAction.canInstall ? <Download size={14} /> : null}
              <span>{installAction.label}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="addon-card__source-content">
        <p className="addon-card__desc">
          {entry.manifestDescription ?? t('addons.catalog.noDescription')}
        </p>
        <div className="addon-card__source-meta">
          <span>{entry.sourceName}</span>
          <span>{getCatalogKindLabel(entry.kind, t)}</span>
          {entry.resolvedManifestUri ? <span>{entry.resolvedManifestUri}</span> : null}
        </div>
        <ChipList
          className="addon-card__tags"
          chips={[
            {
              id: `${entry.id}-kind`,
              className: 'addon-card__tag',
              content: getCatalogKindLabel(entry.kind, t),
            },
            ...(entry.status === 'available' ? [] : [{
              id: `${entry.id}-status`,
              className: `addon-card__tag addon-card__tag--status addon-card__tag--status-${entry.status}`,
              content: getCatalogStatusLabel(entry, t),
            }]),
            ...(entry.installedVersion ? [{
              id: `${entry.id}-installed-version`,
              className: 'addon-card__tag addon-card__tag--muted',
              content: t('addons.catalog.installedVersion', { version: entry.installedVersion }),
            }] : []),
          ]}
        />
        <CatalogIssueSections entry={entry} t={t} />
        {dependencies ? (
          <div className="addon-card__source-meta addon-card__source-meta--detail">
            <span>{t('addons.catalog.dependencies', { ids: dependencies })}</span>
          </div>
        ) : null}
        {entry.compatibility ? (
          <div className="addon-card__source-meta addon-card__source-meta--detail">
            <span>
              {entry.compatibility.compatible
                ? t('addons.catalog.compatibleWithApp', { version: entry.compatibility.appVersion })
                : t('addons.catalog.incompatibleWithApp', {
                    appVersion: entry.compatibility.appVersion,
                    minVersion: entry.compatibility.minAppVersion ?? entry.minAppVersion ?? '',
                  })}
            </span>
          </div>
        ) : null}
        {duplicateSources ? (
          <div className="addon-card__issue addon-card__issue--dependency">
            <AlertTriangle size={13} />
            <span>{t('addons.catalog.duplicateSources', { sources: duplicateSources })}</span>
          </div>
        ) : null}
        {duplicateRecommendation ? (
          <div className="addon-card__issue addon-card__issue--manual">
            <AlertTriangle size={13} />
            <span>{duplicateRecommendation}</span>
          </div>
        ) : null}
        {permissions ? (
          <div className="addon-card__mod-warn">
            <AlertTriangle size={13} />
            <span>{t('addons.catalog.permissions', { permissions })}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Addon Card ─────────────────────────────────────────── */

function AddonCard({
  addon,
  missingDeps,
  t,
  onToggle,
  onRemove,
}: {
  addon: InstalledAddon;
  missingDeps: string[];
  t: (key: string, params?: Record<string, string | number>) => string;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const m = addon.manifest;
  const tags = resourceTags(addon, t);
  const hasMissing = missingDeps.length > 0;

  return (
    <div className={`addon-card addon-card--addon${addon.enabled ? '' : ' addon-card--disabled'}${hasMissing ? ' addon-card--blocked' : ''}`}>
      <div className="addon-card__icon">
        {renderManifestIcon(m.icon, <Package size={24} />)}
      </div>
      <div className="addon-card__body">
        <div className="addon-card__source-head">
          <div className="addon-card__header">
            <span className="addon-card__name">{m.name}</span>
            <span className="addon-card__version">v{m.version}</span>
            {m.author && <span className="addon-card__author">{m.author}</span>}
          </div>
          <button
            className="addon-card__toggle addon-card__toggle--source-head"
            title={hasMissing ? t('addons.actions.installDependencies') : addon.enabled ? t('addons.actions.disable') : t('addons.actions.enable')}
            disabled={hasMissing}
            onClick={() => !hasMissing && onToggle(addon.id, !addon.enabled)}
          >
            {addon.enabled && !hasMissing
              ? <ToggleRight size={28} className="addon-toggle--on" />
              : <ToggleLeft size={28} className="addon-toggle--off" />}
          </button>
        </div>
      </div>
      <div className="addon-card__source-actions addon-card__source-actions--full">
        <Button variant="ghost" size="sm" className="addon-card__action-btn" onClick={() => onRemove(addon.id)}>
          <Trash2 size={14} />
          <span>{t('addons.actions.remove')}</span>
        </Button>
      </div>
      <div className="addon-card__source-content">
        {m.description && (
          <p className="addon-card__desc">{m.description}</p>
        )}
        {tags.length > 0 && (
          <ChipList
            className="addon-card__tags"
            chips={tags.map((tag) => ({
              id: tag,
              className: 'addon-card__tag',
              content: tag,
            }))}
          />
        )}
        {hasMissing && (
          <div className="addon-card__deps-warn">
            <Link2Off size={13} />
            <span>{t('addons.missingDependencies', { ids: missingDeps.join(', ') })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mod Card ───────────────────────────────────────────── */

function ModCard({
  mod,
  missingDeps,
  t,
  onToggle,
  onRemove,
}: {
  mod: InstalledMod;
  missingDeps: string[];
  t: (key: string, params?: Record<string, string | number>) => string;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const m = mod.manifest;
  const perms = modPermissionLabels(mod, t);
  const hasMissing = missingDeps.length > 0;

  return (
    <div className={`addon-card${mod.enabled ? '' : ' addon-card--disabled'}${hasMissing ? ' addon-card--blocked' : ''}`}>
      <div className="addon-card__icon">
        {renderManifestIcon(m.icon, <Wrench size={24} />)}
      </div>
      <div className="addon-card__body">
        <div className="addon-card__header">
          <span className="addon-card__name">{m.name}</span>
          <span className="addon-card__version">v{m.version}</span>
          {m.author && <span className="addon-card__author">{m.author}</span>}
        </div>
        {m.description && (
          <p className="addon-card__desc">{m.description}</p>
        )}
        {perms.length > 0 && (
          <ChipList
            className="addon-card__tags"
            chips={perms.map((permission) => ({
              id: permission,
              className: 'addon-card__tag addon-card__tag--perm',
              content: permission,
            }))}
          />
        )}
        {hasMissing && (
          <div className="addon-card__deps-warn">
            <Link2Off size={13} />
            <span>{t('addons.missingDependencies', { ids: missingDeps.join(', ') })}</span>
          </div>
        )}
        <div className="addon-card__mod-warn">
          <AlertTriangle size={13} />
          <span>{t('addons.modExecWarning', { entry: m.entry })} <code>{m.entry}</code></span>
        </div>
      </div>
      <ExtensionCardActions
        enabled={mod.enabled}
        disabled={hasMissing}
        disableTitle={t('addons.actions.disable')}
        enableTitle={t(hasMissing ? 'addons.actions.installDependencies' : 'addons.actions.enable')}
        onToggle={() => onToggle(mod.id, !mod.enabled)}
        onRemove={() => onRemove(mod.id)}
        removeTitle={t('addons.actions.remove')}
      />
    </div>
  );
}

function ThemeCard({
  currentThemeId,
  onApply,
  onRemove,
  t,
  theme,
}: {
  currentThemeId: string;
  onApply: (themeId: string) => void;
  onRemove: (themeId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  theme: InstalledTheme;
}) {
  const manifest = theme.manifest;
  const isCurrent = currentThemeId === theme.id;

  return (
    <div className="addon-card addon-card--addon">
      <div className="addon-card__icon">
        {renderManifestIcon(manifest.icon, <Palette size={24} />)}
      </div>
      <div className="addon-card__body">
        <div className="addon-card__source-head">
          <div className="addon-card__header">
            <span className="addon-card__name">{manifest.name}</span>
            <span className="addon-card__version">v{manifest.version}</span>
            {manifest.author ? <span className="addon-card__author">{manifest.author}</span> : null}
          </div>
        </div>
      </div>
      <div className="addon-card__source-actions addon-card__source-actions--full">
        <Button
          variant={isCurrent ? 'secondary' : 'accent'}
          size="sm"
          className="addon-card__action-btn"
          disabled={isCurrent}
          onClick={() => !isCurrent && onApply(theme.id)}
        >
          <Palette size={14} />
          <span>{isCurrent ? t('addons.themes.current') : t('addons.actions.applyTheme')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="addon-card__action-btn"
          onClick={() => onRemove(theme.id)}
        >
          <Trash2 size={14} />
          <span>{t('addons.actions.remove')}</span>
        </Button>
      </div>
      <div className="addon-card__source-content">
        {manifest.description ? <p className="addon-card__desc">{manifest.description}</p> : null}
        <div className="addon-card__source-meta">
          <span>{theme.id}</span>
          <span>{t('addons.catalog.kinds.themes')}</span>
          <span>{t('addons.themes.installedAt', { date: new Date(theme.installedAt).toLocaleString() })}</span>
        </div>
        <ChipList
          className="addon-card__tags"
          chips={[
            {
              id: `${theme.id}-kind`,
              className: 'addon-card__tag',
              content: t('addons.catalog.kinds.themes'),
            },
            ...(isCurrent ? [{
              id: `${theme.id}-current`,
              className: 'addon-card__tag addon-card__tag--status addon-card__tag--status-installed',
              content: t('addons.themes.current'),
            }] : []),
          ]}
        />
      </div>
    </div>
  );
}

function SourceForm({
  form,
  onChange,
  onPickManifest,
  onSubmit,
  onCancel,
  t,
}: {
  form: SourceFormState;
  onChange: (patch: Partial<SourceFormState>) => void;
  onPickManifest: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="addons-source-form">
      <div className="addons-source-form__header">
        <h3>{t(form.mode === 'edit' ? 'addons.sources.form.editTitle' : 'addons.sources.form.createTitle')}</h3>
      </div>
      <div className="addons-source-form__grid">
        <label className="addons-source-form__field">
          <span>{t('addons.sources.form.type')}</span>
          <SelectInput
            value={form.sourceType}
            onChange={(event) => {
              const sourceType = event.target.value;
              if (isExtensionSourceType(sourceType)) onChange({ sourceType });
            }}
          >
            {getSourceTypeOptions(t).map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectInput>
        </label>

        {form.sourceType === 'local' ? (
          <label className="addons-source-form__field addons-source-form__field--wide">
            <span>{t('addons.sources.form.manifestPath')}</span>
            <div className="addons-source-form__file-row">
              <TextInput
                value={form.manifestPath}
                onChange={(event) => onChange({ manifestPath: event.target.value })}
                placeholder={t('addons.sources.form.manifestPathPlaceholder')}
              />
              <Button size="sm" variant="secondary" onClick={onPickManifest}>
                <FolderOpen size={14} />
                <span>{t('addons.sources.form.chooseFile')}</span>
              </Button>
            </div>
          </label>
        ) : null}

        {form.sourceType === 'url' ? (
          <label className="addons-source-form__field addons-source-form__field--wide">
            <span>{t('addons.sources.form.manifestUrl')}</span>
            <TextInput
              value={form.manifestUrl}
              onChange={(event) => onChange({ manifestUrl: event.target.value })}
              placeholder={t('addons.sources.form.manifestUrlPlaceholder')}
            />
          </label>
        ) : null}

        {form.sourceType === 'github' ? (
          <label className="addons-source-form__field addons-source-form__field--wide">
            <span>{t('addons.sources.form.githubUrl')}</span>
            <TextInput
              value={form.manifestUrl}
              onChange={(event) => onChange({ manifestUrl: event.target.value })}
              placeholder={t('addons.sources.form.githubUrlPlaceholder')}
            />
          </label>
        ) : null}
      </div>

      <div className="addons-source-form__actions">
        <Button variant="accent" size="sm" onClick={onSubmit}>
          <Upload size={14} />
          <span>{t(form.mode === 'edit' ? 'addons.sources.actions.save' : 'addons.sources.actions.add')}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export function AddonsPage() {
  const { t } = useI18n();
  const {
    extensionSources,
    extensionCatalogEntries,
    installExtensionSource,
    installExtensionCatalogEntry,
    updateExtensionSource,
    removeExtensionSource,
    toggleExtensionSource,
    syncExtensionSource,
    installedAddons,
    installAddon,
    removeAddon,
    toggleAddon,
    installedMods,
    installMod,
    removeMod,
    toggleMod,
    installedThemes,
    installTheme,
    removeTheme,
  } = useAppExtensions();
  const {
    settings,
    applyTheme,
    saveSetting,
  } = useAppSettings();
  const [activeView, setActiveView] = useState<AddonsView>('catalog');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [installedFilter, setInstalledFilter] = useState<InstalledFilter>('all');
  const [installedAddonFilter, setInstalledAddonFilter] = useState<'all' | AddonContentKind>('all');
  const [search, setSearch] = useState('');
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(getInitialSourceFormState);
  const [markdownPreview, setMarkdownPreview] = useState<MarkdownPreviewState | null>(null);

  const filteredSources = useMemo(
    () => filterExtensionSources(extensionSources, search),
    [extensionSources, search],
  );
  const filteredCatalogEntries = useMemo(
    () => filterExtensionCatalogEntries({
      entries: extensionCatalogEntries,
      filter: catalogFilter,
      search,
    }),
    [catalogFilter, extensionCatalogEntries, search],
  );
  const attentionCatalogCount = useMemo(
    () => countAttentionCatalogEntries(extensionCatalogEntries),
    [extensionCatalogEntries],
  );

  const availableInstalledAddonFilters = useMemo(
    () => getAvailableInstalledAddonContentKinds(installedAddons, search),
    [installedAddons, search],
  );

  const filteredAddons = useMemo(
    () => filterInstalledAddons({
      addons: installedAddons,
      contentFilter: installedAddonFilter,
      search,
    }),
    [installedAddonFilter, installedAddons, search],
  );

  const filteredMods = useMemo(
    () => filterInstalledMods(installedMods, search),
    [installedMods, search],
  );

  const filteredThemes = useMemo(
    () => filterInstalledThemes(installedThemes, search),
    [installedThemes, search],
  );

  useEffect(() => {
    setMarkdownPreview((current) => {
      if (!current?.entry) return current;
      const freshEntry = extensionCatalogEntries.find(entry => entry.id === current.entry?.id);
      if (!freshEntry || freshEntry === current.entry) return current;
      return createMarkdownPreviewFromCatalogEntry(freshEntry, t) ?? current;
    });
  }, [extensionCatalogEntries, t]);

  const enabledModIds = useMemo(
    () => new Set(installedMods.filter(m => m.enabled).map(m => m.id)),
    [installedMods],
  );

  const getMissingDeps = (deps: string[] | undefined): string[] => {
    if (!deps || deps.length === 0) return [];
    return deps.filter(d => !enabledModIds.has(d));
  };

  const resetSourceForm = () => {
    setSourceForm(getInitialSourceFormState());
    setSourceFormOpen(false);
  };

  const handleCloseSourcesModal = () => {
    resetSourceForm();
    setSourcesModalOpen(false);
  };

  const handleOpenSourcesModal = () => {
    setSourcesModalOpen(true);
  };

  const handleOpenCreateSource = () => {
    setSourceForm(getInitialSourceFormState());
    setSourcesModalOpen(true);
    setSourceFormOpen(true);
  };

  const handleEditSource = (source: InstalledExtensionSource) => {
    if (source.input.type === 'local') {
      setSourceForm({
        ...getInitialSourceFormState(),
        mode: 'edit',
        sourceId: source.id,
        sourceType: 'local',
        manifestPath: source.input.manifestPath,
      });
    } else if (source.input.type === 'url') {
      setSourceForm({
        ...getInitialSourceFormState(),
        mode: 'edit',
        sourceId: source.id,
        sourceType: 'url',
        manifestUrl: source.input.manifestUrl,
      });
    } else {
      setSourceForm({
        ...getInitialSourceFormState(),
        mode: 'edit',
        sourceId: source.id,
        sourceType: 'github',
        manifestUrl: source.input.manifestUrl ?? source.syncState.resolvedManifestUri ?? '',
      });
    }
    setSourcesModalOpen(true);
    setSourceFormOpen(true);
  };

  const handlePickLocalManifest = async () => {
    const imported = await window.api.importFile({
      title: t('addons.sources.form.pickManifestTitle'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!imported) return;
    setSourceForm(prev => ({ ...prev, manifestPath: imported.path }));
  };

  const handleSubmitSource = async () => {
    const input = createSourceInputFromForm(sourceForm);
    if (!input) {
      alert(t('addons.sources.form.invalid'));
      return;
    }

    const result = sourceForm.mode === 'edit' && sourceForm.sourceId
      ? await updateExtensionSource(sourceForm.sourceId, input)
      : await installExtensionSource(input);

    if (!result.ok) {
      alert(result.error ?? t('addons.sources.syncErrorFallback'));
      return;
    }

    resetSourceForm();
  };

  const handleSyncSource = async (sourceId: string) => {
    const result = await syncExtensionSource(sourceId);
    if (!result.ok && result.error) alert(result.error);
  };

  const handleRemoveSource = async (sourceId: string) => {
    const name = extensionSources.find(source => source.id === sourceId)?.syncState.manifest?.name ?? sourceId;
    if (!confirm(t('addons.sources.confirmRemove', { name }))) return;
    await removeExtensionSource(sourceId);
  };

  const handleInstallCatalogEntry = async (entry: ExtensionCatalogEntry) => {
    if (!canInstallExtensionCatalogEntry(entry)) return;

    const result = await installExtensionCatalogEntry(entry.sourceId, entry.kind, entry.entryId);
    if (!result.ok && result.error) {
      alert(result.error);
    }
    return result.ok;
  };

  const handleInstallAddon = async () => {
    const result = await installAddon();
    if (!result.ok && result.error) alert(t('addons.installError.addon', { error: result.error }));
  };

  const handleInstallMod = async () => {
    const result = await installMod();
    if (!result.ok && result.error) alert(t('addons.installError.mod', { error: result.error }));
  };

  const handleInstallTheme = async () => {
    const result = await installTheme();
    if (!result.ok && result.error) alert(t('addons.installError.theme', { error: result.error }));
  };

  const handleOpenSourceCard = (source: InstalledExtensionSource) => {
    const manifest = source.syncState.manifest;
    const markdown = source.syncState.sourceCardMarkdown;
    if (!markdown) return;

    setMarkdownPreview({
      author: manifest?.author,
      baseUri: source.syncState.sourceCardUri,
      title: manifest?.name ?? source.id,
      description: getSourceTypeLabel(source.input.type, t),
      markdown,
      version: manifest?.version,
    });
  };

  const handleOpenCatalogCard = (entry: ExtensionCatalogEntry) => {
    const nextPreview = createMarkdownPreviewFromCatalogEntry(entry, t);
    if (nextPreview) setMarkdownPreview(nextPreview);
  };

  const handleRemoveAddon = async (id: string) => {
    const name = installedAddons.find(a => a.id === id)?.manifest.name ?? id;
    if (!confirm(t('addons.confirmRemoveAddon', { name }))) return;
    await removeAddon(id);
  };

  const handleRemoveMod = async (id: string) => {
    const name = installedMods.find(m => m.id === id)?.manifest.name ?? id;
    if (!confirm(t('addons.confirmRemoveMod', { name }))) return;
    await removeMod(id);
  };

  const handleRemoveTheme = async (themeId: string) => {
    const name = installedThemes.find(theme => theme.id === themeId)?.manifest.name ?? themeId;
    if (!confirm(t('addons.confirmRemoveTheme', { name }))) return;
    await removeTheme(themeId);
  };

  const handleApplyTheme = (themeId: string) => {
    saveSetting('theme', themeId);
    applyTheme(themeId);
  };

  const hasInstalledContent = installedAddons.length > 0 || installedMods.length > 0 || installedThemes.length > 0;
  const showInstalledAddons = installedFilter === 'all' || installedFilter === 'addons';
  const showInstalledMods = installedFilter === 'all' || installedFilter === 'mods';
  const showInstalledThemes = installedFilter === 'all' || installedFilter === 'themes';
  const catalogEmptyState = buildExtensionCatalogEmptyStateViewModel({
    search,
    view: 'catalog',
  }, t);
  const installedEmptyState = buildExtensionCatalogEmptyStateViewModel({
    filter: installedFilter,
    hasInstalledContent,
    search,
    view: 'installed',
  }, t);
  const sourcesEmptyState = buildExtensionCatalogEmptyStateViewModel({
    search,
    view: 'sources',
  }, t);

  return (
    <section className="mode-panel active addons-page">
      <PageHeader title={t('addons.title')} />

      <div className="addons-toolbar">
        <div className="addons-tabs">
          <CountTabButton
            className="addons-tab"
            activeClassName="addons-tab--active"
            countClassName="addons-tab__count"
            active={activeView === 'catalog'}
            count={extensionCatalogEntries.length}
            icon={<Globe size={16} />}
            onClick={() => setActiveView('catalog')}
          >
            {t('addons.views.catalog')}
          </CountTabButton>
          <CountTabButton
            className="addons-tab"
            activeClassName="addons-tab--active"
            countClassName="addons-tab__count"
            active={activeView === 'installed'}
            count={installedAddons.length + installedMods.length + installedThemes.length}
            icon={<Package size={16} />}
            onClick={() => setActiveView('installed')}
          >
            {t('addons.views.installed')}
          </CountTabButton>
        </div>
        <div className="addons-toolbar__right">
          <TextInput
            className="addons-search"
            placeholder={t('addons.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {activeView === 'catalog' ? (
            <Button variant="accent" size="sm" onClick={handleOpenSourcesModal}>
              <Globe size={14} />
              <span>{t('addons.tabs.sources')}</span>
            </Button>
          ) : (
            <>
              <Button variant="accent" size="sm" onClick={handleInstallAddon}>
                <Upload size={14} />
                <span>{t('addons.actions.installAddon')}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleInstallMod}>
                <Upload size={14} />
                <span>{t('addons.actions.installMod')}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleInstallTheme}>
                <Upload size={14} />
                <span>{t('addons.catalog.actions.installTheme')}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {activeView === 'catalog' && (
        <>
          <div className="addons-catalog-section">
            <div className="addons-catalog-section__header">
              <div>
                <h2>{t('addons.catalog.title')}</h2>
              </div>
              <div className="addons-catalog-section__filters">
                {(['all', 'attention', 'addons', 'mods', 'themes'] as const).map((kind) => (
                  <Button
                    key={kind}
                    variant={catalogFilter === kind ? 'accent' : 'ghost'}
                    size="sm"
                    onClick={() => setCatalogFilter(kind)}
                  >
                    {kind === 'all'
                      ? t('addons.catalog.filters.all')
                      : kind === 'attention'
                        ? t('addons.catalog.filters.attention', { count: attentionCatalogCount })
                        : getCatalogKindLabel(kind, t)}
                  </Button>
                ))}
              </div>
            </div>
            {filteredCatalogEntries.length === 0 ? (
              <EmptyStatePanel
                icon={getEmptyStateIcon(catalogEmptyState.iconKind)}
                title={catalogEmptyState.title}
                subtitle={catalogEmptyState.subtitle}
              />
            ) : (
              <div className="addons-grid">
                {filteredCatalogEntries.map((entry) => (
                  <CatalogCard
                    key={entry.id}
                    entry={entry}
                    onInstall={handleInstallCatalogEntry}
                    onOpenCard={handleOpenCatalogCard}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeView === 'installed' && (
        <>
          <div className="addons-catalog-section">
            <div className="addons-catalog-section__header">
              <div>
                <h2>{t('addons.views.installed')}</h2>
              </div>
              <div className="addons-catalog-section__filters">
                {(['all', 'addons', 'mods', 'themes'] as const).map((kind) => (
                  <Button
                    key={kind}
                    variant={installedFilter === kind ? 'accent' : 'ghost'}
                    size="sm"
                    onClick={() => setInstalledFilter(kind)}
                  >
                    {t(`addons.installed.filters.${kind}`)}
                  </Button>
                ))}
              </div>
            </div>
            {showInstalledAddons && availableInstalledAddonFilters.length > 0 ? (
              <div className="addons-catalog-section__filters addons-catalog-section__filters--secondary">
                <Button
                  variant={installedAddonFilter === 'all' ? 'accent' : 'ghost'}
                  size="sm"
                  onClick={() => setInstalledAddonFilter('all')}
                >
                  {t('addons.installed.contentFilters.all')}
                </Button>
                {availableInstalledAddonFilters.map((kind) => (
                  <Button
                    key={kind}
                    variant={installedAddonFilter === kind ? 'accent' : 'ghost'}
                    size="sm"
                    onClick={() => setInstalledAddonFilter(kind)}
                  >
                    {getAddonContentKindLabel(kind, t)}
                  </Button>
                ))}
              </div>
            ) : null}

            {!hasInstalledContent ? (
              <EmptyStatePanel
                icon={getEmptyStateIcon(installedEmptyState.iconKind)}
                title={installedEmptyState.title}
                subtitle={installedEmptyState.subtitle}
              />
            ) : null}

            {hasInstalledContent && showInstalledAddons ? (
              filteredAddons.length > 0 ? (
                <div className="addons-catalog-section addons-catalog-section--nested">
                  <div className="addons-catalog-section__header">
                    <div>
                      <h2>{t('addons.tabs.addons')}</h2>
                    </div>
                  </div>
                  <div className="addons-grid">
                    {filteredAddons.map(a => (
                      <AddonCard
                        key={a.id}
                        addon={a}
                        missingDeps={getMissingDeps(a.manifest.dependencies)}
                        t={t}
                        onToggle={(id, en) => toggleAddon(id, en)}
                        onRemove={handleRemoveAddon}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                installedFilter === 'addons' ? (
                  <EmptyStatePanel
                    icon={getEmptyStateIcon(installedEmptyState.iconKind)}
                    title={installedEmptyState.title}
                    subtitle={installedEmptyState.subtitle}
                  />
                ) : null
              )
            ) : null}

            {hasInstalledContent && showInstalledMods ? (
              filteredMods.length > 0 ? (
                <div className="addons-catalog-section addons-catalog-section--nested">
                  <div className="addons-catalog-section__header">
                    <div>
                      <h2>{t('addons.tabs.mods')}</h2>
                    </div>
                  </div>
                  <div className="addons-grid">
                    {filteredMods.map(m => (
                      <ModCard
                        key={m.id}
                        mod={m}
                        missingDeps={getMissingDeps(m.manifest.dependencies)}
                        t={t}
                        onToggle={(id, en) => toggleMod(id, en)}
                        onRemove={handleRemoveMod}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                installedFilter === 'mods' ? (
                  <EmptyStatePanel
                    icon={getEmptyStateIcon(installedEmptyState.iconKind)}
                    title={installedEmptyState.title}
                    subtitle={installedEmptyState.subtitle}
                  />
                ) : null
              )
            ) : null}

            {hasInstalledContent && showInstalledThemes ? (
              filteredThemes.length > 0 ? (
                <div className="addons-catalog-section addons-catalog-section--nested">
                  <div className="addons-catalog-section__header">
                    <div>
                      <h2>{t('addons.catalog.kinds.themes')}</h2>
                    </div>
                  </div>
                  <div className="addons-grid">
                    {filteredThemes.map(theme => (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        currentThemeId={settings.theme}
                        t={t}
                        onApply={handleApplyTheme}
                        onRemove={handleRemoveTheme}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                installedFilter === 'themes' ? (
                  <EmptyStatePanel
                    icon={getEmptyStateIcon(installedEmptyState.iconKind)}
                    title={installedEmptyState.title}
                    subtitle={installedEmptyState.subtitle}
                  />
                ) : null
              )
            ) : null}

            {hasInstalledContent && installedFilter === 'all' && filteredAddons.length === 0 && filteredMods.length === 0 && filteredThemes.length === 0 ? (
              <EmptyStatePanel
                icon={getEmptyStateIcon(installedEmptyState.iconKind)}
                title={installedEmptyState.title}
                subtitle={installedEmptyState.subtitle}
              />
            ) : null}
          </div>
        </>
      )}

      {sourcesModalOpen ? (
        <ModalLayout
          className="addons-sources-modal"
          bodyClassName="addons-sources-modal__body"
          description={t('addons.sources.hint')}
          footer={(
            <div className="modal-actions">
              <Button onClick={handleCloseSourcesModal}>
                {t('common.close')}
              </Button>
            </div>
          )}
          onClose={handleCloseSourcesModal}
          scrollBody
          size="wide"
          title={t('addons.tabs.sources')}
        >
          <div className="addons-sources-modal__toolbar">
            {!sourceFormOpen ? (
              <Button variant="accent" size="sm" onClick={handleOpenCreateSource}>
                <Upload size={14} />
                <span>{t('addons.sources.actions.add')}</span>
              </Button>
            ) : null}
          </div>
          {sourceFormOpen ? (
            <SourceForm
              form={sourceForm}
              onChange={(patch) => setSourceForm(prev => ({ ...prev, ...patch }))}
              onPickManifest={handlePickLocalManifest}
              onSubmit={handleSubmitSource}
              onCancel={resetSourceForm}
              t={t}
            />
          ) : null}
          {filteredSources.length === 0 ? (
            <EmptyStatePanel
              icon={getEmptyStateIcon(sourcesEmptyState.iconKind)}
              title={sourcesEmptyState.title}
              subtitle={sourcesEmptyState.subtitle}
            />
          ) : (
            <div className="addons-grid">
              {filteredSources.map(source => (
                <SourceCard
                  key={source.id}
                  source={source}
                  t={t}
                  onEdit={handleEditSource}
                  onOpenCard={handleOpenSourceCard}
                  onRemove={handleRemoveSource}
                  onSync={handleSyncSource}
                  onToggle={toggleExtensionSource}
                />
              ))}
            </div>
          )}
        </ModalLayout>
      ) : null}

      {markdownPreview ? (() => {
        const previewInstallAction = markdownPreview.entry
          ? buildExtensionCatalogInstallActionViewModel(markdownPreview.entry, t)
          : null;
        return (
        <ModalLayout
          className="addons-markdown-modal"
          bodyClassName="addons-markdown-modal__body"
          description={markdownPreview.description}
          footer={(
            <div className="modal-actions">
              {markdownPreview.entry && previewInstallAction ? (
                <Button
                  variant={previewInstallAction.variant}
                  disabled={previewInstallAction.disabled}
                  title={previewInstallAction.blockReason}
                  onClick={async () => {
                    if (!markdownPreview.entry) return;
                    if (!previewInstallAction.canInstall) return;
                    const ok = await handleInstallCatalogEntry(markdownPreview.entry);
                    if (ok) {
                      setMarkdownPreview((current) => {
                        if (!current?.entry) return current;
                        return {
                          ...current,
                          entry: {
                            ...current.entry,
                            installedVersion: current.entry.manifestVersion,
                            status: 'installed',
                          },
                        };
                      });
                    }
                  }}
                >
                  {previewInstallAction.canInstall ? <Download size={14} /> : null}
                  <span>{previewInstallAction.label}</span>
                </Button>
              ) : null}
              <Button onClick={() => setMarkdownPreview(null)}>
                {t('common.close')}
              </Button>
            </div>
          )}
          onClose={() => setMarkdownPreview(null)}
          scrollBody
          size="lg"
          title={markdownPreview.title}
        >
          {(markdownPreview.author || markdownPreview.version || markdownPreview.minAppVersion || markdownPreview.appVersion) ? (
            <div className="addons-markdown-modal__meta">
              {markdownPreview.author ? (
                <span className="addons-markdown-modal__meta-item">
                  {t('addons.markdown.author', { author: markdownPreview.author })}
                </span>
              ) : null}
              {markdownPreview.version ? (
                <span className="addons-markdown-modal__meta-item">
                  {t('addons.markdown.version', { version: markdownPreview.version })}
                </span>
              ) : null}
              {markdownPreview.minAppVersion ? (
                <span className="addons-markdown-modal__meta-item">
                  {t('addons.markdown.minAppVersion', { version: markdownPreview.minAppVersion })}
                </span>
              ) : null}
              {markdownPreview.appVersion && typeof markdownPreview.compatible === 'boolean' ? (
                <span className="addons-markdown-modal__meta-item">
                  {markdownPreview.compatible
                    ? t('addons.catalog.compatibleWithApp', { version: markdownPreview.appVersion })
                    : t('addons.catalog.incompatibleWithApp', {
                        appVersion: markdownPreview.appVersion,
                        minVersion: markdownPreview.minAppVersion ?? '',
                      })}
                </span>
              ) : null}
            </div>
          ) : null}
          {markdownPreview.entry ? (
            <div className="addons-markdown-modal__issues">
              <CatalogIssueSections entry={markdownPreview.entry} t={t} />
            </div>
          ) : null}
          <SafeMarkdown
            baseUri={markdownPreview.baseUri}
            className="addon-card__markdown addons-markdown-modal__content"
            markdown={markdownPreview.markdown}
          />
        </ModalLayout>
        );
      })() : null}
    </section>
  );
}
