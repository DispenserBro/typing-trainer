import type {
  ExtensionCatalogEntry,
  ExtensionCatalogKind,
  TranslationParams,
} from '../../shared/types';
import {
  canInstallExtensionCatalogEntry,
  getExtensionCatalogEntryBlockReason,
} from '../../shared/types/extensionSource';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type ExtensionCatalogActionButtonViewModel = {
  blockReason?: string;
  canInstall: boolean;
  disabled: boolean;
  label: string;
  variant: 'accent' | 'secondary';
};

export type ExtensionCatalogEmptyIconKind =
  | 'addons'
  | 'catalog'
  | 'mods'
  | 'sources'
  | 'themes';

export type ExtensionCatalogEmptyStateViewModel = {
  iconKind: ExtensionCatalogEmptyIconKind;
  subtitle?: string;
  title: string;
};

export type ExtensionCatalogEmptyContext =
  | {
      search: string;
      view: 'catalog';
    }
  | {
      filter: 'all' | 'addons' | 'mods' | 'themes';
      hasInstalledContent: boolean;
      search: string;
      view: 'installed';
    }
  | {
      search: string;
      view: 'sources';
    };

export function buildExtensionCatalogInstallActionViewModel(
  entry: ExtensionCatalogEntry,
  translate: TranslateFn,
): ExtensionCatalogActionButtonViewModel {
  const canInstall = canInstallExtensionCatalogEntry(entry);
  const manualOnly = entry.installSupport !== 'direct';
  const blockReason = getExtensionCatalogEntryBlockReason(entry);

  return {
    ...(blockReason ? { blockReason } : {}),
    canInstall,
    disabled: !canInstall,
    label: getExtensionCatalogInstallLabel(entry, translate),
    variant: canInstall ? 'accent' : 'secondary',
    ...(manualOnly && !canInstall ? { label: translate('addons.catalog.actions.manualOnly') } : {}),
  };
}

export function buildExtensionCatalogEmptyStateViewModel(
  context: ExtensionCatalogEmptyContext,
  translate: TranslateFn,
): ExtensionCatalogEmptyStateViewModel {
  const hasSearch = context.search.trim().length > 0;
  if (hasSearch) {
    return {
      iconKind: context.view === 'sources' ? 'sources' : 'catalog',
      title: translate('addons.empty.search'),
    };
  }

  if (context.view === 'catalog') {
    return {
      iconKind: 'catalog',
      subtitle: translate('addons.catalog.emptySubtitle'),
      title: translate('addons.catalog.emptyTitle'),
    };
  }

  if (context.view === 'sources') {
    return {
      iconKind: 'sources',
      title: translate('addons.empty.sourcesTitle'),
    };
  }

  if (!context.hasInstalledContent || context.filter === 'all') {
    return {
      iconKind: 'catalog',
      subtitle: translate('addons.empty.installedSubtitle'),
      title: translate('addons.empty.installedTitle'),
    };
  }

  return {
    iconKind: context.filter,
    subtitle: translate(`addons.empty.${context.filter}Subtitle`),
    title: translate(`addons.empty.${context.filter}Title`),
  };
}

function getExtensionCatalogInstallLabel(entry: ExtensionCatalogEntry, translate: TranslateFn) {
  if (entry.status === 'installed') return translate('addons.catalog.actions.installed');
  if (entry.status === 'update-available') return translate('addons.catalog.actions.update');
  if (entry.kind === 'mods') return translate('addons.catalog.actions.installMod');
  if (entry.kind === 'themes') return translate('addons.catalog.actions.installTheme');
  return translate('addons.catalog.actions.installAddon');
}
