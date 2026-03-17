import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Progress, CustomThemes } from '../shared/types';

/* ── User data paths ─────────────────────────────────────── */
const userDataPath: string = app.getPath('userData');
const progressFile: string = path.join(userDataPath, 'progress.json');
const customThemesFile: string = path.join(userDataPath, 'custom-themes.json');

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
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
