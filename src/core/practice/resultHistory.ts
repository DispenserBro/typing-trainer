import type {
  HistoryEntry,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
  TranslationParams,
} from '../../shared/types';
import {
  isSprintHistoryEntry,
  matchesPracticeScenario,
} from '../history/selectors';
import {
  buildPracticeResultComparison,
  buildSprintResultComparison,
  type ResultComparisonSummary,
} from '../motivation/records';

export type { ResultComparisonSummary } from '../motivation/records';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type ModeResultHistoryMode = 'sprint' | 'practice-scenario';

export type ModeResultHistoryResult = {
  acc: number;
  elapsed?: number;
  wpm: number;
} | null;

export type BuildModeResultHistoryModelArgs = {
  contentMode: PracticeContentMode;
  currentLayout: string;
  historyByLayout?: Record<string, HistoryEntry[]>;
  mode: ModeResultHistoryMode;
  result: ModeResultHistoryResult;
  scenarioId: PracticeContentScenarioId;
  t: TranslateFn;
  trainingMode?: PracticeTrainingMode;
};

export type ModeResultHistoryModel = {
  bestEntries: HistoryEntry[];
  historyEntries: HistoryEntry[];
  resultComparison: ResultComparisonSummary | null;
};

export function buildModeResultHistoryModel({
  contentMode,
  currentLayout,
  historyByLayout,
  mode,
  result,
  scenarioId,
  t,
  trainingMode = 'normal',
}: BuildModeResultHistoryModelArgs): ModeResultHistoryModel {
  const historyEntries = historyByLayout?.[currentLayout] ?? [];
  const resultComparison = (() => {
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
  })();
  const bestEntries = mode === 'sprint'
    ? historyEntries.filter(isSprintHistoryEntry)
    : historyEntries.filter(entry => matchesPracticeScenario(entry, scenarioId));

  return {
    bestEntries,
    historyEntries,
    resultComparison,
  };
}
