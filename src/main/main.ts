import { app, BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { CustomThemeColors, CustomThemes, Progress } from '../shared/types';
import {
  scanAddons,
  installAddonFromJSON,
  removeAddon,
  toggleAddon,
  scanExtensionSources,
  scanExtensionCatalog,
  validateExtensionCatalogEntry,
  installExtensionSource,
  installExtensionCatalogEntry,
  updateExtensionSource,
  removeExtensionSource,
  toggleExtensionSource,
  syncExtensionSource,
  syncAllExtensionSources,
  scanMods,
  installModFromFolder,
  removeMod,
  toggleMod,
  readModScript,
  readModLocaleResources,
  scanThemes,
  installThemeFromFile,
  removeTheme,
} from '../core/addons';
import {
  applySetupPreferenceSettings,
  normalizeSetupPreferences,
  resolveSetupPreferenceExtensionSourceManifestPaths,
} from '../core/setup/setupPreferences';
import { resolveAppDataPaths } from '../core/setup/appDataPaths';
import {
  migrateProgressData,
  normalizeProgressForSave,
} from '../core/progress/migrations';

/* ── User data paths ─────────────────────────────────────── */
// При упакованном приложении аддоны/моды рядом с exe, при разработке в папке проекта
const appDataPaths = resolveAppDataPaths({
  appPath: app.getAppPath(),
  exePath: app.getPath('exe'),
  isPackaged: app.isPackaged,
});
const {
  addonsDir,
  customThemesFile,
  installerThemeFile,
  modsDir,
  progressFile,
  setupPreferencesFile,
  themesDir,
  userDataPath,
} = appDataPaths;

type InstallerThemeColors = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  text: string;
  subtext: string;
  accent: string;
};

const BUILT_IN_INSTALLER_THEMES: Record<string, InstallerThemeColors> = {
  'dark-orange': {
    bg: '181818',
    surface: '1F1F1F',
    surface2: '2A2A2A',
    surface3: '333333',
    text: 'F4F4F4',
    subtext: 'B8B8B8',
    accent: 'E8751A',
  },
  catppuccin: {
    bg: '1E1E2E',
    surface: '2A2A3C',
    surface2: '35354A',
    surface3: '3E3E56',
    text: 'CDD6F4',
    subtext: 'A6ADC8',
    accent: '89B4FA',
  },
  nord: {
    bg: '2E3440',
    surface: '3B4252',
    surface2: '434C5E',
    surface3: '4C566A',
    text: 'ECEFF4',
    subtext: 'D8DEE9',
    accent: '88C0D0',
  },
  monokai: {
    bg: '272822',
    surface: '3E3D32',
    surface2: '49483E',
    surface3: '5A5947',
    text: 'F8F8F2',
    subtext: 'CFCFC2',
    accent: 'F92672',
  },
  light: {
    bg: 'F5F5F5',
    surface: 'FFFFFF',
    surface2: 'EEEEEE',
    surface3: 'DDDDDD',
    text: '222222',
    subtext: '666666',
    accent: 'E8751A',
  },
};

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJSON(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadProgressFile(): Progress {
  const migration = migrateProgressData(loadJSON<unknown>(progressFile, {}), app.getVersion());
  for (const diagnostic of migration.diagnostics) {
    console.warn(`[ProgressMigration] ${diagnostic.message}`);
  }
  return migration.progress;
}

function saveProgressFile(progress: Progress): void {
  saveJSON(progressFile, normalizeProgressForSave(progress, app.getVersion()));
}

function isPlatformSmokeRun(): boolean {
  return process.argv.includes('--platform-smoke');
}

function runPlatformSmoke(): void {
  const progress = loadProgressFile();
  saveProgressFile(progress);
  saveJSON(path.join(userDataPath, 'platform-smoke.json'), {
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    timestamp: new Date().toISOString(),
    userDataPath,
  });
  console.log(`[PlatformSmoke] Writable user data path verified: ${userDataPath}`);
}

function normalizeInstallerColor(value?: string): string | null {
  const normalized = value?.trim().replace(/^#/, '').toUpperCase();
  return normalized && /^[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

function toInstallerThemeColors(colors?: Partial<CustomThemeColors>): InstallerThemeColors | null {
  const bg = normalizeInstallerColor(colors?.bg);
  const surface = normalizeInstallerColor(colors?.surface);
  const surface2 = normalizeInstallerColor(colors?.surface2);
  const surface3 = normalizeInstallerColor(colors?.surface3) ?? surface2;
  const text = normalizeInstallerColor(colors?.text);
  const subtext = normalizeInstallerColor(colors?.textDim) ?? normalizeInstallerColor(colors?.subtext);
  const accent = normalizeInstallerColor(colors?.accent);

  if (!bg || !surface || !surface2 || !surface3 || !text || !subtext || !accent) {
    return null;
  }

  return { bg, surface, surface2, surface3, text, subtext, accent };
}

function resolveInstallerThemeColors(themeId: string): InstallerThemeColors {
  const builtIn = BUILT_IN_INSTALLER_THEMES[themeId];
  if (builtIn) return builtIn;

  const customThemes = loadJSON<CustomThemes>(customThemesFile, {});
  const customTheme = toInstallerThemeColors(customThemes[themeId]);
  if (customTheme) return customTheme;

  const installedTheme = scanThemes(themesDir).find(theme => theme.id === themeId);
  const installedThemeColors = toInstallerThemeColors(
    installedTheme?.manifest.style.colors ?? installedTheme?.manifest.preview,
  );

  return installedThemeColors ?? BUILT_IN_INSTALLER_THEMES['dark-orange'];
}

function saveInstallerThemeSnapshot(progress: { settings?: { theme?: string } }): void {
  const themeId = progress.settings?.theme ?? 'dark-orange';
  const colors = resolveInstallerThemeColors(themeId);
  const lines = [
    '[Theme]',
    `id=${themeId}`,
    `bg=${colors.bg}`,
    `surface=${colors.surface}`,
    `surface2=${colors.surface2}`,
    `surface3=${colors.surface3}`,
    `text=${colors.text}`,
    `subtext=${colors.subtext}`,
    `accent=${colors.accent}`,
    '',
  ];

  fs.mkdirSync(path.dirname(installerThemeFile), { recursive: true });
  fs.writeFileSync(installerThemeFile, lines.join('\n'), 'utf-8');
}

function loadDataFile(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf-8'));
}

async function applyPendingSetupPreferences(): Promise<void> {
  if (!fs.existsSync(setupPreferencesFile)) return;

  const setupPreferences = normalizeSetupPreferences(loadJSON<unknown>(setupPreferencesFile, null));
  if (!setupPreferences) {
    fs.rmSync(setupPreferencesFile, { force: true });
    return;
  }

  const progress = loadProgressFile();
  const nextProgress = applySetupPreferenceSettings(progress, setupPreferences);

  if (nextProgress !== progress) {
    saveProgressFile(nextProgress);
    saveInstallerThemeSnapshot(nextProgress);
  }

  const manifestPaths = resolveSetupPreferenceExtensionSourceManifestPaths(app.getAppPath(), setupPreferences);

  for (const manifestPath of manifestPaths) {
    try {
      const result = await installExtensionSource(userDataPath, {
        type: 'local',
        manifestPath,
      });
      if (!result.ok) {
        console.warn(`[SetupPreferences] Failed to add extension source ${manifestPath}: ${result.error}`);
      }
    } catch (error) {
      console.warn(`[SetupPreferences] Failed to add extension source ${manifestPath}:`, error);
    }
  }

  fs.rmSync(setupPreferencesFile, { force: true });
}

/* ── IPC handlers ────────────────────────────────────────── */
ipcMain.handle('get-layouts', () => loadDataFile('data/layouts.json'));
ipcMain.handle('get-words', (_e: Electron.IpcMainInvokeEvent, lang: string) =>
  loadDataFile(`data/words_${lang}.json`),
);
ipcMain.handle('get-practice-content-packs', () => loadDataFile('data/practice-content-packs.json'));
ipcMain.handle('get-lesson-bigrams', (_e: Electron.IpcMainInvokeEvent, lang: string) =>
  loadDataFile(`data/lesson_bigrams_${lang}.json`),
);
ipcMain.handle('get-progress', () => loadProgressFile());
ipcMain.handle('save-progress', (_e: Electron.IpcMainInvokeEvent, data: Progress) => {
  const nextProgress = normalizeProgressForSave(data, app.getVersion());
  saveProgressFile(nextProgress);
  saveInstallerThemeSnapshot(nextProgress);
  return true;
});
ipcMain.handle('get-custom-themes', () => loadJSON<CustomThemes>(customThemesFile, {}));
ipcMain.handle('save-custom-themes', (_e: Electron.IpcMainInvokeEvent, data: CustomThemes) => {
  saveJSON(customThemesFile, data);
  return true;
});

ipcMain.handle('export-file', async (_e: Electron.IpcMainInvokeEvent, defaultName: string, content: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('import-file', async (_e: Electron.IpcMainInvokeEvent, options?: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}) => {
  const result = await dialog.showOpenDialog({
    title: options?.title,
    filters: options?.filters && options.filters.length > 0
      ? options.filters
      : [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return {
    name: path.basename(filePath),
    path: filePath,
    content: fs.readFileSync(filePath, 'utf-8'),
  };
});

/* ── Addon IPC handlers (content JSON files) ─────────────── */
ipcMain.handle('scan-addons', () => scanAddons(addonsDir));

ipcMain.handle('install-addon', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Установить аддон',
    filters: [
      { name: 'Аддон (JSON)', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false, error: 'Отменено.' };

  const content = fs.readFileSync(result.filePaths[0], 'utf-8');
  return installAddonFromJSON(addonsDir, content);
});

ipcMain.handle('install-addon-from-string', (_e: Electron.IpcMainInvokeEvent, jsonContent: string) =>
  installAddonFromJSON(addonsDir, jsonContent),
);

ipcMain.handle('remove-addon', (_e: Electron.IpcMainInvokeEvent, addonId: string) =>
  removeAddon(addonsDir, addonId),
);

ipcMain.handle('toggle-addon', (_e: Electron.IpcMainInvokeEvent, addonId: string, enabled: boolean) =>
  toggleAddon(addonsDir, addonId, enabled),
);

/* ── Theme IPC handlers (style manifests) ───────────────── */
ipcMain.handle('scan-themes', () => scanThemes(themesDir));

ipcMain.handle('install-theme', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Установить тему',
    filters: [
      { name: 'Тема (JSON)', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false, error: 'Отменено.' };

  return installThemeFromFile(themesDir, result.filePaths[0]);
});

ipcMain.handle('remove-theme', (_e: Electron.IpcMainInvokeEvent, themeId: string) =>
  removeTheme(themesDir, themeId),
);

/* ── Extension source IPC handlers ──────────────────────── */
ipcMain.handle('scan-extension-sources', () => scanExtensionSources(userDataPath));
ipcMain.handle('scan-extension-catalog', () => scanExtensionCatalog(userDataPath, addonsDir, modsDir, themesDir, app.getVersion()));
ipcMain.handle('validate-extension-catalog-entry', (_e: Electron.IpcMainInvokeEvent, sourceId: string, kind: 'addons' | 'mods' | 'themes', entryId: string) =>
  validateExtensionCatalogEntry(userDataPath, addonsDir, modsDir, themesDir, sourceId, kind, entryId, app.getVersion()),
);

ipcMain.handle('install-extension-source', (_e: Electron.IpcMainInvokeEvent, input) =>
  installExtensionSource(userDataPath, input),
);

ipcMain.handle('install-extension-catalog-entry', (_e: Electron.IpcMainInvokeEvent, sourceId: string, kind: 'addons' | 'mods' | 'themes', entryId: string) =>
  installExtensionCatalogEntry(userDataPath, addonsDir, modsDir, themesDir, sourceId, kind, entryId, app.getVersion()),
);

ipcMain.handle('update-extension-source', (_e: Electron.IpcMainInvokeEvent, sourceId: string, input) =>
  updateExtensionSource(userDataPath, sourceId, input),
);

ipcMain.handle('remove-extension-source', (_e: Electron.IpcMainInvokeEvent, sourceId: string) =>
  removeExtensionSource(userDataPath, sourceId),
);

ipcMain.handle('toggle-extension-source', (_e: Electron.IpcMainInvokeEvent, sourceId: string, enabled: boolean) =>
  toggleExtensionSource(userDataPath, sourceId, enabled),
);

ipcMain.handle('sync-extension-source', (_e: Electron.IpcMainInvokeEvent, sourceId: string) =>
  syncExtensionSource(userDataPath, sourceId),
);

/* ── Mod IPC handlers (script folders) ──────────────────── */
ipcMain.handle('scan-mods', () => scanMods(modsDir));

ipcMain.handle('install-mod', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Установить мод — выберите manifest.json',
    filters: [
      { name: 'Манифест мода (manifest.json)', extensions: ['json'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false, error: 'Отменено.' };

  return installModFromFolder(modsDir, result.filePaths[0]);
});

ipcMain.handle('remove-mod', (_e: Electron.IpcMainInvokeEvent, modId: string) =>
  removeMod(modsDir, modId),
);

ipcMain.handle('toggle-mod', (_e: Electron.IpcMainInvokeEvent, modId: string, enabled: boolean) =>
  toggleMod(modsDir, modId, enabled),
);

ipcMain.handle('read-mod-script', (_e: Electron.IpcMainInvokeEvent, modId: string): string | null =>
  readModScript(modsDir, modId),
);

ipcMain.handle('read-mod-locale-resources', (_e: Electron.IpcMainInvokeEvent, modId: string) =>
  readModLocaleResources(modsDir, modId),
);

/* ── Window control IPC ──────────────────────────────────── */
ipcMain.on('win-minimize', () => win?.minimize());
ipcMain.on('win-maximize', () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('win-close', () => win?.close());

/* ── Window ──────────────────────────────────────────────── */
let win: BrowserWindow | null = null;
const APP_USER_MODEL_ID = app.isPackaged ? 'com.typing-trainer.app' : 'com.typing-trainer.app.dev';

function createWindow(): void {
  const iconPath = path.join(__dirname, '..', '..', 'data', 'app-icon.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 420,
    minHeight: 400,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Typing Trainer',
    backgroundColor: '#181818',
    icon: appIcon.isEmpty() ? undefined : appIcon,
  });
  if (!appIcon.isEmpty()) {
    win.setIcon(appIcon);
  }
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // win.webContents.openDevTools();
}

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  if (isPlatformSmokeRun()) {
    runPlatformSmoke();
    app.quit();
    return;
  }
  await applyPendingSetupPreferences();
  void syncAllExtensionSources(userDataPath).catch((error) => {
    console.error('[ExtensionSources] Startup sync failed:', error);
  });
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
