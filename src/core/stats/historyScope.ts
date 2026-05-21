import type {
  CharStat,
  HistoryEntry,
  PracticeRhythmSessionEntry,
  SpeedUnit,
  TranslationParams,
} from '../../shared/types';
import { formatSpeed } from '../engine';
import { matchesHistoryModeBucket } from '../history/selectors';
import {
  aggregateCharStats,
  buildRhythmSessionMatcher,
  formatSessionTooltipTimestamp,
  getStatsLayoutScopeLabel,
  getStatsModeLabel,
  getStatsPeriodLabel,
  getTrendSummary,
  isWithinPeriod,
  type ScopedHistoryEntry,
  type ScopedRhythmSession,
  type SessionHistoryItem,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from './utils';

type Translate = (key: string, params?: TranslationParams) => string;

export type StatsWorstKeyCandidate = {
  avgTime: number;
  ch: string;
  errRate: number;
  total: number;
};

export type StatsHistoryScopeModel = {
  accData: number[];
  allHistoryEntries: ScopedHistoryEntry[];
  allRhythmSessions: ScopedRhythmSession[];
  bestAccuracyEntry: HistoryEntry | null;
  bestRhythmSession: ScopedRhythmSession | null;
  bestSpeedEntry: HistoryEntry | null;
  chartTimestamps: string[];
  filteredCurrentLayoutHistory: HistoryEntry[];
  filteredHistory: HistoryEntry[];
  filteredHistoryEntries: ScopedHistoryEntry[];
  filteredSessionHistory: SessionHistoryItem[];
  keyStats: Record<string, CharStat>;
  rhythmSessions: ScopedRhythmSession[];
  speedData: number[];
  speedTrend: ReturnType<typeof getTrendSummary>;
  summaryScopeLabel: string;
  accuracyTrend: ReturnType<typeof getTrendSummary>;
  worstKeys: StatsWorstKeyCandidate[];
};

export type BuildStatsHistoryScopeArgs = {
  currentLayout: string;
  currentLayoutLabel: string;
  layoutScope: StatsLayoutScope;
  locale: string;
  practiceRhythmHistory: Record<string, PracticeRhythmSessionEntry[]> | undefined;
  progressHistory: Record<string, HistoryEntry[]> | undefined;
  statsMode: StatsModeFilter;
  statsPeriod: StatsPeriod;
  translate: Translate;
  unit: SpeedUnit;
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

function buildWorstKeyCandidates(keyStats: Record<string, CharStat>): StatsWorstKeyCandidate[] {
  return Object.entries(keyStats)
    .map(([ch, stat]) => {
      const total = stat.hits + stat.misses;
      const errRate = total > 0 ? stat.misses / total : 0;
      const avgTime = stat.hits > 0 ? Math.round(stat.totalTime / stat.hits) : 0;
      return { ch, errRate, avgTime, total };
    })
    .filter(item => item.total >= 3)
    .sort((a, b) => (b.errRate * 100 + b.avgTime / 10) - (a.errRate * 100 + a.avgTime / 10))
    .slice(0, 5);
}

export function buildStatsHistoryScopeModel({
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
}: BuildStatsHistoryScopeArgs): StatsHistoryScopeModel {
  const allHistoryEntries = buildScopedHistoryEntries(progressHistory);
  const filteredHistoryEntries = allHistoryEntries.filter(({ layoutId, entry }) =>
    (layoutScope === 'all' || layoutId === currentLayout)
    && (statsMode === 'all' || matchesHistoryModeBucket(entry, statsMode))
    && isWithinPeriod(entry.date, statsPeriod),
  );
  const filteredHistory = filteredHistoryEntries.map(item => item.entry);
  const filteredCurrentLayoutHistory = filteredHistoryEntries
    .filter(item => item.layoutId === currentLayout)
    .map(item => item.entry);
  const keyStats = aggregateCharStats(filteredCurrentLayoutHistory);

  const allRhythmSessions = buildScopedRhythmSessions(practiceRhythmHistory);
  const findRhythmSession = buildRhythmSessionMatcher(allRhythmSessions);
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
      rhythm: findRhythmSession(item),
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

  return {
    accData,
    allHistoryEntries,
    allRhythmSessions,
    bestAccuracyEntry,
    bestRhythmSession,
    bestSpeedEntry,
    chartTimestamps,
    filteredCurrentLayoutHistory,
    filteredHistory,
    filteredHistoryEntries,
    filteredSessionHistory,
    keyStats,
    rhythmSessions,
    speedData,
    speedTrend,
    summaryScopeLabel,
    accuracyTrend,
    worstKeys: buildWorstKeyCandidates(keyStats),
  };
}
