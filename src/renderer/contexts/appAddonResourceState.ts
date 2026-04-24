import {
  mergeAddonLayouts,
  mergeAddonPracticePacks,
} from '../../core/addons/addonMerger';
import type {
  InstalledAddon,
  LayoutsData,
  PracticeContentPack,
} from '../../shared/types';
import { loadMergedWords } from './appWordsState';

type BaseAddonResources = {
  layouts: LayoutsData;
  practiceContentPacks: PracticeContentPack[];
};

export type MergedAddonResources = BaseAddonResources;

export function mergeAddonResourceState(
  base: BaseAddonResources,
  addons: InstalledAddon[],
): MergedAddonResources {
  return {
    layouts: mergeAddonLayouts(base.layouts, addons),
    practiceContentPacks: mergeAddonPracticePacks(base.practiceContentPacks, addons),
  };
}

export async function loadMergedAddonResourceState({
  addons,
  language,
  readLayouts,
  readPracticeContentPacks,
  readWords,
}: {
  addons: InstalledAddon[];
  language: string;
  readLayouts: () => Promise<LayoutsData>;
  readPracticeContentPacks: () => Promise<PracticeContentPack[]>;
  readWords: (language: string) => Promise<string[]>;
}): Promise<MergedAddonResources & { words: string[] }> {
  const [layouts, practiceContentPacks, words] = await Promise.all([
    readLayouts(),
    readPracticeContentPacks(),
    loadMergedWords(language, addons, readWords),
  ]);

  return {
    ...mergeAddonResourceState({ layouts, practiceContentPacks }, addons),
    words,
  };
}
