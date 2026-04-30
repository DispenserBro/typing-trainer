import type {
  GameGhostRun,
  GameRunResult,
  GameRunRewardChoice,
  LayoutsData,
  MotivationProgress,
  Progress,
  TranslationParams,
} from '../../shared/types';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
} from '../motivation/progress';
import { buildGameResultHistoryModel } from './resultHistory';

type Translate = (key: string, params?: TranslationParams) => string;

type BuildGameResultViewModelArgs = {
  currentLayout: string;
  dailySeed: string | null;
  ghostRun: GameGhostRun | null;
  historyEntries: NonNullable<Progress['history']>[string];
  layoutProgressUnlocked: number;
  layouts: LayoutsData;
  motivationProgress: MotivationProgress;
  progress: Progress;
  result: GameRunResult | null;
  rewardChoices: GameRunRewardChoice[] | null;
  selectableMapNodeIdsLength: number;
  selectedRewardMessage: string | null;
  translate: Translate;
};

type BuildGameTerminalSummaryViewModelArgs = {
  activeTotalLevels: number;
  completedLevels: number;
  gameWon: boolean;
  level: number;
  translate: Translate;
};

export function buildGameResultViewModel({
  currentLayout,
  dailySeed,
  ghostRun,
  historyEntries,
  layoutProgressUnlocked,
  layouts,
  motivationProgress,
  progress,
  result,
  rewardChoices,
  selectableMapNodeIdsLength,
  selectedRewardMessage,
  translate,
}: BuildGameResultViewModelArgs) {
  const rewardPending = Boolean(result?.passed && result.isBoss && rewardChoices && !selectedRewardMessage);
  const mapSelectionPending = Boolean(result?.passed && selectableMapNodeIdsLength > 0);
  const isTerminalDailyRun = Boolean(dailySeed) && Boolean(result && (result.victory || result.livesLeft <= 0));
  const historyModel = buildGameResultHistoryModel({
    currentLayout,
    ghostRun,
    historyEntries,
    layoutProgressUnlocked,
    layouts,
    progress,
    result,
    translate,
  });

  return {
    comparison: historyModel.comparison,
    ghostComparison: historyModel.ghostComparison,
    isTerminalDailyRun,
    mapSelectionPending,
    masterySummary: historyModel.masterySummary,
    motivationGoals: getActiveMotivationGoalSnapshots(motivationProgress, translate, 1, ['game-victories']),
    motivationStreaks: getMotivationStreakSnapshots(motivationProgress, translate, ['clean-game-victories']),
    rewardPending,
  };
}

export function buildGameTerminalSummaryViewModel({
  activeTotalLevels,
  completedLevels,
  gameWon,
  level,
  translate,
}: BuildGameTerminalSummaryViewModelArgs) {
  if (!gameWon && completedLevels <= 0 && level <= 0) return null;

  return {
    description: gameWon
      ? translate('game.summary.victory', { totalLevels: activeTotalLevels })
      : translate('game.summary.defeat', { completedLevels, bestLevel: Math.max(level, completedLevels) }),
    title: translate('game.summary.title'),
  };
}
