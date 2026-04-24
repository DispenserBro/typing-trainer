import type { TranslationParams } from '../../shared/types';
import { getRowLabel } from './utils';

type Translate = (key: string, params?: TranslationParams) => string;

export type StatsKeyboardHeatmapLabelsViewModel = {
  title: string;
  description: string;
  empty: string;
  controls: {
    ariaLabel: string;
    errors: string;
    slow: string;
  };
  legend: {
    less: string;
    more: string;
  };
  rowLabels: {
    top: string;
    middle: string;
    bottom: string;
  };
  keyTitles: {
    errors: (key: string, value: number) => string;
    slow: (key: string, value: number) => string;
  };
};

export function buildStatsKeyboardHeatmapLabelsViewModel({
  descriptionKey = 'stats.heatmap.description',
  titleKey = 'stats.heatmap.title',
  translate,
}: {
  descriptionKey?: string;
  titleKey?: string;
  translate: Translate;
}): StatsKeyboardHeatmapLabelsViewModel {
  return {
    title: translate(titleKey),
    description: translate(descriptionKey),
    empty: translate('stats.heatmap.empty'),
    controls: {
      ariaLabel: translate('stats.heatmap.controlsAria'),
      errors: translate('stats.heatmap.errors'),
      slow: translate('stats.heatmap.slow'),
    },
    legend: {
      less: translate('stats.heatmap.less'),
      more: translate('stats.heatmap.more'),
    },
    rowLabels: {
      top: getRowLabel('top', translate),
      middle: getRowLabel('middle', translate),
      bottom: getRowLabel('bottom', translate),
    },
    keyTitles: {
      errors: (key, value) => translate('stats.heatmap.errorTitle', { key, value }),
      slow: (key, value) => translate('stats.heatmap.slowTitle', { key, value }),
    },
  };
}
