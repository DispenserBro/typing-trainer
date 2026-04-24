import type {
  CustomThemes,
  GameState,
  InstalledAddon,
  InstalledMod,
  InstalledTheme,
  LayoutsData,
  PracticeContentPack,
  Progress,
} from '../../shared/types';
import { mergeAddonResourceState, type MergedAddonResources } from './appAddonResourceState';
import {
  resolveCurrentLanguageLayoutState,
  type CurrentLanguageLayoutState,
} from './appLanguageLayoutState';
import {
  resolveLoadedProgressState,
  type ResolvedProgressState,
} from './appProgressState';
import { loadMergedWords } from './appWordsState';

export type InitialAppBootstrapState = {
  addons: InstalledAddon[];
  mods: InstalledMod[];
  themes: InstalledTheme[];
  customThemes: CustomThemes;
  resources: MergedAddonResources;
  progressState: ResolvedProgressState;
  currentSelection: CurrentLanguageLayoutState;
  words: string[];
};

export async function loadInitialAppBootstrapState({
  previousGameState,
  readLayouts,
  readProgress,
  readThemes,
  readPracticeContentPacks,
  readAddons,
  readMods,
  readInstalledThemes,
  readWords,
}: {
  previousGameState: GameState | null;
  readLayouts: () => Promise<LayoutsData>;
  readProgress: () => Promise<Progress>;
  readThemes: () => Promise<CustomThemes>;
  readPracticeContentPacks: () => Promise<PracticeContentPack[]>;
  readAddons: () => Promise<InstalledAddon[]>;
  readMods: () => Promise<InstalledMod[]>;
  readInstalledThemes: () => Promise<InstalledTheme[]>;
  readWords: (language: string) => Promise<string[]>;
}): Promise<InitialAppBootstrapState> {
  const [layouts, progress, customThemes, practiceContentPacks, addons, mods, themes] = await Promise.all([
    readLayouts(),
    readProgress(),
    readThemes(),
    readPracticeContentPacks(),
    readAddons(),
    readMods(),
    readInstalledThemes(),
  ]);

  const resources = mergeAddonResourceState({
    layouts,
    practiceContentPacks,
  }, addons);
  const progressState = resolveLoadedProgressState(progress, previousGameState);
  const currentSelection = resolveCurrentLanguageLayoutState(progressState.settings, resources.layouts);
  const words = await loadMergedWords(currentSelection.language, addons, readWords);

  return {
    addons,
    mods,
    themes,
    customThemes,
    resources,
    progressState,
    currentSelection,
    words,
  };
}
