import type {
  TranslationParams,
} from '../../../shared/types';
import {
  getChallengeModeConfig,
  getChallengeTotalLives,
  type ChallengeModeConfig,
} from '../../../core/practice/modeCompletion';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type ChallengeModeUi = {
  description: string;
  failureTitle: string;
  startLabel: string;
  successTitle: string;
  title: string;
  toggleDescription: string;
};

export {
  getChallengeModeConfig,
  getChallengeTotalLives,
  type ChallengeModeConfig,
};

export function buildChallengeModeUi(t: TranslateFn, variant: ChallengeModeConfig['variant']): ChallengeModeUi {
  if (variant === 'flawless') {
    return {
      title: t('survival.title'),
      description: t('survival.flawlessDescription'),
      toggleDescription: t('survival.flawlessToggleDescription'),
      startLabel: t('survival.start'),
      successTitle: t('survival.flawlessSuccessTitle'),
      failureTitle: t('survival.flawlessFailureTitle'),
    };
  }

  return {
    title: t('survival.title'),
    description: t('survival.description'),
    toggleDescription: t('survival.toggleDescription'),
    startLabel: t('survival.start'),
    successTitle: t('survival.successTitle'),
    failureTitle: t('survival.failureTitle'),
  };
}

export function buildChallengeModeStatusLabel(
  t: TranslateFn,
  config: ChallengeModeConfig,
  lives: number,
) {
  if (config.variant === 'flawless') {
    return t('survival.flawlessStatus', { lives });
  }

  return t('survival.survivalStatus', {
    errors: config.allowedErrors,
    lives,
  });
}
