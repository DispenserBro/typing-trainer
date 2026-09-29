import { app, BrowserWindow, dialog, type MessageBoxOptions } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';

let autoUpdateStarted = false;

function shouldRunAutoUpdates(): boolean {
  return app.isPackaged
    // Portable ZIPs must never download and launch an NSIS installer.
    && !(process.platform === 'win32'
      && existsSync(path.join(path.dirname(app.getPath('exe')), 'typing-trainer-portable.json')))
    && !process.argv.includes('--platform-smoke')
    && process.env.TYPING_TRAINER_DISABLE_AUTO_UPDATE !== '1';
}

function getVersionLabel(info: UpdateInfo): string {
  return info.version ? `Typing Trainer ${info.version}` : 'новая версия Typing Trainer';
}

export function startAutoUpdates(getMainWindow: () => BrowserWindow | null): void {
  if (autoUpdateStarted || !shouldRunAutoUpdates()) return;
  autoUpdateStarted = true;

  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] Checking GitHub Releases for updates.');
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`[AutoUpdate] No update available. Current release channel version: ${info.version}.`);
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdate] Update available: ${info.version}. Download started.`);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdate] Download progress: ${Math.round(progress.percent)}%.`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const targetWindow = getMainWindow();
    const title = 'Обновление готово';
    const message = `${getVersionLabel(info)} скачана и готова к установке.`;
    const detail = 'Приложение перезапустится и установит обновление. Если отложить установку, обновление применится при следующем закрытии приложения.';

    const messageBoxOptions: MessageBoxOptions = {
      type: 'info',
      title,
      message,
      detail,
      buttons: ['Перезапустить и установить', 'Позже'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    };
    const messageBoxPromise = targetWindow
      ? dialog.showMessageBox(targetWindow, messageBoxOptions)
      : dialog.showMessageBox(messageBoxOptions);

    void messageBoxPromise.then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdate] Update check failed:', error);
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error) => {
      console.error('[AutoUpdate] Failed to start update check:', error);
    });
  }, 3000);
}
