import type { TranslationParams } from '../../shared/types';

type TranslateFn = (key: string, options?: TranslationParams) => string;

export type ModeResultPrimaryMetricViewModel = {
  id: string;
  value: string | number;
  label: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
};

export type SprintResultMetricInput = {
  chars: number;
  elapsed: number;
  errors: number;
};

export type ChallengeResultMetricInput = {
  chars: number;
  errors: number;
  livesLeft: number;
  passed: boolean;
};

export function buildSprintResultPrimaryMetrics(
  result: SprintResultMetricInput,
  translate: TranslateFn,
): ModeResultPrimaryMetricViewModel[] {
  return [
    {
      id: 'chars',
      value: result.chars,
      label: translate('common.characters'),
    },
    {
      id: 'errors',
      value: result.errors,
      label: translate('common.errors'),
      tone: result.errors === 0 ? 'good' : result.errors <= 3 ? 'warn' : 'bad',
    },
    {
      id: 'duration',
      value: `${Math.max(1, Math.round(result.elapsed))} ${translate('common.secondsShort')}`,
      label: translate('sprint.duration'),
    },
  ];
}

export function buildChallengeResultPrimaryMetrics(args: {
  allowedErrors: number;
  attemptReserveLabel: string;
  livesLeftLabel: string;
  result: ChallengeResultMetricInput;
  translate: TranslateFn;
}): ModeResultPrimaryMetricViewModel[] {
  const {
    allowedErrors,
    attemptReserveLabel,
    livesLeftLabel,
    result,
    translate,
  } = args;

  return [
    {
      id: 'lives',
      value: result.livesLeft,
      label: allowedErrors === 0 ? attemptReserveLabel : livesLeftLabel,
      tone: result.passed ? 'good' : result.livesLeft > 0 ? 'warn' : 'bad',
    },
    {
      id: 'errors',
      value: result.errors,
      label: translate('common.errors'),
      tone: result.errors === 0 ? 'good' : result.errors <= allowedErrors ? 'warn' : 'bad',
    },
    {
      id: 'chars',
      value: result.chars,
      label: translate('common.characters'),
    },
  ];
}
