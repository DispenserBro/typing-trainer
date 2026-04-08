import type { LayoutsData } from './layout';
import type { Progress } from './progress';
import type { CustomThemes } from './settings';

export interface ElectronAPI {
  getLayouts(): Promise<LayoutsData>;
  getWords(lang: string): Promise<string[]>;
  getLessonBigrams(lang: string): Promise<Record<string, string[]>>;
  getProgress(): Promise<Progress>;
  saveProgress(data: Progress): Promise<boolean>;
  getCustomThemes(): Promise<CustomThemes>;
  saveCustomThemes(data: CustomThemes): Promise<boolean>;
  winMinimize(): void;
  winMaximize(): void;
  winClose(): void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
