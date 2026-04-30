import type {
  FingerName,
  HistoryEntry,
  SpeedUnit,
  TranslationParams,
} from '../../shared/types';
import { formatSpeed, speedLabel } from '../engine';
import {
  formatEntryModeLabel,
  formatSessionTimestamp,
  getFingerLabel,
  getRowLabel,
  type ScopedRhythmSession,
} from './utils';

type Translate = (key: string, params?: TranslationParams) => string;

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

type StatsSummarySourceViewModel = {
  accuracyTrend: {
    formattedDelta: string;
    label: string;
    tone: string;
  };
  bestAccuracyEntry: HistoryEntry | null;
  bestRhythmSession: ScopedRhythmSession | null;
  bestSpeedEntry: HistoryEntry | null;
  filteredHistory: HistoryEntry[];
  rowInsights: Array<{
    avgMs: number;
    errorRate: number;
    row: 'top' | 'middle' | 'bottom';
  }>;
  speedTrend: {
    formattedDelta: string;
    label: string;
    tone: string;
  };
  summaryScopeLabel: string;
  weakestFingers: Array<{
    avgMs: number;
    errorRate: number;
    finger: FingerName;
  }>;
};

export function buildStatsSummaryCardsViewModel({
  locale,
  statsViewModel,
  translate,
  unit,
}: {
  locale: string;
  statsViewModel: StatsSummarySourceViewModel;
  translate: Translate;
  unit: SpeedUnit;
}): StatsSummaryCardsViewModel {
  const weakestFinger = statsViewModel.weakestFingers[0] ?? null;
  const weakestRow = statsViewModel.rowInsights[0] ?? null;

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
        value: weakestFinger ? getFingerLabel(weakestFinger.finger, translate) : '—',
        note: weakestFinger
          ? translate('stats.summary.weakestFingerNote', { errorRate: weakestFinger.errorRate, avgMs: weakestFinger.avgMs })
          : translate('stats.summary.notEnoughAnalytics'),
        valueSmall: true,
      },
      {
        id: 'weakest-row',
        label: translate('stats.summary.weakestRow'),
        value: weakestRow ? getRowLabel(weakestRow.row, translate) : '—',
        note: weakestRow
          ? translate('stats.summary.weakestRowNote', { errorRate: weakestRow.errorRate, avgMs: weakestRow.avgMs })
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
