import type {
  CharStat,
  HistoryEntry,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeInsightsState,
  PracticeRhythmSessionEntry,
  SpeedUnit,
  TranslationParams,
} from '../../shared/types';
import { speedLabel } from '../engine';
import { getRhythmScore } from '../practice/insights';
import {
  formatAggregateMeta,
  formatBigramMeta,
  getFingerLabel,
  getRowLabel,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from './utils';
import { buildStatsHistoryScopeModel } from './historyScope';
import {
  buildStatsKeyboardHeatmapLabelsViewModel,
  type StatsKeyboardHeatmapLabelsViewModel,
} from './heatmapViewModel';
import {
  buildStatsWorstKeyCardsViewModel,
  type StatsWorstKeyCardViewModel,
} from './sessionsViewModel';

export {
  buildStatsFilterBarViewModel,
  type StatsFilterBarGroupId,
  type StatsFilterBarGroupViewModel,
  type StatsFilterBarOptionViewModel,
} from './filterViewModel';
export {
  buildStatsSummaryCardsViewModel,
  type StatsSummaryCardViewModel,
  type StatsSummaryCardsViewModel,
  type StatsSummaryTrendViewModel,
} from './summaryCards';
export {
  buildDisplayedRhythmSession,
  buildSelectedSessionViewModel,
  buildStatsSessionSelectionViewModel,
  getNextSelectedHistorySessionId,
  getPreferredHistorySession,
  getSelectedHistorySession,
  type StatsSessionSelectionViewModel,
} from './sessionSelectionViewModel';
export {
  buildStatsRhythmMetricViewModel,
  buildStatsRhythmPanelViewModel,
  buildStatsSessionDetailSummaryViewModel,
  buildStatsSessionHistoryListViewModel,
  buildStatsSessionsViewModel,
  buildStatsWorstKeyCardsViewModel,
  type StatsRhythmMetricViewModel,
  type StatsRhythmPanelViewModel,
  type StatsSessionDetailMetricViewModel,
  type StatsSessionDetailViewModel,
  type StatsSessionHistoryListItemViewModel,
  type StatsSessionsViewModel,
  type StatsWorstKeyCardViewModel,
} from './sessionsViewModel';

type BuildStatsPageViewModelArgs = {
  allChars: string[];
  currentLayout: string;
  currentLayoutLabel: string;
  layoutInsights?: PracticeInsightsState['byLayout'][string];
  layoutScope: StatsLayoutScope;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]> | undefined;
  progressHistory: Record<string, HistoryEntry[]> | undefined;
  statsMode: StatsModeFilter;
  statsPeriod: StatsPeriod;
  translate: (key: string, params?: TranslationParams) => string;
  locale: string;
  unit: SpeedUnit;
};

export type StatsOverallProgressViewModel = {
  accData: number[];
  accuracyTitle: string;
  accuracyValueLabel: string;
  chartTimestamps: string[];
  chartEmptyLabel: string;
  description: string;
  speedData: number[];
  speedTitle: string;
  speedValueLabel: string;
  title: string;
};

export type StatsInsightListItemViewModel = {
  id: string;
  reasonLabel: string;
  scoreLabel: string;
  tokenLabel: string;
  tokenMono?: boolean;
};

export type StatsRhythmInsightViewModel = {
  metaLabels: string[];
  scoreLabel: string;
  scoreTitle: string;
} | null;

export type StatsInsightListViewModel = {
  emptyLabel: string;
  items: StatsInsightListItemViewModel[];
  subtitle: string;
  title: string;
};

export type StatsInsightZoneGroupViewModel = {
  emptyLabel: string;
  id: string;
  items: StatsInsightListItemViewModel[];
  title: string;
};

export type StatsInsightZonesViewModel = {
  groups: StatsInsightZoneGroupViewModel[];
  subtitle: string;
  title: string;
};

export type StatsRhythmInsightCardViewModel = {
  emptyLabel: string;
  insight: StatsRhythmInsightViewModel;
  subtitle: string;
  title: string;
};

export type StatsInsightsViewModel = {
  description: string;
  hasInsights: boolean;
  notEnoughDataLabel: string;
  rhythm: StatsRhythmInsightCardViewModel;
  title: string;
  weakBigrams: StatsInsightListViewModel;
  weakChars: StatsInsightListViewModel;
  zones: StatsInsightZonesViewModel;
};

export type StatsKeyHeatmapEntryViewModel = {
  avg: number;
  bg: string;
  ch: string;
  titleLabel: string;
};

export type StatsKeysViewModel = {
  currentLayout: string;
  description: string;
  heatmap: StatsKeyHeatmapEntryViewModel[];
  keyboardHeatmapLabels: StatsKeyboardHeatmapLabelsViewModel;
  keyStats: Record<string, CharStat>;
  speedByKeyTitle: string;
  title: string;
  worstKeysEmptyLabel: string;
  worstKeysTitle: string;
  worstKeyCards: StatsWorstKeyCardViewModel[];
};

function buildHeatmap(
  allChars: string[],
  keyStats: Record<string, CharStat>,
  translate: (key: string, params?: TranslationParams) => string,
): StatsKeyHeatmapEntryViewModel[] {
  let minTime = Infinity;
  let maxTime = 0;

  for (const char of allChars) {
    const stat = keyStats[char];
    if (stat && stat.hits > 0) {
      const avg = stat.totalTime / stat.hits;
      if (avg < minTime) minTime = avg;
      if (avg > maxTime) maxTime = avg;
    }
  }

  if (minTime === Infinity) minTime = 0;
  if (maxTime === 0) maxTime = 1;

  return allChars.map(char => {
    const stat = keyStats[char];
    const avg = stat && stat.hits > 0 ? Math.round(stat.totalTime / stat.hits) : 0;
    const ratio = maxTime > minTime ? (avg - minTime) / (maxTime - minTime) : 0;
    const red = Math.round(ratio * 255);
    const green = Math.round((1 - ratio) * 200);
    return {
      ch: char,
      avg,
      bg: avg > 0 ? `rgba(${red},${green},60,0.7)` : 'var(--surface2)',
      titleLabel: translate('stats.keys.keyTimeTitle', { key: char, value: avg }),
    };
  });
}

function buildWeakestChars(layoutInsights?: PracticeInsightsState['byLayout'][string]) {
  if (!layoutInsights) return [];
  return Object.entries(layoutInsights.chars)
    .map(([char, entry]) => ({ char, entry, ...formatAggregateMeta(entry) }))
    .filter(item => item.char !== ' ' && item.attempts >= 4 && item.entry.weakness > 0)
    .sort((a, b) => b.entry.weakness - a.entry.weakness)
    .slice(0, 5);
}

function buildWeakestBigrams(layoutInsights?: PracticeInsightsState['byLayout'][string]) {
  if (!layoutInsights) return [];
  return Object.entries(layoutInsights.bigrams)
    .map(([bigram, entry]) => ({ bigram, entry, ...formatBigramMeta(entry as PracticeBigramInsight) }))
    .filter(item => !item.bigram.includes(' ') && item.attempts >= 3 && item.entry.weakness > 0)
    .sort((a, b) => b.entry.weakness - a.entry.weakness)
    .slice(0, 5);
}

function buildWeakestFingers(layoutInsights?: PracticeInsightsState['byLayout'][string]) {
  if (!layoutInsights) return [];
  return Object.entries(layoutInsights.fingers)
    .filter((entry): entry is [keyof typeof layoutInsights.fingers, PracticeInsightAggregate] => Boolean(entry[1]))
    .map(([finger, entry]) => ({ finger, entry, ...formatAggregateMeta(entry) }))
    .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
    .sort((a, b) => b.entry.weakness - a.entry.weakness)
    .slice(0, 4);
}

function buildRowInsights(layoutInsights?: PracticeInsightsState['byLayout'][string]) {
  if (!layoutInsights) return [];
  return (Object.entries(layoutInsights.rows) as Array<['top' | 'middle' | 'bottom', PracticeInsightAggregate]>)
    .map(([row, entry]) => ({ row, entry, ...formatAggregateMeta(entry) }))
    .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
    .sort((a, b) => b.entry.weakness - a.entry.weakness);
}

function buildRhythmInsight(layoutInsights?: PracticeInsightsState['byLayout'][string]) {
  if (!layoutInsights || layoutInsights.rhythm.samples <= 0) return null;
  return {
    score: getRhythmScore(layoutInsights.rhythm),
    avgInterval: Math.round(layoutInsights.rhythm.averageInterval),
    avgDeviation: Math.round(layoutInsights.rhythm.averageDeviation),
    samples: layoutInsights.rhythm.samples,
  };
}

export function buildStatsPageViewModel({
  allChars,
  currentLayout,
  currentLayoutLabel,
  layoutInsights,
  layoutScope,
  locale,
  practiceRhythmHistory,
  progressHistory,
  statsMode,
  statsPeriod,
  translate,
  unit,
}: BuildStatsPageViewModelArgs) {
  const historyScope = buildStatsHistoryScopeModel({
    currentLayout,
    currentLayoutLabel,
    layoutScope,
    locale,
    practiceRhythmHistory,
    progressHistory,
    statsMode,
    statsPeriod,
    translate,
    unit,
  });
  const {
    accData,
    allRhythmSessions,
    bestAccuracyEntry,
    bestRhythmSession,
    bestSpeedEntry,
    chartTimestamps,
    filteredHistory,
    filteredSessionHistory,
    keyStats,
    rhythmSessions,
    speedData,
    speedTrend,
    summaryScopeLabel,
    accuracyTrend,
    worstKeys,
  } = historyScope;

  const weakestChars = buildWeakestChars(layoutInsights);
  const weakestBigrams = buildWeakestBigrams(layoutInsights);
  const weakestFingers = buildWeakestFingers(layoutInsights);
  const rowInsights = buildRowInsights(layoutInsights);
  const rhythmInsight = buildRhythmInsight(layoutInsights);

  return {
    accData,
    allRhythmSessions,
    bestAccuracyEntry,
    bestRhythmSession,
    bestSpeedEntry,
    chartTimestamps,
    filteredHistory,
    filteredSessionHistory,
    hasInsights: Boolean(
      layoutInsights
      && (weakestChars.length || weakestBigrams.length || weakestFingers.length || rowInsights.length || rhythmInsight),
    ),
    heatmap: buildHeatmap(allChars, keyStats, translate),
    keyStats,
    rhythmInsight,
    rhythmSessions,
    rowInsights,
    speedData,
    speedTrend,
    summaryScopeLabel,
    weakestBigrams,
    weakestChars,
    weakestFingers,
    worstKeys,
    accuracyTrend,
    locale,
    translate,
  };
}

export function buildStatsOverallProgressViewModel({
  statsViewModel,
  translate,
  unit,
}: {
  statsViewModel: ReturnType<typeof buildStatsPageViewModel>;
  translate: (key: string, params?: TranslationParams) => string;
  unit: SpeedUnit;
}): StatsOverallProgressViewModel {
  return {
    accData: statsViewModel.accData,
    accuracyTitle: translate('stats.overallProgress.accuracyTitle'),
    accuracyValueLabel: translate('stats.overallProgress.accuracyValueLabel'),
    chartEmptyLabel: translate('stats.empty.chart'),
    chartTimestamps: statsViewModel.chartTimestamps,
    description: translate('stats.overallProgress.description'),
    speedData: statsViewModel.speedData,
    speedTitle: translate('stats.overallProgress.speedTitle'),
    speedValueLabel: speedLabel(unit),
    title: translate('stats.overallProgress.title'),
  };
}

export function buildStatsInsightsViewModel({
  statsViewModel,
  translate,
}: {
  statsViewModel: ReturnType<typeof buildStatsPageViewModel>;
  translate: (key: string, params?: TranslationParams) => string;
}): StatsInsightsViewModel {
  return {
    description: translate('stats.insights.description'),
    hasInsights: statsViewModel.hasInsights,
    notEnoughDataLabel: translate('stats.insights.notEnoughData'),
    rhythm: {
      emptyLabel: translate('stats.insights.rhythm.empty'),
      insight: statsViewModel.rhythmInsight
        ? {
            scoreLabel: `${Math.round(statsViewModel.rhythmInsight.score)}%`,
            scoreTitle: translate('stats.insights.rhythm.score'),
            metaLabels: [
              translate('stats.insights.rhythm.avgInterval', { value: statsViewModel.rhythmInsight.avgInterval }),
              translate('stats.insights.rhythm.avgDeviation', { value: statsViewModel.rhythmInsight.avgDeviation }),
              translate('stats.insights.rhythm.samples', { value: statsViewModel.rhythmInsight.samples }),
            ],
          }
        : null,
      subtitle: translate('stats.insights.rhythm.subtitle'),
      title: translate('stats.insights.rhythm.title'),
    },
    title: translate('stats.insights.title'),
    weakBigrams: {
      emptyLabel: translate('stats.insights.weakBigrams.empty'),
      items: statsViewModel.weakestBigrams.map(item => ({
        id: item.bigram,
        reasonLabel: translate('stats.insights.bigramMetricLine', { errorRate: item.errorRate, avgMs: item.avgMs }),
        scoreLabel: Math.round(item.entry.weakness).toString(),
        tokenLabel: item.bigram.toUpperCase(),
        tokenMono: true,
      })),
      subtitle: translate('stats.insights.weakBigrams.subtitle'),
      title: translate('stats.insights.weakBigrams.title'),
    },
    weakChars: {
      emptyLabel: translate('stats.insights.weakChars.empty'),
      items: statsViewModel.weakestChars.map(item => ({
        id: item.char,
        reasonLabel: translate('stats.insights.metricLine', { errorRate: item.errorRate, avgMs: item.avgMs }),
        scoreLabel: Math.round(item.entry.weakness).toString(),
        tokenLabel: item.char.toUpperCase(),
        tokenMono: true,
      })),
      subtitle: translate('stats.insights.weakChars.subtitle'),
      title: translate('stats.insights.weakChars.title'),
    },
    zones: {
      groups: [
        {
          emptyLabel: translate('stats.insights.zones.fingersEmpty'),
          id: 'fingers',
          items: statsViewModel.weakestFingers.map(item => ({
            id: item.finger,
            reasonLabel: translate('stats.insights.metricLine', { errorRate: item.errorRate, avgMs: item.avgMs }),
            scoreLabel: Math.round(item.entry.weakness).toString(),
            tokenLabel: getFingerLabel(item.finger, translate),
          })),
          title: translate('stats.insights.zones.fingers'),
        },
        {
          emptyLabel: translate('stats.insights.zones.rowsEmpty'),
          id: 'rows',
          items: statsViewModel.rowInsights.map(item => ({
            id: item.row,
            reasonLabel: translate('stats.insights.metricLine', { errorRate: item.errorRate, avgMs: item.avgMs }),
            scoreLabel: Math.round(item.entry.weakness).toString(),
            tokenLabel: getRowLabel(item.row, translate),
          })),
          title: translate('stats.insights.zones.rows'),
        },
      ],
      subtitle: translate('stats.insights.zones.subtitle'),
      title: translate('stats.insights.zones.title'),
    },
  };
}

export function buildStatsKeysViewModel({
  currentLayout,
  statsViewModel,
  translate,
}: {
  currentLayout: string;
  statsViewModel: ReturnType<typeof buildStatsPageViewModel>;
  translate: (key: string, params?: TranslationParams) => string;
}): StatsKeysViewModel {
  return {
    currentLayout,
    description: translate('stats.keys.description'),
    heatmap: statsViewModel.heatmap,
    keyboardHeatmapLabels: buildStatsKeyboardHeatmapLabelsViewModel({ translate }),
    keyStats: statsViewModel.keyStats,
    speedByKeyTitle: translate('stats.keys.speedByKey'),
    title: translate('stats.keys.title'),
    worstKeysEmptyLabel: translate('stats.empty.noDataYet'),
    worstKeysTitle: translate('stats.keys.worstKeys'),
    worstKeyCards: buildStatsWorstKeyCardsViewModel(statsViewModel.worstKeys, translate),
  };
}
