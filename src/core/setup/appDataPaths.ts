import * as path from 'path';

export type AppDataPathInput = {
  appPath: string;
  exePath: string;
  isPackaged: boolean;
};

export type AppDataPaths = {
  addonsDir: string;
  customThemesFile: string;
  modsDir: string;
  progressFile: string;
  setupPreferencesFile: string;
  themesDir: string;
  userDataPath: string;
};

export function resolveAppDataPaths(input: AppDataPathInput): AppDataPaths {
  const userDataPath = input.isPackaged
    ? path.join(path.dirname(input.exePath), 'data')
    : path.join(input.appPath, 'data');

  return {
    userDataPath,
    progressFile: path.join(userDataPath, 'progress.json'),
    customThemesFile: path.join(userDataPath, 'custom-themes.json'),
    setupPreferencesFile: path.join(userDataPath, 'setup-preferences.json'),
    addonsDir: path.join(userDataPath, 'addons'),
    modsDir: path.join(userDataPath, 'mods'),
    themesDir: path.join(userDataPath, 'themes'),
  };
}
