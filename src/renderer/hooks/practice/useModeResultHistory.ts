import { useMemo } from 'react';
import type {
  HistoryEntry,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
  TranslationParams,
} from '../../../shared/types';
import {
  buildModeResultHistoryModel,
  type ModeResultHistoryResult,
  type ResultComparisonSummary,
} from '../../../core/practice/resultHistory';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UseModeResultHistoryArgs = {
  contentMode: PracticeContentMode;
  currentLayout: string;
  historyByLayout?: Record<string, HistoryEntry[]>;
  mode: 'sprint' | 'practice-scenario';
  result: ModeResultHistoryResult;
  scenarioId: PracticeContentScenarioId;
  t: TranslateFn;
  trainingMode?: PracticeTrainingMode;
};

export function useModeResultHistory({
  contentMode,
  currentLayout,
  historyByLayout,
  mode,
  result,
  scenarioId,
  t,
  trainingMode = 'normal',
}: UseModeResultHistoryArgs): {
  bestEntries: HistoryEntry[];
  historyEntries: HistoryEntry[];
  resultComparison: ResultComparisonSummary | null;
} {
  return useMemo(() => buildModeResultHistoryModel({
    contentMode,
    currentLayout,
    historyByLayout,
    mode,
    result,
    scenarioId,
    t,
    trainingMode,
  }), [contentMode, currentLayout, historyByLayout, mode, result, scenarioId, t, trainingMode]);
}
