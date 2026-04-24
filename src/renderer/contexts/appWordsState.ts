import { mergeAddonWords } from '../../core/addons/addonMerger';
import type { InstalledAddon } from '../../shared/types';

type ReadWords = (language: string) => Promise<string[]>;

export async function loadMergedWords(
  language: string,
  addons: InstalledAddon[],
  readWords: ReadWords,
): Promise<string[]> {
  const baseWords = await readWords(language);
  return mergeAddonWords(baseWords, language, addons);
}
