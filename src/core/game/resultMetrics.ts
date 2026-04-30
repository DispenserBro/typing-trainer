import type { GameRunResult, TranslationParams } from '../../shared/types';
import type { ResultMetricItemViewModel } from '../result/metricStrip';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export function buildGameResultMetricItems(
  result: GameRunResult,
  translate: TranslateFn,
): ResultMetricItemViewModel[] {
  return [
    {
      id: 'accuracy',
      label: `${translate('common.accuracy')} / ${result.minAccuracy}%+`,
      value: `${Math.round(result.acc)}%`,
      tone: result.acc >= result.minAccuracy ? 'good' : 'bad',
    },
    ...(result.isBoss && result.timeLimitSeconds
      ? [{
          id: 'time',
          label: `${translate('common.time')} / ${result.timeLimitSeconds.toFixed(1)} ${translate('common.secondsShort')}`,
          value: `${result.elapsed.toFixed(1)} ${translate('common.secondsShort')}`,
          tone: result.elapsed <= result.timeLimitSeconds ? 'good' as const : 'bad' as const,
        }]
      : []),
    ...(result.rhythmDeviation != null && result.maxRhythmDeviation != null
      ? [{
          id: 'rhythm',
          label: translate('game.result.rhythm'),
          value: `${Math.round(result.rhythmDeviation)} / ${result.maxRhythmDeviation} ${translate('game.result.msShort')}`,
          tone: result.rhythmDeviation <= result.maxRhythmDeviation ? 'good' as const : 'bad' as const,
        }]
      : []),
    ...(result.maxErrors != null && result.maxErrors > 0
      ? [{
          id: 'flawless-limit',
          label: translate('game.result.flawlessLimit'),
          value: result.maxErrors,
        }]
      : []),
  ];
}
