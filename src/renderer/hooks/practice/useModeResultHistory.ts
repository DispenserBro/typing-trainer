import { useMemo } from 'react';
import type {
  HistoryEntry,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
  TranslationParams,
} from '../../../shared/types';
import {
  buildPracticeResultComparison,
  buildSprintResultComparison,
  type ResultComparisonSummary,
} from '../../../core/motivation/records';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type ModeResultHistoryResult = {
  acc: number;
  elapsed?: number;
  wpm: number;
} | null;

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
  const historyEntries = useMemo(
    () => historyByLayout?.[currentLayout] ?? [],
    [currentLayout, historyByLayout],
  );

  const resultComparison = useMemo(() => {
    if (!result) return null;

    if (mode === 'sprint') {
      return buildSprintResultComparison(historyEntries, t, {
        wpm: result.wpm,
        acc: result.acc,
        contentScenarioId: scenarioId,
        durationSeconds: result.elapsed,
        contentMode,
      });
    }

    return buildPracticeResultComparison(historyEntries, t, {
      wpm: result.wpm,
      acc: result.acc,
      contentScenarioId: scenarioId,
      trainingMode,
      contentMode,
    });
  }, [contentMode, historyEntries, mode, result, scenarioId, t, trainingMode]);

  const bestEntries = useMemo(
    () => mode === 'sprint'
      ? historyEntries.filter(entry => entry.mode === 'test')
      : historyEntries.filter(entry => entry.mode === 'practice' && entry.contentScenarioId === scenarioId),
    [historyEntries, mode, scenarioId],
  );

  return {
    bestEntries,
    historyEntries,
    resultComparison,
  };
}
