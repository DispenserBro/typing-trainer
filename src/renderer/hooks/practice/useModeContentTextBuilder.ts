import { useCallback } from 'react';
import {
  buildPracticeContentText,
} from '../../../core/practice/contentPipeline';
import type {
  NgramModel,
  PracticeBuildOptions,
} from '../../../core/text/ngramUtils';
import type {
  LayoutPracticeInsights,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentScenarioId,
} from '../../../shared/types';

type UseModeContentTextBuilderArgs = {
  allWords: string[];
  buildOptions: PracticeBuildOptions;
  contentMode: PracticeContentMode;
  contentPack?: PracticeContentPack | null;
  insights?: LayoutPracticeInsights | null;
  ngramModel?: NgramModel | null;
  scenarioId: PracticeContentScenarioId;
  unlockedChars: string[];
  weakChar: string | null;
  wordCountOverride: number;
};

export function useModeContentTextBuilder({
  allWords,
  buildOptions,
  contentMode,
  contentPack,
  insights,
  ngramModel,
  scenarioId,
  unlockedChars,
  weakChar,
  wordCountOverride,
}: UseModeContentTextBuilderArgs) {
  return useCallback(() => buildPracticeContentText({
    allWords,
    buildOptions,
    contentMode,
    contentPack,
    insights,
    ngramModel: ngramModel ?? undefined,
    scenarioId,
    unlockedChars,
    weakChar,
    wordCountOverride,
  }), [
    allWords,
    buildOptions,
    contentMode,
    contentPack,
    insights,
    ngramModel,
    scenarioId,
    unlockedChars,
    weakChar,
    wordCountOverride,
  ]);
}
