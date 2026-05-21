import type {
  CharStat,
  FingerName,
  HistoryEntry,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeContentScenarioId,
  PracticeRhythmSessionEntry,
  TranslationParams,
} from '../../shared/types';
import { formatLocaleDateTime } from '../i18n';
import {
  isPracticeHistoryEntry,
  type HistoryModeBucket,
} from '../history/selectors';

export type TrendTone = 'up' | 'down' | 'flat' | 'neutral';
export type StatsPeriod = 'all' | 'day' | 'week' | 'month';
export type StatsModeFilter = 'all' | Exclude<HistoryModeBucket, 'other'>;
export type StatsLayoutScope = 'current' | 'all';
export type ScopedHistoryEntry = { id: string; layoutId: string; entry: HistoryEntry };
export type ScopedRhythmSession = { layoutId: string; session: PracticeRhythmSessionEntry };
export type SessionHistoryItem = ScopedHistoryEntry & { rhythm: ScopedRhythmSession | null };

export const PERIOD_OPTIONS: StatsPeriod[] = ['all', 'day', 'week', 'month'];
export const MODE_OPTIONS: StatsModeFilter[] = ['all', 'practice', 'sprint', 'survival', 'flawless', 'game', 'lesson'];
export const LAYOUT_SCOPE_OPTIONS: StatsLayoutScope[] = ['current', 'all'];

type Translate = (key: string, params?: TranslationParams) => string;

export function formatAggregateMeta(entry: PracticeInsightAggregate) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

export function formatBigramMeta(entry: PracticeBigramInsight) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTransitionTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

export function getFingerLabel(finger: FingerName, t: Translate) {
  return t(`stats.fingers.${finger}`);
}

export function getRowLabel(row: 'top' | 'middle' | 'bottom', t: Translate) {
  return t(`stats.rows.${row}`);
}

export function getStatsPeriodLabel(period: StatsPeriod, t: Translate) {
  return t(`stats.filters.periodOptions.${period}`);
}

export function getStatsModeLabel(mode: StatsModeFilter, t: Translate) {
  return t(`stats.filters.modeOptions.${mode}`);
}

export function getStatsLayoutScopeLabel(scope: StatsLayoutScope, t: Translate) {
  return t(`stats.filters.layoutOptions.${scope}`);
}

export function formatSessionTimestamp(date: string, locale: string) {
  return formatLocaleDateTime(date, locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }, date);
}

export function formatSessionTooltipTimestamp(date: string, locale: string) {
  return formatLocaleDateTime(date, locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }, date);
}

export function getBestStableRun(session: PracticeRhythmSessionEntry) {
  if (!session.intervals.length) return 0;
  const threshold = Math.max(session.averageDeviation * 1.1, session.averageInterval * 0.16, 24);
  let current = 0;
  let best = 0;

  session.intervals.forEach((interval) => {
    if (Math.abs(interval - session.averageInterval) <= threshold) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });

  return best;
}

export function formatDelta(delta: number, digits = 0) {
  const abs = Math.abs(delta);
  const fixed = digits > 0 ? abs.toFixed(digits) : Math.round(abs).toString();
  return `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${fixed}`;
}

export function getTrendSummary(values: number[], threshold: number, digits = 0, t: Translate) {
  if (values.length < 4) {
    return {
      tone: 'neutral' as TrendTone,
      label: t('stats.trend.notEnoughData'),
      delta: 0,
      formattedDelta: '0',
    };
  }

  const chunk = Math.max(2, Math.min(5, Math.floor(values.length / 2)));
  const previous = values.slice(-chunk * 2, -chunk);
  const recent = values.slice(-chunk);
  if (!previous.length || !recent.length) {
    return {
      tone: 'neutral' as TrendTone,
      label: t('stats.trend.notEnoughData'),
      delta: 0,
      formattedDelta: '0',
    };
  }

  const previousAverage = previous.reduce((sum, value) => sum + value, 0) / previous.length;
  const recentAverage = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const delta = recentAverage - previousAverage;

  if (Math.abs(delta) < threshold) {
    return {
      tone: 'flat' as TrendTone,
      label: t('stats.trend.stable'),
      delta,
      formattedDelta: formatDelta(delta, digits),
    };
  }

  return {
    tone: delta > 0 ? ('up' as TrendTone) : ('down' as TrendTone),
    label: delta > 0 ? t('stats.trend.growing') : t('stats.trend.falling'),
    delta,
    formattedDelta: formatDelta(delta, digits),
  };
}

export function isWithinPeriod(date: string, period: StatsPeriod) {
  if (period === 'all') return true;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return false;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeMs = period === 'day' ? dayMs : period === 'week' ? 7 * dayMs : 30 * dayMs;
  return target >= now - rangeMs;
}

export function aggregateCharStats(entries: HistoryEntry[]) {
  const aggregated: Record<string, CharStat> = {};

  entries.forEach((entry) => {
    Object.entries(entry.charStats ?? {}).forEach(([char, stat]) => {
      if (char === ' ') return;
      const prev = aggregated[char] ?? { hits: 0, misses: 0, totalTime: 0 };
      aggregated[char] = {
        hits: prev.hits + Math.max(0, stat.hits || 0),
        misses: prev.misses + Math.max(0, stat.misses || 0),
        totalTime: prev.totalTime + Math.max(0, stat.totalTime || 0),
      };
    });
  });

  return aggregated;
}

export function formatModeLabel(mode: HistoryEntry['mode'], t: Translate) {
  switch (mode) {
    case 'practice': return t('stats.modes.practice');
    case 'game': return t('stats.modes.game');
    case 'lesson': return t('stats.modes.lesson');
    case 'test': return t('stats.modes.test');
    default: return mode;
  }
}

export function formatScenarioLabel(scenarioId: PracticeContentScenarioId | undefined, t: Translate) {
  if (!scenarioId) return '';
  return t(`stats.scenarios.${scenarioId}`);
}

export function formatEntryModeLabel(entry: HistoryEntry, t: Translate) {
  const scenarioLabel = formatScenarioLabel(entry.contentScenarioId, t);
  if (!scenarioLabel || scenarioLabel === t('stats.scenarios.practice-normal')) {
    return formatModeLabel(entry.mode, t);
  }
  if (entry.mode === 'practice' && entry.contentScenarioId === 'practice-rhythm') {
    return scenarioLabel;
  }
  return scenarioLabel;
}

export function getWorstKeysFromCharStats(charStats?: Record<string, CharStat>, limit = 4) {
  return Object.entries(charStats ?? {})
    .filter(([ch]) => ch !== ' ')
    .map(([ch, d]) => {
      const total = d.hits + d.misses;
      const errRate = total > 0 ? d.misses / total : 0;
      const avgTime = d.hits > 0 ? Math.round(d.totalTime / d.hits) : 0;
      return { ch, errRate, avgTime, total };
    })
    .filter(item => item.total >= 1)
    .sort((a, b) => (b.errRate * 100 + b.avgTime / 10) - (a.errRate * 100 + a.avgTime / 10))
    .slice(0, limit);
}

export function findMatchingRhythmSession(
  historyItem: ScopedHistoryEntry,
  rhythmItems: ScopedRhythmSession[],
) {
  if (!isPracticeHistoryEntry(historyItem.entry)) return null;
  const targetTs = new Date(historyItem.entry.date).getTime();
  if (Number.isNaN(targetTs)) return null;

  let best: ScopedRhythmSession | null = null;
  let bestDiff = Infinity;

  rhythmItems.forEach((candidate) => {
    if (candidate.layoutId !== historyItem.layoutId) return;
    const candidateTs = new Date(candidate.session.date).getTime();
    if (Number.isNaN(candidateTs)) return;
    const diff = Math.abs(candidateTs - targetTs);
    if (diff > 60_000) return;
    if (historyItem.entry.trainingMode && candidate.session.trainingMode !== historyItem.entry.trainingMode) return;
    if (Math.abs(candidate.session.acc - historyItem.entry.acc) > 1.5) return;
    if (Math.abs(candidate.session.wpm - historyItem.entry.wpm) > 20) return;
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  });

  return best;
}

export function buildRhythmSessionMatcher(rhythmItems: ScopedRhythmSession[]) {
  const byLayout = new Map<string, Array<{ item: ScopedRhythmSession; time: number }>>();

  rhythmItems.forEach((item) => {
    const time = new Date(item.session.date).getTime();
    if (Number.isNaN(time)) return;
    const items = byLayout.get(item.layoutId) ?? [];
    items.push({ item, time });
    byLayout.set(item.layoutId, items);
  });

  byLayout.forEach(items => items.sort((left, right) => left.time - right.time));

  return (historyItem: ScopedHistoryEntry) => {
    if (!isPracticeHistoryEntry(historyItem.entry)) return null;
    const targetTs = new Date(historyItem.entry.date).getTime();
    if (Number.isNaN(targetTs)) return null;

    const layoutItems = byLayout.get(historyItem.layoutId) ?? [];
    let index = lowerBoundRhythmSession(layoutItems, targetTs - 60_000);
    let best: ScopedRhythmSession | null = null;
    let bestDiff = Infinity;

    while (index < layoutItems.length) {
      const candidate = layoutItems[index]!;
      if (candidate.time > targetTs + 60_000) break;
      if (historyItem.entry.trainingMode && candidate.item.session.trainingMode !== historyItem.entry.trainingMode) {
        index += 1;
        continue;
      }
      if (Math.abs(candidate.item.session.acc - historyItem.entry.acc) > 1.5) {
        index += 1;
        continue;
      }
      if (Math.abs(candidate.item.session.wpm - historyItem.entry.wpm) > 20) {
        index += 1;
        continue;
      }
      const diff = Math.abs(candidate.time - targetTs);
      if (diff < bestDiff) {
        best = candidate.item;
        bestDiff = diff;
      }
      index += 1;
    }

    return best;
  };
}

function lowerBoundRhythmSession(
  items: Array<{ item: ScopedRhythmSession; time: number }>,
  target: number,
) {
  let left = 0;
  let right = items.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (items[middle]!.time < target) left = middle + 1;
    else right = middle;
  }
  return left;
}
