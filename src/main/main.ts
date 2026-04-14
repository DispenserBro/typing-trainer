import { app, BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Progress, CustomThemes } from '../shared/types';
import {
  scanAddons,
  installAddonFromJSON,
  removeAddon,
  toggleAddon,
  scanMods,
  installModFromFolder,
  removeMod,
  toggleMod,
  readModScript,
} from '../core/addons';

/* ── User data paths ─────────────────────────────────────── */
// При упакованном приложении аддоны/моды рядом с exe, при разработке в папке проекта
const userDataPath: string = app.isPackaged 
  ? path.join(path.dirname(app.getPath('exe')), 'data')
  : path.join(app.getAppPath(), 'data');
const progressFile: string = path.join(userDataPath, 'progress.json');
const customThemesFile: string = path.join(userDataPath, 'custom-themes.json');
const addonsDir: string = path.join(userDataPath, 'addons');
const modsDir: string = path.join(userDataPath, 'mods');

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadDataFile(rel: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf-8'));
}

/* ── IPC handlers ────────────────────────────────────────── */
ipcMain.handle('get-layouts', () => loadDataFile('data/layouts.json'));
ipcMain.handle('get-words', (_e: Electron.IpcMainInvokeEvent, lang: string) =>
  loadDataFile(`data/words_${lang}.json`),
);
ipcMain.handle('get-lesson-bigrams', (_e: Electron.IpcMainInvokeEvent, lang: string) =>
  loadDataFile(`data/lesson_bigrams_${lang}.json`),
);
ipcMain.handle('get-progress', () => loadJSON<Progress>(progressFile, {}));
ipcMain.handle('save-progress', (_e: Electron.IpcMainInvokeEvent, data: Progress) => {
  saveJSON(progressFile, data);
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

ipcMain.handle('import-file', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return fs.readFileSync(result.filePaths[0], 'utf-8');
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

/* ── Window control IPC ──────────────────────────────────── */
ipcMain.on('win-minimize', () => win?.minimize());
ipcMain.on('win-maximize', () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('win-close', () => win?.close());

/* ── Window ──────────────────────────────────────────────── */
let win: BrowserWindow | null = null;

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
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.typing-trainer.app');
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
