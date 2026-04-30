import type {
  CharStat,
  SpeedUnit,
  TranslationParams,
} from '../../shared/types';
import { formatSpeed, speedLabel } from '../engine';
import {
  formatEntryModeLabel,
  formatScenarioLabel,
  formatSessionTimestamp,
  type ScopedRhythmSession,
  type SessionHistoryItem,
} from './utils';
import {
  buildStatsKeyboardHeatmapLabelsViewModel,
  type StatsKeyboardHeatmapLabelsViewModel,
} from './heatmapViewModel';
import {
  buildSelectedSessionViewModel,
  type StatsSessionSelectionViewModel,
} from './sessionSelectionViewModel';

type Translate = (key: string, params?: TranslationParams) => string;

type StatsSessionsSourceViewModel = {
  filteredSessionHistory: SessionHistoryItem[];
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
  translate: Translate;
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
  translate: Translate;
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
  translate: Translate,
): StatsWorstKeyCardViewModel[] {
  return worstKeys.map(key => ({
    id: key.ch,
    charLabel: key.ch === ' ' ? '␣' : key.ch,
    errorLabel: translate('stats.keys.errorRateShort', { value: Math.round(key.errRate * 100) }),
    timeLabel: translate('stats.common.msValue', { value: key.avgTime }),
  }));
}

export function buildStatsRhythmMetricViewModel(
  displayedRhythmSession: ScopedRhythmSession | null,
  rhythmStableRun: number,
  rhythmWorstPoint: number,
  translate: Translate,
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
  translate: Translate,
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
  statsViewModel: StatsSessionsSourceViewModel;
  translate: Translate;
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
