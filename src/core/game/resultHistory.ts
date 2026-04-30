import type {
  GameGhostRun,
  GameRunResult,
  HistoryEntry,
  LayoutsData,
  Progress,
  TranslationParams,
} from '../../shared/types';
import {
  buildGameResultComparison,
  buildLayoutMasteryResultSummary,
  type LayoutMasteryResultSummary,
  type ResultComparisonSummary,
} from '../motivation/records';
import { getGhostComparison } from './ghostRun';

type Translate = (key: string, params?: TranslationParams) => string;

export type GameResultHistoryModel = {
  comparison: ResultComparisonSummary | null;
  ghostComparison: { ghostWpm: number; delta: number; ahead: boolean } | null;
  masterySummary: LayoutMasteryResultSummary | null;
};

export type BuildGameResultHistoryModelArgs = {
  currentLayout: string;
  ghostRun: GameGhostRun | null;
  historyEntries: HistoryEntry[];
  layoutProgressUnlocked: number;
  layouts: LayoutsData;
  progress: Progress;
  result: GameRunResult | null;
  translate: Translate;
};

export function buildGameResultHistoryModel({
  currentLayout,
  ghostRun,
  historyEntries,
  layoutProgressUnlocked,
  layouts,
  progress,
  result,
  translate,
}: BuildGameResultHistoryModelArgs): GameResultHistoryModel {
  if (!result) {
    return {
      comparison: null,
      ghostComparison: null,
      masterySummary: null,
    };
  }

  return {
    comparison: buildGameResultComparison(historyEntries, translate, {
      wpm: result.wpm,
      acc: result.acc,
      gameLevel: result.level,
      gameStageType: result.isBoss ? 'boss' : 'normal',
    }),
    ghostComparison: getGhostComparison(ghostRun, result.level, result.wpm),
    masterySummary: buildLayoutMasteryResultSummary(progress, layouts, currentLayout, translate, {
      previousHistoryEntriesOverride: historyEntries.slice(0, -1),
      currentHistoryEntriesOverride: historyEntries,
      previousUnlockedLettersOverride: layoutProgressUnlocked,
      currentUnlockedLettersOverride: layoutProgressUnlocked,
    }),
  };
}
