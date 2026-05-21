import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  installExtensionCatalogEntry,
  installExtensionSource,
  installAddonFromJSON,
  installModFromFolder,
  installThemeFromJSON,
  removeAddon,
  removeMod,
  removeTheme,
  scanAddons,
  scanExtensionCatalog,
  scanMods,
  scanThemes,
  syncExtensionSource,
  toggleExtensionSource,
  validateExtensionCatalogEntry,
  validateModManifest,
} from '../core/addons';
import {
  getExtensionCatalogEntryBlockReason,
  type ExtensionCatalogEntry,
  type ExtensionCatalogInstallResult,
} from '../shared/types';

const DIAGNOSTIC_APP_VERSION = '2.3.0';

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
  updateAddonCatalogStatusBefore?: string;
  updateAddonCatalogStatusAfter?: string;
  updateAddonInstalledVersion?: string;
  updateAddonOk: boolean;
  updateModCatalogStatusBefore?: string;
  updateModCatalogStatusAfter?: string;
  updateModInstalledVersion?: string;
  updateModOk: boolean;
  updateThemeCatalogStatusBefore?: string;
  updateThemeCatalogStatusAfter?: string;
  updateThemeInstalledVersion?: string;
  updateThemeOk: boolean;
  sourceId?: string;
  sourceInstallError?: string;
  sourceInstallOk: boolean;
  urlSourceCatalogEntries?: number;
  urlSourceInstallOk: boolean;
  githubSourceCatalogEntries?: number;
  githubSourceInstallOk: boolean;
  invalidModPermissionRejected: boolean;
  brokenSourceCatalogEntries?: number;
  brokenSourceInstallOk: boolean;
  brokenSourceCardFallbackOk: boolean;
  brokenCatalogCardFallbackOk: boolean;
  brokenCatalogManualOnlyOk: boolean;
  remoteModBlockedOk: boolean;
  disabledSourcePreflightOk: boolean;
  incompatibleCatalogEntryOk: boolean;
  duplicateRecommendationOk: boolean;
  incompatibleUpdateStatusOk: boolean;
  manualOnlyPreflightContractOk: boolean;
  missingManifestPreflightOk: boolean;
  missingDependencyPreflightOk: boolean;
  missingDependencyPreflightContractOk: boolean;
  missingRuntimeDependencyBlockOk: boolean;
  missingRuntimeDependencyPreflightContractOk: boolean;
  userDataRemovalOk: boolean;
  staleCachePreflightOk: boolean;
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

type RemoteFixturePaths = {
  brokenManifestUrl: string;
  dependentModEntryId: string;
  brokenModEntryId: string;
  brokenSourceId: string;
  brokenAddonEntryId: string;
  dependentAddonEntryId: string;
  incompatibleAddonEntryId: string;
  incompatibleUpdateAddonEntryId: string;
  githubManifestUrl: string;
  githubSourceId: string;
  urlManifestUrl: string;
  urlSourceId: string;
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

  writeJson(path.join(addonsDir, 'fixture-update-addon.json'), {
    manifestVersion: 1,
    id: 'fixture-update-addon',
    name: 'Fixture update addon',
    version: '1.0.0',
    type: 'content',
    resources: {
      words: [{ lang: 'en', words: ['installed', 'update'] }],
    },
  });

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

function writeLocalFixtureUpdates(fixture: FixturePaths) {
  writeJson(fixture.addonManifestPath, {
    manifestVersion: 1,
    id: fixture.addonId,
    name: 'Fixture addon',
    version: '2.0.0',
    type: 'content',
    description: 'Updated diagnostic content addon.',
    resources: {
      words: [{ lang: 'en', words: ['fixture', 'catalog', 'addon', 'update'] }],
    },
  });

  writeJson(fixture.modManifestPath, {
    manifestVersion: 1,
    id: fixture.modId,
    name: 'Fixture mod',
    version: '2.0.0',
    type: 'mod',
    description: 'Updated diagnostic mod package.',
    entry: 'index.js',
    files: ['index.js', 'locales/de.json'],
    permissions: ['ui', 'i18n'],
  });

  writeJson(fixture.themeManifestPath, {
    manifestVersion: 1,
    id: fixture.themeId,
    name: 'Fixture theme',
    version: '2.0.0',
    type: 'theme',
    description: 'Updated diagnostic theme package.',
    style: {
      colors: {
        bg: '#111318',
        surface: '#181d25',
        surface2: '#222a36',
        text: '#f3f6ff',
        subtext: '#99a4b8',
        accent: '#6acaf5',
        green: '#70dc98',
        red: '#ff7482',
        yellow: '#f4cf64',
      },
      variables: {
        '--theme-diagnostic-marker': 'fixture-theme-v2',
      },
    },
  });
}

function createRemoteFixture(rootDir: string, baseUrl: string): RemoteFixturePaths {
  const sourceRoot = path.join(rootDir, 'remote-source');

  const writeSource = (sourceDirName: string, manifest: unknown, files: Array<{ path: string; content: string; json?: boolean }>) => {
    const sourceDir = path.join(sourceRoot, sourceDirName);
    writeJson(path.join(sourceDir, 'manifest.json'), manifest);
    for (const file of files) {
      const targetPath = path.join(sourceDir, file.path);
      if (file.json) {
        writeJson(targetPath, JSON.parse(file.content));
      } else {
        writeText(targetPath, file.content);
      }
    }
  };

  writeSource('url-source', {
    manifestVersion: 1,
    id: 'fixture-url-source',
    name: 'Fixture URL source',
    version: '1.0.0',
    type: 'extension-source',
    lists: {
      addons: 'addons.json',
      mods: 'mods.json',
      themes: 'themes.json',
    },
  }, [
    { path: 'addons.json', content: JSON.stringify(['url-addon']) },
    { path: 'mods.json', content: JSON.stringify(['url-mod']) },
    { path: 'themes.json', content: JSON.stringify(['url-theme']) },
    { path: 'url-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-url-addon',
      name: 'Fixture URL addon',
      version: '1.0.0',
      type: 'content',
      resources: {
        words: [{ lang: 'en', words: ['url', 'fixture'] }],
      },
    }) },
    { path: 'url-mod/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-url-mod',
      name: 'Fixture URL mod',
      version: '1.0.0',
      type: 'mod',
      entry: 'index.js',
      files: ['index.js'],
    }) },
    { path: 'url-mod/index.js', content: 'module.exports = function () {};' },
    { path: 'url-theme/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-url-theme',
      name: 'Fixture URL theme',
      version: '1.0.0',
      type: 'theme',
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
      },
    }) },
  ]);

  writeSource('github-source', {
    manifestVersion: 1,
    id: 'fixture-github-source',
    name: 'Fixture GitHub source',
    version: '1.0.0',
    type: 'extension-source',
    lists: {
      addons: 'addons.json',
    },
  }, [
    { path: 'addons.json', content: JSON.stringify(['github-addon', 'github-future-addon']) },
    { path: 'github-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-github-addon',
      name: 'Fixture GitHub addon',
      version: '1.0.0',
      type: 'content',
      resources: {
        words: [{ lang: 'en', words: ['github', 'fixture'] }],
      },
    }) },
    { path: 'github-future-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-future-addon',
      name: 'Fixture future addon fallback',
      version: '0.9.0',
      type: 'content',
      resources: {
        words: [{ lang: 'en', words: ['github', 'fallback'] }],
      },
    }) },
  ]);

  writeSource('broken-source', {
    manifestVersion: 1,
    id: 'fixture-broken-source',
    name: 'Fixture broken source',
    version: '1.0.0',
    type: 'extension-source',
    lists: {
      addons: 'addons.json',
      mods: 'mods.json',
    },
    cards: {
      source: 'source-card.md',
    },
  }, [
    { path: 'addons.json', content: JSON.stringify(['broken-addon', 'future-addon', 'dependent-addon', 'future-update-addon']) },
    { path: 'mods.json', content: JSON.stringify(['broken-remote-mod', 'dependent-remote-mod']) },
    { path: 'broken-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-broken-addon',
      name: 'Fixture broken addon',
      version: '1.0.0',
      type: 'content',
      description: 'Broken card fixture.',
      resources: {
        words: [{ lang: 'en', words: ['broken', 'card'] }],
      },
    }) },
    { path: 'future-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-future-addon',
      name: 'Fixture future addon',
      version: '1.0.0',
      type: 'content',
      minAppVersion: '99.0.0',
      resources: {
        words: [{ lang: 'en', words: ['future', 'blocked'] }],
      },
    }) },
    { path: 'dependent-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-dependent-addon',
      name: 'Fixture dependent addon',
      version: '1.0.0',
      type: 'content',
      dependencies: ['fixture-missing-runtime-mod'],
      resources: {
        words: [{ lang: 'en', words: ['dependency', 'warning'] }],
      },
    }) },
    { path: 'future-update-addon/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-update-addon',
      name: 'Fixture incompatible update addon',
      version: '2.0.0',
      type: 'content',
      minAppVersion: '99.0.0',
      resources: {
        words: [{ lang: 'en', words: ['future', 'update'] }],
      },
    }) },
    { path: 'broken-remote-mod/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-broken-remote-mod',
      name: 'Fixture broken remote mod',
      version: '1.0.0',
      type: 'mod',
      entry: 'index.js',
      permissions: [],
    }) },
    { path: 'dependent-remote-mod/manifest.json', content: JSON.stringify({
      manifestVersion: 1,
      id: 'fixture-dependent-remote-mod',
      name: 'Fixture dependent remote mod',
      version: '1.0.0',
      type: 'mod',
      entry: 'index.js',
      files: ['index.js'],
      dependencies: ['fixture-missing-runtime-mod'],
      permissions: [],
    }) },
    { path: 'dependent-remote-mod/index.js', content: 'module.exports = function () {};' },
  ]);

  return {
    brokenManifestUrl: `${baseUrl}/broken-source/manifest.json`,
    dependentModEntryId: 'dependent-remote-mod',
    brokenModEntryId: 'broken-remote-mod',
    brokenSourceId: 'fixture-broken-source',
    brokenAddonEntryId: 'broken-addon',
    dependentAddonEntryId: 'dependent-addon',
    incompatibleAddonEntryId: 'future-addon',
    incompatibleUpdateAddonEntryId: 'future-update-addon',
    githubManifestUrl: `${baseUrl}/github-source/manifest.json`,
    githubSourceId: 'fixture-github-source',
    urlManifestUrl: `${baseUrl}/url-source/manifest.json`,
    urlSourceId: 'fixture-url-source',
  };
}

async function startFixtureServer(rootDir: string) {
  const sourceRoot = path.join(rootDir, 'remote-source');
  const server = http.createServer((request, response) => {
    const requestPath = request.url ? decodeURIComponent(request.url.split('?')[0] ?? '/') : '/';

    if (requestPath === '/broken-source/source-card.md' || requestPath === '/broken-source/broken-addon/README.md') {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('broken card');
      return;
    }

    const relativePath = requestPath.replace(/^\/+/, '');
    const targetPath = path.join(sourceRoot, relativePath);
    if (!targetPath.startsWith(sourceRoot)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }

    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    response.writeHead(200, { 'content-type': targetPath.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' });
    response.end(fs.readFileSync(targetPath));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to resolve fixture server address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}

function findCatalogEntry(entries: ExtensionCatalogEntry[], kind: 'addons' | 'mods' | 'themes', entryId: string) {
  return entries.find(entry => entry.kind === kind && entry.entryId === entryId);
}

function runUserDataRemovalDiagnostics(rootDir: string, fixture: FixturePaths) {
  const userDataDir = path.join(rootDir, 'removal-user-data');
  const addonsDir = path.join(userDataDir, 'addons');
  const modsDir = path.join(userDataDir, 'mods');
  const themesDir = path.join(userDataDir, 'themes');

  const addonManifest = fs.readFileSync(fixture.addonManifestPath, 'utf-8');
  const themeManifest = fs.readFileSync(fixture.themeManifestPath, 'utf-8');
  const addonInstall = installAddonFromJSON(addonsDir, addonManifest);
  const modInstall = installModFromFolder(modsDir, fixture.modManifestPath);
  const themeInstall = installThemeFromJSON(themesDir, themeManifest);

  const addonFile = addonInstall.addon ? path.join(addonsDir, addonInstall.addon.fileName) : '';
  const modDir = modInstall.mod ? path.join(modsDir, modInstall.mod.dirName) : '';
  const themeFile = themeInstall.theme ? path.join(themesDir, themeInstall.theme.fileName) : '';

  const installedOk = Boolean(
    addonInstall.ok
      && modInstall.ok
      && themeInstall.ok
      && addonFile
      && fs.existsSync(addonFile)
      && modDir
      && fs.existsSync(modDir)
      && themeFile
      && fs.existsSync(themeFile),
  );

  const removedOk = Boolean(
    addonInstall.addon
      && modInstall.mod
      && themeInstall.theme
      && removeAddon(addonsDir, addonInstall.addon.id)
      && removeMod(modsDir, modInstall.mod.id)
      && removeTheme(themesDir, themeInstall.theme.id)
      && !fs.existsSync(addonFile)
      && !fs.existsSync(modDir)
      && !fs.existsSync(themeFile)
      && !scanAddons(addonsDir).some(addon => addon.id === addonInstall.addon?.id)
      && !scanMods(modsDir).some(mod => mod.id === modInstall.mod?.id)
      && !scanThemes(themesDir).some(theme => theme.id === themeInstall.theme?.id),
  );

  return installedOk && removedOk;
}

export async function runExtensionSourceDiagnostics(): Promise<ExtensionSourceDiagnosticsReport> {
  const rootDir = createFixtureRoot();
  const fixture = createLocalFixture(rootDir);
  const server = await startFixtureServer(rootDir);
  const remoteFixture = createRemoteFixture(rootDir, server.baseUrl);

  try {
    const sourceInstall = await installExtensionSource(fixture.appDataDir, {
      type: 'local',
      manifestPath: fixture.sourceManifestPath,
    });

    if (!sourceInstall.ok || !sourceInstall.source) {
      return {
        sourceInstallOk: false,
        urlSourceInstallOk: false,
        githubSourceInstallOk: false,
        brokenSourceInstallOk: false,
        invalidModPermissionRejected: false,
        brokenSourceCardFallbackOk: false,
        brokenCatalogCardFallbackOk: false,
        brokenCatalogManualOnlyOk: false,
        remoteModBlockedOk: false,
        disabledSourcePreflightOk: false,
        incompatibleCatalogEntryOk: false,
        duplicateRecommendationOk: false,
        incompatibleUpdateStatusOk: false,
        manualOnlyPreflightContractOk: false,
        missingManifestPreflightOk: false,
        missingDependencyPreflightOk: false,
        missingDependencyPreflightContractOk: false,
        missingRuntimeDependencyBlockOk: false,
        missingRuntimeDependencyPreflightContractOk: false,
        userDataRemovalOk: false,
        staleCachePreflightOk: false,
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
        updateAddonOk: false,
        updateModOk: false,
        updateThemeOk: false,
        warnings: ['Source installation failed before catalog diagnostics could run.'],
      };
    }

    const urlSourceInstall = await installExtensionSource(fixture.appDataDir, {
      type: 'url',
      manifestUrl: remoteFixture.urlManifestUrl,
    });
    const invalidModPermissionRejected = !validateModManifest({
      manifestVersion: 1,
      id: 'invalid-permission-mod',
      name: 'Invalid permission mod',
      version: '1.0.0',
      type: 'mod',
      entry: 'index.js',
      permissions: ['ui', 'unknown-permission'],
    }).ok;
    const githubSourceInstall = await installExtensionSource(fixture.appDataDir, {
      type: 'github',
      manifestUrl: remoteFixture.githubManifestUrl,
    });
    const brokenSourceInstall = await installExtensionSource(fixture.appDataDir, {
      type: 'url',
      manifestUrl: remoteFixture.brokenManifestUrl,
    });
    const brokenSourceCardFallbackOk = Boolean(
      brokenSourceInstall.source?.syncState.status === 'ready'
      && brokenSourceInstall.source.syncState.sourceCardIssue?.stage === 'card'
      && brokenSourceInstall.source.syncState.sourceCardIssue.fallback === 'skipped-card',
    );

    const catalogBefore = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir, DIAGNOSTIC_APP_VERSION);
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
    const catalogAfter = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir, DIAGNOSTIC_APP_VERSION);
    const urlCatalogEntries = catalogAfter.filter(entry => entry.sourceId === remoteFixture.urlSourceId);
    const githubCatalogEntries = catalogAfter.filter(entry => entry.sourceId === remoteFixture.githubSourceId);
    const brokenCatalogEntries = catalogAfter.filter(entry => entry.sourceId === remoteFixture.brokenSourceId);
    const addonEntryAfter = findCatalogEntry(catalogAfter, 'addons', fixture.addonSourceEntryId);
    const modEntryAfter = findCatalogEntry(catalogAfter, 'mods', fixture.modSourceEntryId);
    const themeEntryAfter = findCatalogEntry(catalogAfter, 'themes', fixture.themeSourceEntryId);
    const brokenAddonEntry = findCatalogEntry(brokenCatalogEntries, 'addons', remoteFixture.brokenAddonEntryId);
    const brokenRemoteModEntry = findCatalogEntry(brokenCatalogEntries, 'mods', remoteFixture.brokenModEntryId);
    const dependentRemoteModEntry = findCatalogEntry(brokenCatalogEntries, 'mods', remoteFixture.dependentModEntryId);
    const incompatibleAddonEntry = findCatalogEntry(brokenCatalogEntries, 'addons', remoteFixture.incompatibleAddonEntryId);
    const incompatibleUpdateAddonEntry = findCatalogEntry(brokenCatalogEntries, 'addons', remoteFixture.incompatibleUpdateAddonEntryId);
    const dependentAddonEntry = findCatalogEntry(brokenCatalogEntries, 'addons', remoteFixture.dependentAddonEntryId);
    const brokenCardFallbackOk = Boolean(
      brokenAddonEntry
      && brokenAddonEntry.status === 'available'
      && brokenAddonEntry.issues.some(issue => issue.stage === 'card' && issue.fallback === 'skipped-card'),
    );
    const brokenManualOnlyOk = Boolean(
      brokenRemoteModEntry
      && brokenRemoteModEntry.installSupport === 'manual'
      && brokenRemoteModEntry.issues.some(issue => issue.stage === 'package' && issue.fallback === 'blocked-install'),
    );
    const remoteModBlockedOk = Boolean(
      brokenRemoteModEntry
      && brokenRemoteModEntry.issues.some(issue => issue.code === 'addons.catalog.issue.remoteModsTrustedOnly')
      && getExtensionCatalogEntryBlockReason(brokenRemoteModEntry)?.includes('Remote mods are trusted code')
    );
    const manualOnlyPreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.brokenSourceId,
      'mods',
      remoteFixture.brokenModEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const manualOnlyPreflightContractOk = Boolean(
      !manualOnlyPreflight.ok
      && manualOnlyPreflight.blocked
      && manualOnlyPreflight.entry?.installSupport === 'manual'
      && manualOnlyPreflight.entry.issues.some(issue => issue.fallback === 'blocked-install'),
    );
    const missingManifestPreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.brokenSourceId,
      'addons',
      'missing-addon',
      DIAGNOSTIC_APP_VERSION,
    );
    const missingManifestPreflightOk = Boolean(
      !missingManifestPreflight.ok
      && missingManifestPreflight.blocked
      && missingManifestPreflight.error?.includes('Extension manifest could not be read'),
    );
    const incompatibleCatalogEntryOk = Boolean(
      incompatibleAddonEntry
      && incompatibleAddonEntry.status === 'incompatible'
      && incompatibleAddonEntry.compatibility?.compatible === false
      && incompatibleAddonEntry.issues.some(issue => issue.code === 'addons.catalog.incompatibleWithApp' && issue.fallback === 'blocked-install'),
    );
    const duplicateRecommendationOk = Boolean(
      incompatibleAddonEntry
      && incompatibleAddonEntry.duplicateRecommendationReason === 'newest-blocked'
      && incompatibleAddonEntry.duplicatePreferredSourceName === 'Fixture GitHub source'
      && incompatibleAddonEntry.duplicatePreferredVersion === '0.9.0',
    );
    const incompatibleUpdateStatusOk = Boolean(
      incompatibleUpdateAddonEntry
      && incompatibleUpdateAddonEntry.status === 'update-available'
      && incompatibleUpdateAddonEntry.installedVersion === '1.0.0'
      && incompatibleUpdateAddonEntry.compatibility?.compatible === false
      && incompatibleUpdateAddonEntry.issues.some(issue => issue.code === 'addons.catalog.incompatibleWithApp' && issue.fallback === 'blocked-install'),
    );
    const missingDependencyPreflightOk = Boolean(
      dependentAddonEntry
      && dependentAddonEntry.status === 'available'
      && dependentAddonEntry.issues.some(issue => issue.code === 'addons.catalog.issue.missingDependencies' && issue.params?.ids === 'fixture-missing-runtime-mod'),
    );
    const dependentAddonPreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.brokenSourceId,
      'addons',
      remoteFixture.dependentAddonEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const dependentModPreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.brokenSourceId,
      'mods',
      remoteFixture.dependentModEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const missingDependencyPreflightContractOk = Boolean(
      dependentAddonPreflight.ok
      && !dependentAddonPreflight.blocked
      && dependentAddonPreflight.entry?.issues.some(issue => issue.code === 'addons.catalog.issue.missingDependencies'),
    );
    const missingRuntimeDependencyPreflightContractOk = Boolean(
      !dependentModPreflight.ok
      && dependentModPreflight.blocked
      && dependentModPreflight.entry?.issues.some(issue => issue.code === 'addons.catalog.issue.missingRuntimeDependencies'),
    );
    const dependentModInstallResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.brokenSourceId,
      'mods',
      remoteFixture.dependentModEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const missingRuntimeDependencyBlockOk = Boolean(
      dependentRemoteModEntry
      && dependentRemoteModEntry.status === 'available'
      && dependentRemoteModEntry.installSupport === 'manual'
      && dependentRemoteModEntry.issues.some(issue => issue.code === 'addons.catalog.issue.missingRuntimeDependencies' && issue.fallback === 'blocked-install')
      && dependentRemoteModEntry.issues.some(issue => issue.code === 'addons.catalog.issue.remoteModsTrustedOnly' && issue.fallback === 'blocked-install')
      && !dependentModInstallResult.ok
      && dependentModInstallResult.error?.includes('Remote mods are trusted code'),
    );
    const userDataRemovalOk = runUserDataRemovalDiagnostics(rootDir, fixture);

    writeLocalFixtureUpdates(fixture);
    const updateCatalogBefore = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir, DIAGNOSTIC_APP_VERSION);
    const updateAddonEntryBefore = findCatalogEntry(updateCatalogBefore, 'addons', fixture.addonSourceEntryId);
    const updateModEntryBefore = findCatalogEntry(updateCatalogBefore, 'mods', fixture.modSourceEntryId);
    const updateThemeEntryBefore = findCatalogEntry(updateCatalogBefore, 'themes', fixture.themeSourceEntryId);
    const updateAddonResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'addons',
      fixture.addonSourceEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const updateModResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'mods',
      fixture.modSourceEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const updateThemeResult = await installExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      sourceInstall.source.id,
      'themes',
      fixture.themeSourceEntryId,
      DIAGNOSTIC_APP_VERSION,
    );
    const updateCatalogAfter = await scanExtensionCatalog(fixture.appDataDir, fixture.addonsDir, fixture.modsDir, fixture.themesDir, DIAGNOSTIC_APP_VERSION);
    const updateAddonEntryAfter = findCatalogEntry(updateCatalogAfter, 'addons', fixture.addonSourceEntryId);
    const updateModEntryAfter = findCatalogEntry(updateCatalogAfter, 'mods', fixture.modSourceEntryId);
    const updateThemeEntryAfter = findCatalogEntry(updateCatalogAfter, 'themes', fixture.themeSourceEntryId);
    const updateAddonOk = Boolean(
      updateAddonEntryBefore?.status === 'update-available'
      && updateAddonResult.ok
      && updateAddonEntryAfter?.status === 'installed'
      && updateAddonEntryAfter.installedVersion === '2.0.0',
    );
    const updateModOk = Boolean(
      updateModEntryBefore?.status === 'update-available'
      && updateModResult.ok
      && updateModEntryAfter?.status === 'installed'
      && updateModEntryAfter.installedVersion === '2.0.0',
    );
    const updateThemeOk = Boolean(
      updateThemeEntryBefore?.status === 'update-available'
      && updateThemeResult.ok
      && updateThemeEntryAfter?.status === 'installed'
      && updateThemeEntryAfter.installedVersion === '2.0.0',
    );
    toggleExtensionSource(fixture.appDataDir, remoteFixture.urlSourceId, false);
    const disabledSourcePreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.urlSourceId,
      'addons',
      'url-addon',
      DIAGNOSTIC_APP_VERSION,
    );
    const disabledSourcePreflightOk = Boolean(
      !disabledSourcePreflight.ok
      && disabledSourcePreflight.blocked
      && disabledSourcePreflight.entry?.status === 'source-disabled',
    );
    toggleExtensionSource(fixture.appDataDir, remoteFixture.urlSourceId, true);

    fs.rmSync(path.join(rootDir, 'remote-source', 'url-source', 'manifest.json'), { force: true });
    const staleCacheSync = await syncExtensionSource(fixture.appDataDir, remoteFixture.urlSourceId);
    const staleCachePreflight = await validateExtensionCatalogEntry(
      fixture.appDataDir,
      fixture.addonsDir,
      fixture.modsDir,
      fixture.themesDir,
      remoteFixture.urlSourceId,
      'addons',
      'url-addon',
      DIAGNOSTIC_APP_VERSION,
    );
    const staleCachePreflightOk = Boolean(
      !staleCacheSync.ok
      && staleCacheSync.source?.syncState.lastErrorFallback === 'stale-cache'
      && !staleCachePreflight.ok
      && staleCachePreflight.blocked
      && staleCachePreflight.entry?.status === 'source-error'
      && staleCachePreflight.entry.issues.some(issue => issue.fallback === 'stale-cache'),
    );

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
    if (!urlSourceInstall.ok) warnings.push(`URL source installation failed: ${urlSourceInstall.error ?? 'unknown error'}.`);
    if (!githubSourceInstall.ok) warnings.push(`GitHub source installation failed: ${githubSourceInstall.error ?? 'unknown error'}.`);
    if (!brokenSourceInstall.ok) warnings.push(`Broken source installation failed: ${brokenSourceInstall.error ?? 'unknown error'}.`);
    if (!invalidModPermissionRejected) warnings.push('Mod manifest validation accepted an unknown permission.');
    if (!brokenSourceCardFallbackOk) warnings.push('Broken source card did not keep the source ready with a card warning.');
    if (urlCatalogEntries.length < 3) warnings.push(`URL source exposed ${urlCatalogEntries.length} entries instead of at least 3.`);
    if (githubCatalogEntries.length < 1) warnings.push(`GitHub source exposed ${githubCatalogEntries.length} entries instead of at least 1.`);
    if (!brokenCardFallbackOk) warnings.push('Broken source addon did not keep the catalog entry available with a card fallback warning.');
    if (!brokenManualOnlyOk) warnings.push('Broken remote mod did not stay blocked with an explicit package warning.');
    if (!remoteModBlockedOk) warnings.push('Remote mod block reason was not exposed in catalog diagnostics.');
    if (!manualOnlyPreflightContractOk) warnings.push('Remote mod preflight contract did not block installation.');
    if (!missingManifestPreflightOk) warnings.push('Missing manifest preflight contract did not block a missing catalog entry manifest.');
    if (!disabledSourcePreflightOk) warnings.push('Disabled source preflight contract did not block catalog entry installation.');
    if (!staleCachePreflightOk) warnings.push('Stale-cache preflight contract did not expose source-error with stale-cache fallback.');
    if (!incompatibleCatalogEntryOk) warnings.push('Incompatible catalog entry was not blocked with a compatibility issue.');
    if (!duplicateRecommendationOk) warnings.push('Duplicate recommendation did not prefer the installable fallback source when the newest version was blocked.');
    if (!incompatibleUpdateStatusOk) warnings.push('Incompatible update did not keep update-available status with a blocked-install issue.');
    if (!missingDependencyPreflightOk) warnings.push('Missing dependency preflight warning was not exposed in the catalog.');
    if (!missingDependencyPreflightContractOk) warnings.push('Addon preflight contract did not keep missing dependency as a non-blocking warning.');
    if (!missingRuntimeDependencyPreflightContractOk) warnings.push('Mod preflight contract did not block missing runtime dependency.');
    if (!missingRuntimeDependencyBlockOk) warnings.push('Missing runtime dependency did not block direct mod installation.');
    if (!userDataRemovalOk) warnings.push('Install/remove user-data cycle did not remove addon, mod and theme files with their registry entries.');
    if (!updateAddonOk) warnings.push('Addon update from catalog did not move from update-available to installed v2.0.0.');
    if (!updateModOk) warnings.push('Mod update from catalog did not move from update-available to installed v2.0.0.');
    if (!updateThemeOk) warnings.push('Theme update from catalog did not move from update-available to installed v2.0.0.');

    return {
      sourceId: sourceInstall.source.id,
      sourceInstallOk: true,
      urlSourceInstallOk: urlSourceInstall.ok,
      urlSourceCatalogEntries: urlCatalogEntries.length,
      githubSourceInstallOk: githubSourceInstall.ok,
      githubSourceCatalogEntries: githubCatalogEntries.length,
      invalidModPermissionRejected,
      brokenSourceInstallOk: brokenSourceInstall.ok,
      brokenSourceCatalogEntries: brokenCatalogEntries.length,
      brokenSourceCardFallbackOk,
      brokenCatalogCardFallbackOk: brokenCardFallbackOk,
      brokenCatalogManualOnlyOk: brokenManualOnlyOk,
      remoteModBlockedOk,
      disabledSourcePreflightOk,
      incompatibleCatalogEntryOk,
      duplicateRecommendationOk,
      incompatibleUpdateStatusOk,
      manualOnlyPreflightContractOk,
      missingManifestPreflightOk,
      missingDependencyPreflightOk,
      missingDependencyPreflightContractOk,
      missingRuntimeDependencyBlockOk,
      missingRuntimeDependencyPreflightContractOk,
      userDataRemovalOk,
      staleCachePreflightOk,
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
      updateAddonCatalogStatusBefore: updateAddonEntryBefore?.status,
      updateAddonCatalogStatusAfter: updateAddonEntryAfter?.status,
      updateAddonInstalledVersion: updateAddonEntryAfter?.installedVersion,
      updateAddonOk,
      updateModCatalogStatusBefore: updateModEntryBefore?.status,
      updateModCatalogStatusAfter: updateModEntryAfter?.status,
      updateModInstalledVersion: updateModEntryAfter?.installedVersion,
      updateModOk,
      updateThemeCatalogStatusBefore: updateThemeEntryBefore?.status,
      updateThemeCatalogStatusAfter: updateThemeEntryAfter?.status,
      updateThemeInstalledVersion: updateThemeEntryAfter?.installedVersion,
      updateThemeOk,
      warnings,
    };
  } finally {
    await server.close();
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
    `Addon update: ${report.updateAddonOk ? 'ok' : 'failed'} | ${report.updateAddonCatalogStatusBefore ?? 'missing'} -> ${report.updateAddonCatalogStatusAfter ?? 'missing'} | installed=${report.updateAddonInstalledVersion ?? 'missing'}`,
    `Mod update: ${report.updateModOk ? 'ok' : 'failed'} | ${report.updateModCatalogStatusBefore ?? 'missing'} -> ${report.updateModCatalogStatusAfter ?? 'missing'} | installed=${report.updateModInstalledVersion ?? 'missing'}`,
    `Theme update: ${report.updateThemeOk ? 'ok' : 'failed'} | ${report.updateThemeCatalogStatusBefore ?? 'missing'} -> ${report.updateThemeCatalogStatusAfter ?? 'missing'} | installed=${report.updateThemeInstalledVersion ?? 'missing'}`,
    `URL source install: ${report.urlSourceInstallOk ? 'ok' : 'failed'} | entries=${report.urlSourceCatalogEntries ?? 0}`,
    `GitHub source install: ${report.githubSourceInstallOk ? 'ok' : 'failed'} | entries=${report.githubSourceCatalogEntries ?? 0}`,
    `Invalid mod permission rejection: ${report.invalidModPermissionRejected ? 'ok' : 'failed'}`,
    `Broken source install: ${report.brokenSourceInstallOk ? 'ok' : 'failed'} | entries=${report.brokenSourceCatalogEntries ?? 0}`,
    `Broken source card fallback: ${report.brokenSourceCardFallbackOk ? 'ok' : 'failed'}`,
    `Broken card fallback: ${report.brokenCatalogCardFallbackOk ? 'ok' : 'failed'}`,
    `Broken remote mod blocked: ${report.brokenCatalogManualOnlyOk ? 'ok' : 'failed'}`,
    `Remote mod block reason: ${report.remoteModBlockedOk ? 'ok' : 'failed'}`,
    `Remote mod preflight contract: ${report.manualOnlyPreflightContractOk ? 'ok' : 'failed'}`,
    `Missing manifest preflight contract: ${report.missingManifestPreflightOk ? 'ok' : 'failed'}`,
    `Disabled source preflight contract: ${report.disabledSourcePreflightOk ? 'ok' : 'failed'}`,
    `Stale-cache preflight contract: ${report.staleCachePreflightOk ? 'ok' : 'failed'}`,
    `Incompatible catalog entry: ${report.incompatibleCatalogEntryOk ? 'ok' : 'failed'}`,
    `Duplicate recommendation: ${report.duplicateRecommendationOk ? 'ok' : 'failed'}`,
    `Incompatible update status: ${report.incompatibleUpdateStatusOk ? 'ok' : 'failed'}`,
    `Missing dependency preflight: ${report.missingDependencyPreflightOk ? 'ok' : 'failed'}`,
    `Missing dependency preflight contract: ${report.missingDependencyPreflightContractOk ? 'ok' : 'failed'}`,
    `Missing runtime dependency preflight contract: ${report.missingRuntimeDependencyPreflightContractOk ? 'ok' : 'failed'}`,
    `Missing runtime dependency block: ${report.missingRuntimeDependencyBlockOk ? 'ok' : 'failed'}`,
    `User data install/remove cycle: ${report.userDataRemovalOk ? 'ok' : 'failed'}`,
    `Catalog entries after install: ${report.catalogEntriesAfter}`,
    'Warnings:',
    ...(report.warnings.length > 0 ? report.warnings.map(warning => `- ${warning}`) : ['- none']),
  ];

  return `${lines.join('\n')}\n`;
}
