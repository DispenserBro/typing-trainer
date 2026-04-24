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
import { formatSpeed, speedLabel } from '../engine';
import { getRhythmScore } from '../practice/insights';
import {
  aggregateCharStats,
  findMatchingRhythmSession,
  formatAggregateMeta,
  formatBigramMeta,
  formatEntryModeLabel,
  formatScenarioLabel,
  formatSessionTooltipTimestamp,
  formatSessionTimestamp,
  getFingerLabel,
  getStatsLayoutScopeLabel,
  getStatsModeLabel,
  getStatsPeriodLabel,
  getRowLabel,
  getTrendSummary,
  getWorstKeysFromCharStats,
  isWithinPeriod,
  type ScopedHistoryEntry,
  type ScopedRhythmSession,
  type SessionHistoryItem,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from './utils';
import {
  buildStatsKeyboardHeatmapLabelsViewModel,
  type StatsKeyboardHeatmapLabelsViewModel,
} from './heatmapViewModel';
import {
  buildSelectedSessionViewModel,
  type StatsSessionSelectionViewModel,
} from './sessionSelectionViewModel';

export {
  buildStatsFilterBarViewModel,
  type StatsFilterBarGroupId,
  type StatsFilterBarGroupViewModel,
  type StatsFilterBarOptionViewModel,
} from './filterViewModel';
export {
  buildDisplayedRhythmSession,
  buildSelectedSessionViewModel,
  buildStatsSessionSelectionViewModel,
  getNextSelectedHistorySessionId,
  getPreferredHistorySession,
  getSelectedHistorySession,
  type StatsSessionSelectionViewModel,
} from './sessionSelectionViewModel';

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

export type StatsSummaryCardViewModel = {
  id: string;
  label: string;
  note: string;
  value: string;
  valueSmall?: boolean;
};

export type StatsSummaryTrendViewModel = {
  id: string;
  label: string;
  note: string;
  tone: string;
  value: string;
};

export type StatsSummaryCardsViewModel = {
  cards: StatsSummaryCardViewModel[];
  trendTitle: string;
  trends: StatsSummaryTrendViewModel[];
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

export type StatsSessionHistoryListItemViewModel = {
  id: string;
  modeLabel: string;
  timestampLabel: string;
  layoutLabel: string;
  contentLabel: string | null;
  speedLabel: string;
  accuracyLabel: string;
};

export type StatsSessionDetailMetricViewModel = {
  id: string;
  label: string;
  value: string;
};

export type StatsWorstKeyCardViewModel = {
  id: string;
  charLabel: string;
  errorLabel: string;
  timeLabel: string;
};

export type StatsRhythmMetricViewModel = {
  id: string;
  label: string;
  value: string;
};

export type StatsRhythmPanelViewModel = {
  averageLine: number[];
  averageLineLabel: string;
  data: number[];
  description: string;
  displayedRhythmSession: ScopedRhythmSession | null;
  emptyLabel: string;
  intervalLabel: string;
  labels: number[];
  summaryItems: StatsRhythmMetricViewModel[];
  title: string;
  unavailableLabel: string;
};

export type StatsSessionDetailViewModel = {
  hasSelection: boolean;
  keyboardHeatmapLabels: StatsKeyboardHeatmapLabelsViewModel;
  keyboardHeatmap: {
    keyStats: Record<string, CharStat>;
    layoutId: string;
  } | null;
  noCharStatsLabel: string;
  noKeyDataLabel: string;
  selectedWorstKeyCards: StatsWorstKeyCardViewModel[];
  selectPromptLabel: string;
  summaryItems: StatsSessionDetailMetricViewModel[];
  worstKeysTitle: string;
};

export type StatsSessionsViewModel = {
  description: string;
  detail: StatsSessionDetailViewModel;
  emptyLabel: string;
  hasHistory: boolean;
  historyDescription: string;
  historyItems: StatsSessionHistoryListItemViewModel[];
  historyTitle: string;
  rhythmPanel: StatsRhythmPanelViewModel;
  selectedHistorySessionId: string;
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

function buildScopedHistoryEntries(history: Record<string, HistoryEntry[]> | undefined): ScopedHistoryEntry[] {
  return Object.entries(history ?? {}).flatMap(([layoutId, entries]) =>
    (entries ?? []).map((entry, index) => ({
      id: `${layoutId}:${entry.date}:${entry.mode}:${index}`,
      layoutId,
      entry,
    })),
  );
}

function buildScopedRhythmSessions(history: Record<string, PracticeRhythmSessionEntry[]> | undefined): ScopedRhythmSession[] {
  return Object.entries(history ?? {}).flatMap(([layoutId, sessions]) =>
    (sessions ?? []).map(session => ({ layoutId, session })),
  );
}

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
  const allHistoryEntries = buildScopedHistoryEntries(progressHistory);
  const filteredHistoryEntries = allHistoryEntries.filter(({ layoutId, entry }) =>
    (layoutScope === 'all' || layoutId === currentLayout)
    && (statsMode === 'all' || entry.mode === statsMode)
    && isWithinPeriod(entry.date, statsPeriod),
  );
  const filteredHistory = filteredHistoryEntries.map(item => item.entry);
  const filteredCurrentLayoutHistory = filteredHistoryEntries
    .filter(item => item.layoutId === currentLayout)
    .map(item => item.entry);
  const keyStats = aggregateCharStats(filteredCurrentLayoutHistory);

  const allRhythmSessions = buildScopedRhythmSessions(practiceRhythmHistory);
  const rhythmSessions = statsMode !== 'all' && statsMode !== 'practice'
    ? []
    : allRhythmSessions.filter(({ layoutId, session }) =>
      (layoutScope === 'all' || layoutId === currentLayout)
      && isWithinPeriod(session.date, statsPeriod),
    );

  const filteredSessionHistory = filteredHistoryEntries
    .slice()
    .sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime())
    .map(item => ({
      ...item,
      rhythm: findMatchingRhythmSession(item, allRhythmSessions),
    }));

  const chartTimestamps = filteredHistory.map(entry => formatSessionTooltipTimestamp(entry.date, locale));
  const speedData = filteredHistory.map(entry => Number(formatSpeed(entry.wpm, unit)));
  const accData = filteredHistory.map(entry => entry.acc);

  const bestSpeedEntry = filteredHistory.reduce<HistoryEntry | null>((best, entry) => (
    !best || entry.wpm > best.wpm ? entry : best
  ), null);
  const bestAccuracyEntry = filteredHistory.reduce<HistoryEntry | null>((best, entry) => (
    !best || entry.acc > best.acc ? entry : best
  ), null);
  const bestRhythmSession = rhythmSessions.reduce<ScopedRhythmSession | null>((best, item) => (
    !best || item.session.rhythmScore > best.session.rhythmScore ? item : best
  ), null);
  const speedTrend = getTrendSummary(speedData, 2, 0, translate);
  const accuracyTrend = getTrendSummary(accData, 1, 1, translate);

  const summaryScopeLabel = [
    getStatsPeriodLabel(statsPeriod, translate),
    getStatsModeLabel(statsMode, translate),
    layoutScope === 'current' ? currentLayoutLabel : getStatsLayoutScopeLabel('all', translate),
  ].join(' · ');

  const worstKeys = Object.entries(keyStats)
    .map(([ch, stat]) => {
      const total = stat.hits + stat.misses;
      const errRate = total > 0 ? stat.misses / total : 0;
      const avgTime = stat.hits > 0 ? Math.round(stat.totalTime / stat.hits) : 0;
      return { ch, errRate, avgTime, total };
    })
    .filter(item => item.total >= 3)
    .sort((a, b) => (b.errRate * 100 + b.avgTime / 10) - (a.errRate * 100 + a.avgTime / 10))
    .slice(0, 5);

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

export function buildStatsSummaryCardsViewModel({
  locale,
  statsViewModel,
  translate,
  unit,
}: {
  locale: string;
  statsViewModel: ReturnType<typeof buildStatsPageViewModel>;
  translate: (key: string, params?: TranslationParams) => string;
  unit: SpeedUnit;
}): StatsSummaryCardsViewModel {
  return {
    cards: [
      {
        id: 'best-speed',
        label: translate('stats.summary.bestSpeed'),
        value: statsViewModel.bestSpeedEntry ? `${formatSpeed(statsViewModel.bestSpeedEntry.wpm, unit)} ${speedLabel(unit)}` : '—',
        note: statsViewModel.bestSpeedEntry
          ? `${formatEntryModeLabel(statsViewModel.bestSpeedEntry, translate)} · ${formatSessionTimestamp(statsViewModel.bestSpeedEntry.date, locale)}`
          : statsViewModel.summaryScopeLabel,
      },
      {
        id: 'best-accuracy',
        label: translate('stats.summary.bestAccuracy'),
        value: statsViewModel.bestAccuracyEntry ? `${Math.round(statsViewModel.bestAccuracyEntry.acc)}%` : '—',
        note: statsViewModel.bestAccuracyEntry
          ? `${formatEntryModeLabel(statsViewModel.bestAccuracyEntry, translate)} · ${formatSessionTimestamp(statsViewModel.bestAccuracyEntry.date, locale)}`
          : statsViewModel.summaryScopeLabel,
      },
      {
        id: 'best-rhythm',
        label: translate('stats.summary.bestRhythm'),
        value: statsViewModel.bestRhythmSession ? `${Math.round(statsViewModel.bestRhythmSession.session.rhythmScore)}%` : '—',
        note: statsViewModel.bestRhythmSession
          ? `${statsViewModel.bestRhythmSession.session.trainingMode === 'rhythm' ? translate('stats.trainingModes.rhythm') : translate('stats.trainingModes.normal')} · ${formatSessionTimestamp(statsViewModel.bestRhythmSession.session.date, locale)}`
          : translate('stats.summary.noRhythmData'),
      },
      {
        id: 'weakest-finger',
        label: translate('stats.summary.weakestFinger'),
        value: statsViewModel.weakestFingers[0] ? getFingerLabel(statsViewModel.weakestFingers[0].finger, translate) : '—',
        note: statsViewModel.weakestFingers[0]
          ? translate('stats.summary.weakestFingerNote', { errorRate: statsViewModel.weakestFingers[0].errorRate, avgMs: statsViewModel.weakestFingers[0].avgMs })
          : translate('stats.summary.notEnoughAnalytics'),
        valueSmall: true,
      },
      {
        id: 'weakest-row',
        label: translate('stats.summary.weakestRow'),
        value: statsViewModel.rowInsights[0] ? getRowLabel(statsViewModel.rowInsights[0].row, translate) : '—',
        note: statsViewModel.rowInsights[0]
          ? translate('stats.summary.weakestRowNote', { errorRate: statsViewModel.rowInsights[0].errorRate, avgMs: statsViewModel.rowInsights[0].avgMs })
          : translate('stats.summary.rowsBalanced'),
        valueSmall: true,
      },
    ],
    trendTitle: translate('stats.summary.trend'),
    trends: [
      {
        id: 'speed',
        label: translate('stats.summary.speed'),
        tone: statsViewModel.speedTrend.tone,
        value: statsViewModel.speedTrend.label,
        note: statsViewModel.filteredHistory.length >= 4 ? `${statsViewModel.speedTrend.formattedDelta} ${speedLabel(unit)}` : statsViewModel.summaryScopeLabel,
      },
      {
        id: 'accuracy',
        label: translate('stats.summary.accuracy'),
        tone: statsViewModel.accuracyTrend.tone,
        value: statsViewModel.accuracyTrend.label,
        note: statsViewModel.filteredHistory.length >= 4
          ? translate('stats.summary.accuracyTrendNote', { value: statsViewModel.accuracyTrend.formattedDelta })
          : statsViewModel.summaryScopeLabel,
      },
    ],
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

export function buildStatsSessionHistoryListViewModel({
  getLayoutLabel,
  items,
  locale,
  translate,
  unit,
}: {
  getLayoutLabel: (layoutId: string) => string;
  items: SessionHistoryItem[];
  locale: string;
  translate: (key: string, params?: TranslationParams) => string;
  unit: SpeedUnit;
}): StatsSessionHistoryListItemViewModel[] {
  return items.slice(0, 20).map((item) => {
    const scenarioLabel = item.entry.contentScenarioId
      ? formatScenarioLabel(item.entry.contentScenarioId, translate)
      : null;
    const trainingModeLabel = !scenarioLabel && item.entry.trainingMode
      ? (item.entry.trainingMode === 'rhythm'
          ? translate('stats.trainingModes.rhythm')
          : translate('stats.trainingModes.normal'))
      : null;

    return {
      id: item.id,
      modeLabel: formatEntryModeLabel(item.entry, translate),
      timestampLabel: formatSessionTimestamp(item.entry.date, locale),
      layoutLabel: getLayoutLabel(item.layoutId),
      contentLabel: scenarioLabel || trainingModeLabel,
      speedLabel: `${formatSpeed(item.entry.wpm, unit)} ${speedLabel(unit)}`,
      accuracyLabel: `${Math.round(item.entry.acc)}%`,
    };
  });
}

export function buildStatsSessionDetailSummaryViewModel({
  displayedRhythmSession,
  getLayoutLabel,
  selectedHistoryRhythm,
  selectedHistorySession,
  translate,
  unit,
}: {
  displayedRhythmSession: ScopedRhythmSession | null;
  getLayoutLabel: (layoutId: string) => string;
  selectedHistoryRhythm: ScopedRhythmSession | null;
  selectedHistorySession: SessionHistoryItem | null;
  translate: (key: string, params?: TranslationParams) => string;
  unit: SpeedUnit;
}): StatsSessionDetailMetricViewModel[] {
  if (!selectedHistorySession) return [];

  const metrics: StatsSessionDetailMetricViewModel[] = [
    {
      id: 'mode',
      label: translate('stats.sessions.detail.mode'),
      value: formatEntryModeLabel(selectedHistorySession.entry, translate),
    },
  ];

  if (selectedHistorySession.entry.contentScenarioId) {
    metrics.push({
      id: 'scenario',
      label: translate('stats.sessions.detail.scenario'),
      value: formatScenarioLabel(selectedHistorySession.entry.contentScenarioId, translate),
    });
  }

  metrics.push(
    {
      id: 'layout',
      label: translate('stats.sessions.detail.layout'),
      value: getLayoutLabel(selectedHistorySession.layoutId),
    },
    {
      id: 'speed',
      label: translate('stats.sessions.detail.speed'),
      value: `${formatSpeed(selectedHistorySession.entry.wpm, unit)} ${speedLabel(unit)}`,
    },
    {
      id: 'accuracy',
      label: translate('stats.sessions.detail.accuracy'),
      value: `${Math.round(selectedHistorySession.entry.acc)}%`,
    },
  );

  if (selectedHistoryRhythm && !displayedRhythmSession) {
    metrics.push(
      {
        id: 'rhythm',
        label: translate('stats.sessions.detail.rhythm'),
        value: `${Math.round(selectedHistoryRhythm.session.rhythmScore)}%`,
      },
      {
        id: 'worst-drop',
        label: translate('stats.sessions.detail.worstDrop'),
        value: translate('stats.common.msValue', { value: Math.round(selectedHistoryRhythm.session.worstInterval) }),
      },
    );
  }

  return metrics;
}

export function buildStatsWorstKeyCardsViewModel(
  worstKeys: Array<{ ch: string; errRate: number; avgTime: number }>,
  translate: (key: string, params?: TranslationParams) => string,
): StatsWorstKeyCardViewModel[] {
  return worstKeys.map(key => ({
    id: key.ch,
    charLabel: key.ch === ' ' ? '␣' : key.ch,
    errorLabel: translate('stats.keys.errorRateShort', { value: Math.round(key.errRate * 100) }),
    timeLabel: translate('stats.common.msValue', { value: key.avgTime }),
  }));
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

export function buildStatsRhythmMetricViewModel(
  displayedRhythmSession: ScopedRhythmSession | null,
  rhythmStableRun: number,
  rhythmWorstPoint: number,
  translate: (key: string, params?: TranslationParams) => string,
): StatsRhythmMetricViewModel[] {
  if (!displayedRhythmSession) return [];

  return [
    {
      id: 'score',
      label: translate('stats.sessions.rhythm.score'),
      value: `${Math.round(displayedRhythmSession.session.rhythmScore)}%`,
    },
    {
      id: 'avg-interval',
      label: translate('stats.sessions.rhythm.avgInterval'),
      value: translate('stats.common.msValue', { value: Math.round(displayedRhythmSession.session.averageInterval) }),
    },
    {
      id: 'avg-deviation',
      label: translate('stats.sessions.rhythm.avgDeviation'),
      value: translate('stats.common.msValue', { value: Math.round(displayedRhythmSession.session.averageDeviation) }),
    },
    {
      id: 'worst-drop',
      label: translate('stats.sessions.rhythm.worstDrop'),
      value: translate('stats.common.msValue', { value: Math.round(rhythmWorstPoint) }),
    },
    {
      id: 'stable-run',
      label: translate('stats.sessions.rhythm.bestStableRun'),
      value: translate('stats.sessions.rhythm.symbolsValue', { value: rhythmStableRun }),
    },
    {
      id: 'session',
      label: translate('stats.sessions.rhythm.session'),
      value: translate('stats.sessions.rhythm.sessionValue', {
        characters: displayedRhythmSession.session.textLength,
        accuracy: Math.round(displayedRhythmSession.session.acc),
      }),
    },
  ];
}

export function buildStatsRhythmPanelViewModel(
  selectedSessionViewModel: ReturnType<typeof buildSelectedSessionViewModel>,
  translate: (key: string, params?: TranslationParams) => string,
): StatsRhythmPanelViewModel {
  return {
    averageLine: selectedSessionViewModel.rhythmAverageLine,
    averageLineLabel: translate('stats.charts.averageInterval'),
    data: selectedSessionViewModel.rhythmData,
    description: translate('stats.sessions.rhythm.description'),
    displayedRhythmSession: selectedSessionViewModel.displayedRhythmSession,
    emptyLabel: translate('stats.sessions.rhythm.empty'),
    intervalLabel: translate('stats.charts.interval'),
    labels: selectedSessionViewModel.rhythmLabels,
    summaryItems: buildStatsRhythmMetricViewModel(
      selectedSessionViewModel.displayedRhythmSession,
      selectedSessionViewModel.rhythmStableRun,
      selectedSessionViewModel.rhythmWorstPoint,
      translate,
    ),
    title: translate('stats.sessions.rhythm.title'),
    unavailableLabel: translate('stats.charts.rhythmUnavailable'),
  };
}

export function buildStatsSessionsViewModel({
  getLayoutLabel,
  locale,
  sessionSelection,
  statsViewModel,
  translate,
  unit,
}: {
  getLayoutLabel: (layoutId: string) => string;
  locale: string;
  sessionSelection: StatsSessionSelectionViewModel;
  statsViewModel: ReturnType<typeof buildStatsPageViewModel>;
  translate: (key: string, params?: TranslationParams) => string;
  unit: SpeedUnit;
}): StatsSessionsViewModel {
  const selectedSessionViewModel = sessionSelection.selectedSessionViewModel;
  const selectedHistorySession = sessionSelection.selectedHistorySession;

  return {
    description: translate('stats.sessions.description'),
    detail: {
      hasSelection: Boolean(selectedHistorySession),
      keyboardHeatmapLabels: buildStatsKeyboardHeatmapLabelsViewModel({
        descriptionKey: 'stats.sessions.detail.heatmapDescription',
        titleKey: 'stats.sessions.detail.heatmapTitle',
        translate,
      }),
      keyboardHeatmap: selectedHistorySession?.entry.charStats
        ? {
            keyStats: selectedHistorySession.entry.charStats,
            layoutId: selectedHistorySession.layoutId,
          }
        : null,
      noCharStatsLabel: translate('stats.sessions.detail.noCharStats'),
      noKeyDataLabel: translate('stats.sessions.detail.noKeyData'),
      selectedWorstKeyCards: buildStatsWorstKeyCardsViewModel(
        selectedSessionViewModel.selectedHistoryWorstKeys,
        translate,
      ),
      selectPromptLabel: translate('stats.sessions.selectPrompt'),
      summaryItems: buildStatsSessionDetailSummaryViewModel({
        displayedRhythmSession: selectedSessionViewModel.displayedRhythmSession,
        getLayoutLabel,
        selectedHistoryRhythm: selectedSessionViewModel.selectedHistoryRhythm,
        selectedHistorySession,
        translate,
        unit,
      }),
      worstKeysTitle: translate('stats.sessions.detail.worstKeys'),
    },
    emptyLabel: translate('stats.sessions.empty'),
    hasHistory: statsViewModel.filteredSessionHistory.length > 0,
    historyDescription: translate('stats.sessions.historyDescription'),
    historyItems: buildStatsSessionHistoryListViewModel({
      getLayoutLabel,
      items: statsViewModel.filteredSessionHistory,
      locale,
      translate,
      unit,
    }),
    historyTitle: translate('stats.sessions.historyTitle'),
    rhythmPanel: buildStatsRhythmPanelViewModel(selectedSessionViewModel, translate),
    selectedHistorySessionId: selectedHistorySession?.id ?? '',
    title: translate('stats.sessions.title'),
  };
}
