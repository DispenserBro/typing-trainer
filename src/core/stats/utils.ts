import type {
  CharStat,
  FingerName,
  HistoryEntry,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeRhythmSessionEntry,
} from '../../shared/types';

export const FINGER_LABELS: Record<FingerName, string> = {
  index_left: 'Левый указательный',
  index_right: 'Правый указательный',
  middle_left: 'Левый средний',
  middle_right: 'Правый средний',
  ring_left: 'Левый безымянный',
  ring_right: 'Правый безымянный',
  pinky_left: 'Левый мизинец',
  pinky_right: 'Правый мизинец',
};

export const ROW_LABELS = {
  top: 'Верхний ряд',
  middle: 'Средний ряд',
  bottom: 'Нижний ряд',
} as const;

export type TrendTone = 'up' | 'down' | 'flat' | 'neutral';
export type StatsPeriod = 'all' | 'day' | 'week' | 'month';
export type StatsModeFilter = 'all' | HistoryEntry['mode'];
export type StatsLayoutScope = 'current' | 'all';
export type ScopedHistoryEntry = { id: string; layoutId: string; entry: HistoryEntry };
export type ScopedRhythmSession = { layoutId: string; session: PracticeRhythmSessionEntry };
export type SessionHistoryItem = ScopedHistoryEntry & { rhythm: ScopedRhythmSession | null };

export const PERIOD_OPTIONS: Array<{ value: StatsPeriod; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

export const MODE_OPTIONS: Array<{ value: StatsModeFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'practice', label: 'Практика' },
  { value: 'game', label: 'Игра' },
  { value: 'lesson', label: 'Уроки' },
  { value: 'test', label: 'Тест' },
];

export const LAYOUT_SCOPE_OPTIONS: Array<{ value: StatsLayoutScope; label: string }> = [
  { value: 'current', label: 'Текущая раскладка' },
  { value: 'all', label: 'Все раскладки' },
];

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

export function formatSessionTimestamp(date: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatSessionTooltipTimestamp(date: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch {
    return date;
  }
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

export function getTrendSummary(values: number[], threshold: number, digits = 0) {
  if (values.length < 4) {
    return {
      tone: 'neutral' as TrendTone,
      label: 'Недостаточно данных',
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
      label: 'Недостаточно данных',
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
      label: 'Стабильно',
      delta,
      formattedDelta: formatDelta(delta, digits),
    };
  }

  return {
    tone: delta > 0 ? ('up' as TrendTone) : ('down' as TrendTone),
    label: delta > 0 ? 'Растет' : 'Падает',
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

export function formatModeLabel(mode: HistoryEntry['mode']) {
  switch (mode) {
    case 'practice': return 'Практика';
    case 'game': return 'Игра';
    case 'lesson': return 'Урок';
    case 'test': return 'Тест';
    default: return mode;
  }
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
  if (historyItem.entry.mode !== 'practice') return null;
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
