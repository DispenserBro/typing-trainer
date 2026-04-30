import type { TranslationParams } from '../../shared/types';
import type { ResultComparisonSummary } from '../motivation/records';

type TranslateFn = (key: string, options?: TranslationParams) => string;

export type ModeResultCalloutViewModel = {
  title: string;
  detail: string;
};

export function buildSprintResultCallout(
  translate: TranslateFn,
  result: { wpm: number; acc: number; errors: number },
  comparison: ResultComparisonSummary | null,
): ModeResultCalloutViewModel {
  if (comparison?.recentBestDelta?.tone === 'up' && comparison.recentBestDelta.speedDelta > 0 && comparison.recentBestDelta.accuracyDelta >= 0) {
    return {
      title: translate('sprint.callouts.improved.title'),
      detail: translate('sprint.callouts.improved.detail'),
    };
  }
  if (result.errors === 0 && result.acc >= 98) {
    return {
      title: translate('sprint.callouts.clean.title'),
      detail: translate('sprint.callouts.clean.detail'),
    };
  }
  if (result.acc < 92 || result.errors >= 6) {
    return {
      title: translate('sprint.callouts.errors.title'),
      detail: translate('sprint.callouts.errors.detail'),
    };
  }
  if (comparison?.previousDelta?.tone === 'down') {
    return {
      title: translate('sprint.callouts.belowPrevious.title'),
      detail: translate('sprint.callouts.belowPrevious.detail'),
    };
  }
  return {
    title: translate('sprint.callouts.steady.title'),
    detail: translate('sprint.callouts.steady.detail'),
  };
}

export function buildChallengeResultCallout(
  translate: TranslateFn,
  variant: 'survival' | 'flawless',
  result: { passed: boolean; acc: number; errors: number; livesLeft: number; progressPercent: number },
  comparison: ResultComparisonSummary | null,
  totalLives: number,
): ModeResultCalloutViewModel {
  if (result.passed && result.errors === 0) {
    return {
      title: variant === 'flawless'
        ? translate('survival.callouts.flawlessPerfect.title')
        : translate('survival.callouts.survivalNoLoss.title'),
      detail: variant === 'flawless'
        ? translate('survival.callouts.flawlessPerfect.detail')
        : translate('survival.callouts.survivalNoLoss.detail'),
    };
  }
  if (result.passed && result.livesLeft === 1) {
    return {
      title: translate('survival.callouts.edgeFinish.title'),
      detail: translate('survival.callouts.edgeFinish.detail'),
    };
  }
  if (!result.passed && variant === 'flawless') {
    if (result.progressPercent >= 75) {
      return {
        title: translate('survival.callouts.flawlessLate.title'),
        detail: translate('survival.callouts.flawlessLate.detail'),
      };
    }
    if (result.progressPercent <= 30) {
      return {
        title: translate('survival.callouts.flawlessStart.title'),
        detail: translate('survival.callouts.flawlessStart.detail'),
      };
    }
    return {
      title: translate('survival.callouts.flawlessMid.title'),
      detail: translate('survival.callouts.flawlessMid.detail'),
    };
  }
  if (!result.passed && variant === 'survival') {
    if (result.progressPercent >= 70) {
      return {
        title: translate('survival.callouts.survivalLate.title'),
        detail: translate('survival.callouts.survivalLate.detail'),
      };
    }
    if (result.acc < 93 || result.errors >= totalLives) {
      return {
        title: translate('survival.callouts.survivalStability.title'),
        detail: translate('survival.callouts.survivalStability.detail'),
      };
    }
  }
  if (comparison?.recentBestDelta?.tone === 'up' && comparison.recentBestDelta.speedDelta > 0) {
    return {
      title: translate('survival.callouts.improving.title'),
      detail: translate('survival.callouts.improving.detail'),
    };
  }
  return {
    title: translate('survival.callouts.neutral.title'),
    detail: variant === 'flawless'
      ? translate('survival.callouts.neutral.flawlessDetail')
      : translate('survival.callouts.neutral.survivalDetail'),
  };
}
