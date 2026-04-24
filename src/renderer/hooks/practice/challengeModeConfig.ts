import type {
  PracticeContentScenarioId,
  TranslationParams,
} from '../../../shared/types';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type ChallengeModeConfig = {
  modeId: 'survival';
  variant: 'survival' | 'flawless';
  scenarioId: PracticeContentScenarioId;
  allowedErrors: number;
  wordMultiplier: number;
};

export type ChallengeModeUi = {
  description: string;
  failureTitle: string;
  startLabel: string;
  successTitle: string;
  title: string;
  toggleDescription: string;
};

const SURVIVAL_CHALLENGE_CONFIG: ChallengeModeConfig = {
  modeId: 'survival',
  variant: 'survival',
  scenarioId: 'survival',
  allowedErrors: 2,
  wordMultiplier: 2.1,
};

const FLAWLESS_CHALLENGE_CONFIG: ChallengeModeConfig = {
  modeId: 'survival',
  variant: 'flawless',
  scenarioId: 'flawless',
  allowedErrors: 0,
  wordMultiplier: 1.5,
};

export function getChallengeModeConfig(flawlessEnabled: boolean): ChallengeModeConfig {
  return flawlessEnabled ? FLAWLESS_CHALLENGE_CONFIG : SURVIVAL_CHALLENGE_CONFIG;
}

export function getChallengeTotalLives(config: ChallengeModeConfig) {
  return config.allowedErrors + 1;
}

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
