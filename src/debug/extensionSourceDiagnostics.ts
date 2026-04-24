import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installExtensionCatalogEntry,
  installExtensionSource,
  scanAddons,
  scanExtensionCatalog,
  scanMods,
  scanThemes,
} from '../core/addons';
import type { ExtensionCatalogEntry, ExtensionCatalogInstallResult } from '../shared/types';

export type ExtensionSourceDiagnosticsReport = {
  addonCatalogStatusAfter?: string;
  addonCatalogStatusBefore?: string;
  addonInstalled: boolean;
  addonInstallResult: ExtensionCatalogInstallResult;
  addonInstallSupportBefore?: string;
  addonPresentInRegistry: boolean;
  catalogEntriesAfter: number;
  catalogEntriesBefore: number;
  modCatalogStatusAfter?: string;
  modCatalogStatusBefore?: string;
  modInstalled: boolean;
  modInstallResult: ExtensionCatalogInstallResult;
  modInstallSupportBefore?: string;
  modPresentInRegistry: boolean;
  themeCatalogStatusAfter?: string;
  themeCatalogStatusBefore?: string;
  themeInstalled: boolean;
  themeInstallResult: ExtensionCatalogInstallResult;
  themeInstallSupportBefore?: string;
  themePresentInRegistry: boolean;
  sourceId?: string;
  sourceInstallError?: string;
  sourceInstallOk: boolean;
  warnings: string[];
};

type FixturePaths = {
  addonId: string;
  addonManifestPath: string;
  addonSourceEntryId: string;
  addonsDir: string;
  appDataDir: string;
  modId: string;
  modManifestPath: string;
  modSourceEntryId: string;
  modsDir: string;
  sourceManifestPath: string;
  themeId: string;
  themeManifestPath: string;
  themeSourceEntryId: string;
  themesDir: string;
};

function createFixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'typing-trainer-extension-source-'));
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function writeText(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function createLocalFixture(rootDir: string): FixturePaths {
  const appDataDir = path.join(rootDir, 'app-data');
  const addonsDir = path.join(appDataDir, 'addons');
  const modsDir = path.join(appDataDir, 'mods');
  const themesDir = path.join(appDataDir, 'themes');
  const sourceRoot = path.join(rootDir, 'source');
  const addonSourceEntryId = 'sample-addon';
  const modSourceEntryId = 'sample-mod';
  const themeSourceEntryId = 'sample-theme';
  const addonId = 'fixture-addon';
  const modId = 'fixture-mod';
  const themeId = 'fixture-theme';

  writeJson(path.join(sourceRoot, 'addons.json'), [addonSourceEntryId]);
  writeJson(path.join(sourceRoot, 'mods.json'), [modSourceEntryId]);
  writeJson(path.join(sourceRoot, 'themes.json'), [themeSourceEntryId]);
  writeText(path.join(sourceRoot, 'source-card.md'), '# Fixture source\n\nLocal diagnostic source.');

  const sourceManifestPath = path.join(sourceRoot, 'manifest.json');
  writeJson(sourceManifestPath, {
    manifestVersion: 1,
    id: 'fixture-source',
    name: 'Fixture source',
    version: '1.0.0',
    type: 'extension-source',
    lists: {
      addons: 'addons.json',
      mods: 'mods.json',
      themes: 'themes.json',
    },
    cards: {
      source: 'source-card.md',
    },
  });

  const addonManifestPath = path.join(sourceRoot, addonSourceEntryId, 'manifest.json');
  writeJson(addonManifestPath, {
    manifestVersion: 1,
    id: addonId,
    name: 'Fixture addon',
    version: '1.0.0',
    type: 'content',
    description: 'Diagnostic content addon.',
    resources: {
      words: [{ lang: 'en', words: ['fixture', 'catalog', 'addon'] }],
    },
  });

  const modManifestPath = path.join(sourceRoot, modSourceEntryId, 'manifest.json');
  writeJson(modManifestPath, {
    manifestVersion: 1,
    id: modId,
    name: 'Fixture mod',
    version: '1.0.0',
    type: 'mod',
    description: 'Diagnostic mod package.',
    entry: 'index.js',
    files: ['index.js', 'locales/de.json'],
    permissions: ['ui', 'i18n'],
  });
  writeText(path.join(sourceRoot, modSourceEntryId, 'index.js'), 'module.exports = {};');
  writeJson(path.join(sourceRoot, modSourceEntryId, 'locales', 'de.json'), {
    locales: [
      {
        id: 'de-fixture',
        label: 'Fixture German',
        nativeLabel: 'Fixture German',
        dictionary: {
          common: {
            close: 'Schliessen',
          },
        },
      },
    ],
  });

  const themeManifestPath = path.join(sourceRoot, themeSourceEntryId, 'manifest.json');
  writeJson(themeManifestPath, {
    manifestVersion: 1,
    id: themeId,
    name: 'Fixture theme',
    version: '1.0.0',
    type: 'theme',
    description: 'Diagnostic theme package.',
    style: {
      colors: {
        bg: '#101216',
        surface: '#171b22',
        surface2: '#202733',
        text: '#edf2ff',
        subtext: '#8d97ab',
        accent: '#54c2f0',
        green: '#67d58c',
        red: '#ff6f7d',
        yellow: '#f0c85c',
      },
      variables: {
        '--theme-diagnostic-marker': 'fixture-theme',
      },
    },
  });

  return {
    addonId,
    addonManifestPath,
    addonSourceEntryId,
    addonsDir,
    appDataDir,
    modId,
    modManifestPath,
    modSourceEntryId,
    modsDir,
    sourceManifestPath,
    themeId,
    themeManifestPath,
    themeSourceEntryId,
    themesDir,
  };
}

function findCatalogEntry(entries: ExtensionCatalogEntry[], kind: 'addons' | 'mods' | 'themes', entryId: string) {
  return entries.find(entry => entry.kind === kind && entry.entryId === entryId);
}

export async function runExtensionSourceDiagnostics(): Promise<ExtensionSourceDiagnosticsReport> {
  const rootDir = createFixtureRoot();
  const fixture = createLocalFixture(rootDir);

  try {
    const sourceInstall = await installExtensionSource(fixture.appDataDir, {
      type: 'local',
      manifestPath: fixture.sourceManifestPath,
    });

    if (!sourceInstall.ok || !sourceInstall.source) {
      return {
        sourceInstallOk: false,
        sourceInstallError: sourceInstall.error ?? 'Unknown source installation error.',
        addonInstalled: false,
        addonInstallResult: { ok: false, error: 'Source installation failed.' },
        addonPresentInRegistry: false,
        catalogEntriesAfter: 0,
        catalogEntriesBefore: 0,
        modInstalled: false,
        modInstallResult: { ok: false, error: 'Source installation failed.' },
        modPresentInRegistry: false,
        themeInstalled: false,
        themeInstallResult: { ok: false, error: 'Source installation failed.' },
        themePresentInRegistry: false,
        warnings: ['Source installation failed before catalog diagnostics could run.'],
      };
    }

    const catalogBefore = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir);
    const addonEntryBefore = findCatalogEntry(catalogBefore, 'addons', fixture.addonSourceEntryId);
    const modEntryBefore = findCatalogEntry(catalogBefore, 'mods', fixture.modSourceEntryId);
    const themeEntryBefore = findCatalogEntry(catalogBefore, 'themes', fixture.themeSourceEntryId);

    const addonInstallResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'addons',
      fixture.addonSourceEntryId,
    );
    const modInstallResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'mods',
      fixture.modSourceEntryId,
    );
    const themeInstallResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'themes',
      fixture.themeSourceEntryId,
    );

    const installedAddons = scanAddons(fixture.addonsDir);
    const installedMods = scanMods(fixture.modsDir);
    const installedThemes = scanThemes(fixture.themesDir);
    const catalogAfter = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir);
    const addonEntryAfter = findCatalogEntry(catalogAfter, 'addons', fixture.addonSourceEntryId);
    const modEntryAfter = findCatalogEntry(catalogAfter, 'mods', fixture.modSourceEntryId);
    const themeEntryAfter = findCatalogEntry(catalogAfter, 'themes', fixture.themeSourceEntryId);

    const warnings: string[] = [];
    if (!addonEntryBefore) warnings.push('Catalog did not expose the fixture addon before installation.');
    if (!modEntryBefore) warnings.push('Catalog did not expose the fixture mod before installation.');
    if (!themeEntryBefore) warnings.push('Catalog did not expose the fixture theme before installation.');
    if (addonEntryBefore?.installSupport !== 'direct') warnings.push(`Fixture addon install support is "${addonEntryBefore?.installSupport ?? 'missing'}" instead of "direct".`);
    if (modEntryBefore?.installSupport !== 'direct') warnings.push(`Fixture mod install support is "${modEntryBefore?.installSupport ?? 'missing'}" instead of "direct".`);
    if (themeEntryBefore?.installSupport !== 'direct') warnings.push(`Fixture theme install support is "${themeEntryBefore?.installSupport ?? 'missing'}" instead of "direct".`);
    if (addonEntryAfter?.status !== 'installed') warnings.push(`Fixture addon status after installation is "${addonEntryAfter?.status ?? 'missing'}".`);
    if (modEntryAfter?.status !== 'installed') warnings.push(`Fixture mod status after installation is "${modEntryAfter?.status ?? 'missing'}".`);
    if (themeEntryAfter?.status !== 'installed') warnings.push(`Fixture theme status after installation is "${themeEntryAfter?.status ?? 'missing'}".`);

    return {
      sourceId: sourceInstall.source.id,
      sourceInstallOk: true,
      catalogEntriesBefore: catalogBefore.length,
      catalogEntriesAfter: catalogAfter.length,
      addonCatalogStatusBefore: addonEntryBefore?.status,
      addonCatalogStatusAfter: addonEntryAfter?.status,
      addonInstallSupportBefore: addonEntryBefore?.installSupport,
      addonInstallResult,
      addonInstalled: addonInstallResult.ok,
      addonPresentInRegistry: installedAddons.some(addon => addon.id === fixture.addonId),
      modCatalogStatusBefore: modEntryBefore?.status,
      modCatalogStatusAfter: modEntryAfter?.status,
      modInstallSupportBefore: modEntryBefore?.installSupport,
      modInstallResult,
      modInstalled: modInstallResult.ok,
      modPresentInRegistry: installedMods.some(mod => mod.id === fixture.modId),
      themeCatalogStatusBefore: themeEntryBefore?.status,
      themeCatalogStatusAfter: themeEntryAfter?.status,
      themeInstallSupportBefore: themeEntryBefore?.installSupport,
      themeInstallResult,
      themeInstalled: themeInstallResult.ok,
      themePresentInRegistry: installedThemes.some(theme => theme.id === fixture.themeId),
      warnings,
    };
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

export function formatExtensionSourceDiagnosticsReport(report: ExtensionSourceDiagnosticsReport) {
  const lines = [
    '=== Extension source diagnostics ===',
    `Source install: ${report.sourceInstallOk ? 'ok' : 'failed'}`,
    ...(report.sourceId ? [`Source id: ${report.sourceId}`] : []),
    ...(report.sourceInstallError ? [`Source error: ${report.sourceInstallError}`] : []),
    `Catalog entries before install: ${report.catalogEntriesBefore}`,
    `Addon before: status=${report.addonCatalogStatusBefore ?? 'missing'} | support=${report.addonInstallSupportBefore ?? 'missing'}`,
    `Mod before: status=${report.modCatalogStatusBefore ?? 'missing'} | support=${report.modInstallSupportBefore ?? 'missing'}`,
    `Theme before: status=${report.themeCatalogStatusBefore ?? 'missing'} | support=${report.themeInstallSupportBefore ?? 'missing'}`,
    `Addon install: ${report.addonInstallResult.ok ? 'ok' : `failed (${report.addonInstallResult.error ?? 'unknown error'})`}`,
    `Mod install: ${report.modInstallResult.ok ? 'ok' : `failed (${report.modInstallResult.error ?? 'unknown error'})`}`,
    `Theme install: ${report.themeInstallResult.ok ? 'ok' : `failed (${report.themeInstallResult.error ?? 'unknown error'})`}`,
    `Addon registry presence: ${report.addonPresentInRegistry ? 'yes' : 'no'}`,
    `Mod registry presence: ${report.modPresentInRegistry ? 'yes' : 'no'}`,
    `Theme registry presence: ${report.themePresentInRegistry ? 'yes' : 'no'}`,
    `Addon after: status=${report.addonCatalogStatusAfter ?? 'missing'}`,
    `Mod after: status=${report.modCatalogStatusAfter ?? 'missing'}`,
    `Theme after: status=${report.themeCatalogStatusAfter ?? 'missing'}`,
    `Catalog entries after install: ${report.catalogEntriesAfter}`,
    'Warnings:',
    ...(report.warnings.length > 0 ? report.warnings.map(warning => `- ${warning}`) : ['- none']),
  ];

  return `${lines.join('\n')}\n`;
}
