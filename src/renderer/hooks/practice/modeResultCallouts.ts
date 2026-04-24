import type { TranslationParams } from '../../../shared/types';
import type { ResultComparisonSummary } from '../../../core/motivation/records';

type TranslateFn = (key: string, options?: TranslationParams) => string;

type ResultCallout = {
  title: string;
  detail: string;
};

export function buildSprintResultCallout(
  t: TranslateFn,
  result: { wpm: number; acc: number; errors: number },
  comparison: ResultComparisonSummary | null,
): ResultCallout {
  if (comparison?.recentBestDelta?.tone === 'up' && comparison.recentBestDelta.speedDelta > 0 && comparison.recentBestDelta.accuracyDelta >= 0) {
    return {
      title: t('sprint.callouts.improved.title'),
      detail: t('sprint.callouts.improved.detail'),
    };
  }
  if (result.errors === 0 && result.acc >= 98) {
    return {
      title: t('sprint.callouts.clean.title'),
      detail: t('sprint.callouts.clean.detail'),
    };
  }
  if (result.acc < 92 || result.errors >= 6) {
    return {
      title: t('sprint.callouts.errors.title'),
      detail: t('sprint.callouts.errors.detail'),
    };
  }
  if (comparison?.previousDelta?.tone === 'down') {
    return {
      title: t('sprint.callouts.belowPrevious.title'),
      detail: t('sprint.callouts.belowPrevious.detail'),
    };
  }
  return {
    title: t('sprint.callouts.steady.title'),
    detail: t('sprint.callouts.steady.detail'),
  };
}

export function buildChallengeResultCallout(
  t: TranslateFn,
  variant: 'survival' | 'flawless',
  result: { passed: boolean; acc: number; errors: number; livesLeft: number; progressPercent: number },
  comparison: ResultComparisonSummary | null,
  totalLives: number,
): ResultCallout {
  if (result.passed && result.errors === 0) {
    return {
      title: variant === 'flawless'
        ? t('survival.callouts.flawlessPerfect.title')
        : t('survival.callouts.survivalNoLoss.title'),
      detail: variant === 'flawless'
        ? t('survival.callouts.flawlessPerfect.detail')
        : t('survival.callouts.survivalNoLoss.detail'),
    };
  }
  if (result.passed && result.livesLeft === 1) {
    return {
      title: t('survival.callouts.edgeFinish.title'),
      detail: t('survival.callouts.edgeFinish.detail'),
    };
  }
  if (!result.passed && variant === 'flawless') {
    if (result.progressPercent >= 75) {
      return {
        title: t('survival.callouts.flawlessLate.title'),
        detail: t('survival.callouts.flawlessLate.detail'),
      };
    }
    if (result.progressPercent <= 30) {
      return {
        title: t('survival.callouts.flawlessStart.title'),
        detail: t('survival.callouts.flawlessStart.detail'),
      };
    }
    return {
      title: t('survival.callouts.flawlessMid.title'),
      detail: t('survival.callouts.flawlessMid.detail'),
    };
  }
  if (!result.passed && variant === 'survival') {
    if (result.progressPercent >= 70) {
      return {
        title: t('survival.callouts.survivalLate.title'),
        detail: t('survival.callouts.survivalLate.detail'),
      };
    }
    if (result.acc < 93 || result.errors >= totalLives) {
      return {
        title: t('survival.callouts.survivalStability.title'),
        detail: t('survival.callouts.survivalStability.detail'),
      };
    }
  }
  if (comparison?.recentBestDelta?.tone === 'up' && comparison.recentBestDelta.speedDelta > 0) {
    return {
      title: t('survival.callouts.improving.title'),
      detail: t('survival.callouts.improving.detail'),
    };
  }
  return {
    title: t('survival.callouts.neutral.title'),
    detail: variant === 'flawless'
      ? t('survival.callouts.neutral.flawlessDetail')
      : t('survival.callouts.neutral.survivalDetail'),
  };
}
