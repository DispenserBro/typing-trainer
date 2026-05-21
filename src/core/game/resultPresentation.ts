import type { GameRunResult, TranslationParams } from '../../shared/types';
import type {
  MotivationGoalSnapshot,
  MotivationStreakSnapshot,
} from '../motivation/progress';
import type {
  LayoutMasteryResultSummary,
  ResultComparisonSummary,
} from '../motivation/records';
import type { GameRewardChoiceBlockViewModel } from './resultRewards';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type GameResultActionId =
  | 'continue'
  | 'restart'
  | 'retry'
  | 'return-to-main-game';

export type GameResultActionViewModel = {
  focusTarget: boolean;
  id: GameResultActionId;
  label: string;
  variant: 'accent' | 'default';
};

export type GameResultCardViewModel = {
  actions: GameResultActionViewModel[];
  summary: string;
  title: string;
};

export type GameResultSecondaryBlocksViewModel = {
  showComparison: boolean;
  showMastery: boolean;
  showMotivationProgress: boolean;
  showRewardBlock: boolean;
};

export function buildGameResultTitle(result: GameRunResult, translate: TranslateFn) {
  if (result.victory) return translate('game.result.title.victory');
  if (result.passed) {
    return result.isBoss
      ? translate('game.result.title.bossPassed')
      : translate('game.result.title.levelPassed');
  }
  if (result.timedOut) {
    return result.livesLeft > 0
      ? translate('game.result.title.timeOut')
      : translate('game.result.title.gameOver');
  }
  return result.livesLeft > 0
    ? translate('game.result.title.hpLost')
    : translate('game.result.title.gameOver');
}

export function buildGameResultSummary({
  bossLevelInterval,
  mapSelectionPending,
  result,
  totalLevels,
  translate,
}: {
  bossLevelInterval: number;
  mapSelectionPending: boolean;
  result: GameRunResult;
  totalLevels: number;
  translate: TranslateFn;
}) {
  if (result.victory) {
    return translate('game.result.summary.victory', { totalLevels });
  }
  if (result.passed) {
    if (result.isBoss) {
      return translate('game.result.summary.bossReward', { level: result.level + 1 });
    }
    if (mapSelectionPending) {
      return translate('game.result.summary.mapSelection');
    }
    return translate('game.result.summary.nextLevel', {
      bossSuffix: (result.level + 1) % bossLevelInterval === 0 ? translate('game.result.summary.bossSuffix') : '',
      level: result.level,
      nextLevel: result.level + 1,
    });
  }
  if (result.timedOut) {
    return translate('game.result.summary.timeout', { livesLeft: result.livesLeft });
  }
  return translate('game.result.summary.failure', {
    livesLeft: result.livesLeft,
    minAccuracy: result.minAccuracy,
  });
}

export function buildGameResultActions({
  isTerminalDailyRun,
  mapSelectionPending,
  result,
  rewardPending,
  translate,
}: {
  isTerminalDailyRun: boolean;
  mapSelectionPending: boolean;
  result: GameRunResult;
  rewardPending: boolean;
  translate: TranslateFn;
}): GameResultActionViewModel[] {
  if (rewardPending) return [];

  if (result.passed && !result.victory) {
    return [{
      focusTarget: true,
      id: 'continue',
      label: mapSelectionPending
        ? translate('game.result.actions.toMap')
        : translate('game.result.actions.nextLevel'),
      variant: 'accent',
    }];
  }

  if (result.livesLeft > 0 && !result.victory) {
    return [{
      focusTarget: true,
      id: 'retry',
      label: translate('game.result.actions.retryLevel'),
      variant: 'accent',
    }];
  }

  if (isTerminalDailyRun) {
    return [
      {
        focusTarget: true,
        id: 'restart',
        label: translate('game.result.actions.playAgain'),
        variant: 'accent',
      },
      {
        focusTarget: false,
        id: 'return-to-main-game',
        label: translate('game.result.actions.toMainGame'),
        variant: 'default',
      },
    ];
  }

  return [{
    focusTarget: true,
    id: 'restart',
    label: translate('game.result.actions.playAgain'),
    variant: 'accent',
  }];
}

export function buildGameResultCardViewModel({
  bossLevelInterval,
  isTerminalDailyRun,
  mapSelectionPending,
  result,
  rewardPending,
  totalLevels,
  translate,
}: {
  bossLevelInterval: number;
  isTerminalDailyRun: boolean;
  mapSelectionPending: boolean;
  result: GameRunResult;
  rewardPending: boolean;
  totalLevels: number;
  translate: TranslateFn;
}): GameResultCardViewModel {
  return {
    actions: buildGameResultActions({
      isTerminalDailyRun,
      mapSelectionPending,
      result,
      rewardPending,
      translate,
    }),
    summary: buildGameResultSummary({
      bossLevelInterval,
      mapSelectionPending,
      result,
      totalLevels,
      translate,
    }),
    title: buildGameResultTitle(result, translate),
  };
}

export function buildGameResultSecondaryBlocksViewModel({
  comparison,
  masterySummary,
  motivationGoals,
  motivationStreaks,
  result,
  rewardBlock,
}: {
  comparison: ResultComparisonSummary | null;
  masterySummary: LayoutMasteryResultSummary | null;
  motivationGoals: MotivationGoalSnapshot[];
  motivationStreaks: MotivationStreakSnapshot[];
  result: GameRunResult;
  rewardBlock: GameRewardChoiceBlockViewModel | null;
}): GameResultSecondaryBlocksViewModel {
  const terminalResult = result.victory || result.livesLeft <= 0;

  return {
    showComparison: Boolean(comparison),
    showMastery: Boolean(masterySummary),
    showMotivationProgress: terminalResult && (motivationGoals.length > 0 || motivationStreaks.length > 0),
    showRewardBlock: Boolean(rewardBlock),
  };
}
