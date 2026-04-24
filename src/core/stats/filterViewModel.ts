import type { TranslationParams } from '../../shared/types';
import {
  LAYOUT_SCOPE_OPTIONS,
  MODE_OPTIONS,
  PERIOD_OPTIONS,
  getStatsLayoutScopeLabel,
  getStatsModeLabel,
  getStatsPeriodLabel,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from './utils';

type Translate = (key: string, params?: TranslationParams) => string;

export type StatsFilterBarGroupId = 'period' | 'mode' | 'scope';

export type StatsFilterBarOptionViewModel = {
  active: boolean;
  label: string;
  value: string;
};

export type StatsFilterBarGroupViewModel = {
  id: StatsFilterBarGroupId;
  label: string;
  options: StatsFilterBarOptionViewModel[];
};

export function buildStatsFilterBarViewModel({
  layoutScope,
  statsMode,
  statsPeriod,
  translate,
}: {
  layoutScope: StatsLayoutScope;
  statsMode: StatsModeFilter;
  statsPeriod: StatsPeriod;
  translate: Translate;
}): StatsFilterBarGroupViewModel[] {
  return [
    {
      id: 'period',
      label: translate('stats.filters.period'),
      options: PERIOD_OPTIONS.map(option => ({
        active: statsPeriod === option,
        label: getStatsPeriodLabel(option, translate),
        value: option,
      })),
    },
    {
      id: 'mode',
      label: translate('stats.filters.mode'),
      options: MODE_OPTIONS.map(option => ({
        active: statsMode === option,
        label: getStatsModeLabel(option, translate),
        value: option,
      })),
    },
    {
      id: 'scope',
      label: translate('stats.filters.scope'),
      options: LAYOUT_SCOPE_OPTIONS.map(option => ({
        active: layoutScope === option,
        label: getStatsLayoutScopeLabel(option, translate),
        value: option,
      })),
    },
  ];
}
