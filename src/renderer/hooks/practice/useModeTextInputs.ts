import { useMemo } from 'react';
import type { CharStat, Layout, LayoutProgressState } from '../../../shared/types';
import { filterYoKeys, filterYoWords } from '../../../core/textFilters';
import { getWorstChar } from '../../../core/practice/engine';

type UseModeTextInputsArgs = {
  allWords: string[];
  keyStats?: Record<string, CharStat>;
  layout?: Layout;
  layoutProgress: LayoutProgressState;
  useYo: boolean;
};

export function useModeTextInputs({
  allWords,
  keyStats,
  layout,
  layoutProgress,
  useYo,
}: UseModeTextInputsArgs) {
  const words = useMemo(() => filterYoWords(allWords, useYo), [allWords, useYo]);
  const rawPracticeUnlockOrder = layout?.practiceUnlockOrder;
  const practiceUnlockOrder = useMemo(
    () => filterYoKeys(rawPracticeUnlockOrder ?? [], useYo),
    [rawPracticeUnlockOrder, useYo],
  );
  const unlockedChars = useMemo(
    () => practiceUnlockOrder.slice(0, layoutProgress.unlocked),
    [layoutProgress.unlocked, practiceUnlockOrder],
  );
  const weakChar = useMemo(
    () => getWorstChar(keyStats, unlockedChars),
    [keyStats, unlockedChars],
  );

  return {
    practiceUnlockOrder,
    unlockedChars,
    weakChar,
    words,
  };
}
