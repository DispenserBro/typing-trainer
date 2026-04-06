import { useEffect, useRef, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  CharStat,
  FingerName,
  HistoryEntry,
  PracticeInsightAggregate,
  PracticeBigramInsight,
  PracticeRhythmSessionEntry,
} from '../../shared/types';
import { useApp } from '../contexts/AppContext';
import { formatSpeed, speedLabel } from '../engine';
import { getRhythmScore } from '../practiceInsights';
import { KeyboardHeatmap } from '../components/KeyboardHeatmap';

Chart.register(...registerables);

const FINGER_LABELS: Record<FingerName, string> = {
  index_left: 'Левый указательный',
  index_right: 'Правый указательный',
  middle_left: 'Левый средний',
  middle_right: 'Правый средний',
  ring_left: 'Левый безымянный',
  ring_right: 'Правый безымянный',
  pinky_left: 'Левый мизинец',
  pinky_right: 'Правый мизинец',
};

const ROW_LABELS = {
  top: 'Верхний ряд',
  middle: 'Средний ряд',
  bottom: 'Нижний ряд',
} as const;

function formatAggregateMeta(entry: PracticeInsightAggregate) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

function formatBigramMeta(entry: PracticeBigramInsight) {
  const attempts = entry.hits + entry.misses;
  const avgMs = entry.hits > 0 ? Math.round(entry.totalTransitionTime / entry.hits) : 0;
  const errorRate = attempts > 0 ? Math.round((entry.misses / attempts) * 100) : 0;
  return { attempts, avgMs, errorRate };
}

function formatSessionTimestamp(date: string) {
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

function formatSessionTooltipTimestamp(date: string) {
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

function getBestStableRun(session: PracticeRhythmSessionEntry) {
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

type TrendTone = 'up' | 'down' | 'flat' | 'neutral';

function formatDelta(delta: number, digits = 0) {
  const abs = Math.abs(delta);
  const fixed = digits > 0 ? abs.toFixed(digits) : Math.round(abs).toString();
  return `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${fixed}`;
}

function getTrendSummary(values: number[], threshold: number, digits = 0) {
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

type StatsPeriod = 'all' | 'day' | 'week' | 'month';
type StatsModeFilter = 'all' | HistoryEntry['mode'];
type StatsLayoutScope = 'current' | 'all';
type ScopedHistoryEntry = { id: string; layoutId: string; entry: HistoryEntry };
type ScopedRhythmSession = { layoutId: string; session: PracticeRhythmSessionEntry };
type SessionHistoryItem = ScopedHistoryEntry & { rhythm: ScopedRhythmSession | null };

const PERIOD_OPTIONS: Array<{ value: StatsPeriod; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const MODE_OPTIONS: Array<{ value: StatsModeFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'practice', label: 'Практика' },
  { value: 'game', label: 'Игра' },
  { value: 'lesson', label: 'Уроки' },
  { value: 'test', label: 'Тест' },
];

const LAYOUT_SCOPE_OPTIONS: Array<{ value: StatsLayoutScope; label: string }> = [
  { value: 'current', label: 'Текущая раскладка' },
  { value: 'all', label: 'Все раскладки' },
];

function isWithinPeriod(date: string, period: StatsPeriod) {
  if (period === 'all') return true;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return false;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeMs = period === 'day' ? dayMs : period === 'week' ? 7 * dayMs : 30 * dayMs;
  return target >= now - rangeMs;
}

function aggregateCharStats(entries: HistoryEntry[]) {
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

function formatModeLabel(mode: HistoryEntry['mode']) {
  switch (mode) {
    case 'practice': return 'Практика';
    case 'game': return 'Игра';
    case 'lesson': return 'Урок';
    case 'test': return 'Тест';
    default: return mode;
  }
}

function getWorstKeysFromCharStats(charStats?: Record<string, CharStat>, limit = 4) {
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

function findMatchingRhythmSession(
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

type OverallProgressChartsProps = {
  chartTimestamps: string[];
  speedData: number[];
  accData: number[];
  unit: ReturnType<typeof useApp>['settings']['speedUnit'];
};

type ProgressChartProps = {
  title: string;
  values: number[];
  timestamps: string[];
  color: string;
  valueLabel: string;
  minValue?: number;
  maxValue?: number;
};

function ProgressChart({
  title,
  values,
  timestamps,
  color,
  valueLabel,
  minValue,
  maxValue,
}: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    let frameId = 0;
    let cancelled = false;

    const initChart = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas || !canvas.isConnected || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        frameId = window.requestAnimationFrame(initChart);
        return;
      }

      try {
        Chart.getChart(canvas)?.destroy();
        chartRef.current?.destroy();

        chartRef.current = new Chart(canvas, {
          type: 'line',
          data: {
            labels: values.map((_, index) => index + 1),
            datasets: [{
              label: valueLabel,
              data: values,
              borderColor: color,
              backgroundColor: color,
              tension: 0.3,
              fill: false,
              pointRadius: 2,
              pointHoverRadius: 3,
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items) => {
                    const index = items[0]?.dataIndex ?? 0;
                    return timestamps[index] ?? '';
                  },
                },
              },
            },
            scales: {
              y: {
                min: minValue,
                max: maxValue,
                beginAtZero: minValue == null,
                ticks: { color: '#666' },
                grid: { color: '#2a2a2a' },
              },
              x: {
                ticks: { color: '#666' },
                grid: { color: '#2a2a2a' },
              },
            },
          },
        });
      } catch (error) {
        console.error(`Failed to initialize chart: ${title}`, error);
      }
    };

    frameId = window.requestAnimationFrame(initChart);

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      chartRef.current?.destroy();
      chartRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        Chart.getChart(canvas)?.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    try {
      chart.data.labels = values.map((_, index) => index + 1);
      chart.data.datasets[0].label = valueLabel;
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].borderColor = color;
      chart.data.datasets[0].backgroundColor = color;
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.callbacks = {
          ...chart.options.plugins.tooltip.callbacks,
          title: (items) => {
            const index = items[0]?.dataIndex ?? 0;
            return timestamps[index] ?? '';
          },
        };
      }
      const yScale = chart.options.scales?.y as
        | { min?: number; max?: number; beginAtZero?: boolean }
        | undefined;
      if (yScale && !Array.isArray(yScale)) {
        yScale.min = minValue;
        yScale.max = maxValue;
        yScale.beginAtZero = minValue == null;
      }
      chart.update('none');
    } catch (error) {
      console.error(`Failed to update chart: ${title}`, error);
    }
  }, [color, maxValue, minValue, timestamps, title, valueLabel, values]);

  return (
    <div className="card-like stats-chart-card">
      <h4>{title}</h4>
      <div className="stats-chart-wrap">
        {values.length === 0 ? (
          <p className="smart-stats-empty">Недостаточно данных для графика.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}

function OverallProgressCharts({
  chartTimestamps,
  speedData,
  accData,
  unit,
}: OverallProgressChartsProps) {
  const bodyStyles = getComputedStyle(document.body);
  const accent = bodyStyles.getPropertyValue('--accent').trim() || '#e8751a';
  const green = bodyStyles.getPropertyValue('--green').trim() || '#4caf50';

  return (
    <div className="stats-grid">
      <ProgressChart
        title="Прогресс скорости"
        values={speedData}
        timestamps={chartTimestamps}
        color={accent}
        valueLabel={speedLabel(unit)}
        minValue={0}
      />
      <ProgressChart
        title="Прогресс точности"
        values={accData}
        timestamps={chartTimestamps}
        color={green}
        valueLabel="Accuracy %"
        minValue={50}
        maxValue={100}
      />
    </div>
  );
}

export function StatsPage() {
  const { progress, currentLayout, layouts, settings, practiceInsights, practiceRhythmHistory } = useApp();
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('all');
  const [statsMode, setStatsMode] = useState<StatsModeFilter>('all');
  const [layoutScope, setLayoutScope] = useState<StatsLayoutScope>('current');
  const [showOverallProgress, setShowOverallProgress] = useState(false);
  const [showKeyStats, setShowKeyStats] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(true);
  const unit = settings.speedUnit;
  const layout = layouts.layouts[currentLayout];
  const allChars = layout ? Object.values(layout.fingers).flat() : [];
  const layoutInsights = practiceInsights.byLayout[currentLayout];
  const allHistoryEntries = useMemo<ScopedHistoryEntry[]>(
    () => Object.entries(progress.history ?? {}).flatMap(([layoutId, entries]) =>
      (entries ?? []).map((entry, index) => ({
        id: `${layoutId}:${entry.date}:${entry.mode}:${index}`,
        layoutId,
        entry,
      })),
    ),
    [progress.history],
  );
  const filteredHistoryEntries = useMemo(
    () => allHistoryEntries.filter(({ layoutId, entry }) =>
      (layoutScope === 'all' || layoutId === currentLayout)
      && (statsMode === 'all' || entry.mode === statsMode)
      && isWithinPeriod(entry.date, statsPeriod),
    ),
    [allHistoryEntries, currentLayout, layoutScope, statsMode, statsPeriod],
  );
  const filteredHistory = useMemo(
    () => filteredHistoryEntries.map(item => item.entry),
    [filteredHistoryEntries],
  );
  const filteredCurrentLayoutHistory = useMemo(
    () => filteredHistoryEntries
      .filter(item => item.layoutId === currentLayout)
      .map(item => item.entry),
    [filteredHistoryEntries, currentLayout],
  );
  const ks = useMemo(
    () => aggregateCharStats(filteredCurrentLayoutHistory),
    [filteredCurrentLayoutHistory],
  );
  const allRhythmSessions = useMemo<ScopedRhythmSession[]>(
    () => Object.entries(practiceRhythmHistory ?? {}).flatMap(([layoutId, sessions]) =>
      (sessions ?? []).map((session) => ({ layoutId, session })),
    ),
    [practiceRhythmHistory],
  );
  const rhythmSessions = useMemo(
    () => (statsMode !== 'all' && statsMode !== 'practice'
      ? []
      : allRhythmSessions.filter(({ layoutId, session }) =>
        (layoutScope === 'all' || layoutId === currentLayout)
        && isWithinPeriod(session.date, statsPeriod),
      )),
    [allRhythmSessions, currentLayout, layoutScope, statsMode, statsPeriod],
  );
  const filteredSessionHistory = useMemo<SessionHistoryItem[]>(
    () => filteredHistoryEntries
      .slice()
      .sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime())
      .map(item => ({
        ...item,
        rhythm: findMatchingRhythmSession(item, allRhythmSessions),
      })),
    [allRhythmSessions, filteredHistoryEntries],
  );

  const rhythmRef = useRef<HTMLCanvasElement>(null);
  const rhythmChartRef = useRef<Chart | null>(null);
  const [rhythmChartError, setRhythmChartError] = useState(false);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string>('');
  const chartLabels = useMemo(() => filteredHistory.map((_, i) => i + 1), [filteredHistory]);
  const chartTimestamps = useMemo(
    () => filteredHistory.map(entry => formatSessionTooltipTimestamp(entry.date)),
    [filteredHistory],
  );
  const speedData = useMemo(() => filteredHistory.map(h => Number(formatSpeed(h.wpm, unit))), [filteredHistory, unit]);
  const accData = useMemo(() => filteredHistory.map(h => h.acc), [filteredHistory]);
  const preferredHistorySession = useMemo(
    () =>
      filteredSessionHistory.find(item => item.entry.charStats && item.rhythm?.session.intervals.length)
      ?? filteredSessionHistory.find(item => item.entry.charStats)
      ?? filteredSessionHistory[0]
      ?? null,
    [filteredSessionHistory],
  );
  const selectedHistorySession = useMemo(
    () => filteredSessionHistory.find(item => item.id === selectedHistorySessionId) ?? preferredHistorySession,
    [filteredSessionHistory, preferredHistorySession, selectedHistorySessionId],
  );
  const selectedHistoryRhythm = selectedHistorySession?.rhythm ?? null;
  const displayedRhythmSession = useMemo(
    () => (
      selectedHistorySession?.entry.charStats && selectedHistoryRhythm?.session.intervals.length
        ? selectedHistoryRhythm
        : null
    ),
    [selectedHistoryRhythm, selectedHistorySession],
  );
  const rhythmLabels = useMemo(
    () => displayedRhythmSession?.session.intervals.map((_, index) => index + 1) ?? [],
    [displayedRhythmSession],
  );
  const rhythmData = useMemo(
    () => displayedRhythmSession?.session.intervals ?? [],
    [displayedRhythmSession],
  );
  const rhythmAverageLine = useMemo(
    () => displayedRhythmSession ? displayedRhythmSession.session.intervals.map(() => displayedRhythmSession.session.averageInterval) : [],
    [displayedRhythmSession],
  );
  const rhythmWorstPoint = useMemo(
    () => displayedRhythmSession ? Math.max(0, ...displayedRhythmSession.session.intervals) : 0,
    [displayedRhythmSession],
  );
  const rhythmStableRun = useMemo(
    () => displayedRhythmSession ? getBestStableRun(displayedRhythmSession.session) : 0,
    [displayedRhythmSession],
  );
  const selectedHistoryWorstKeys = useMemo(
    () => getWorstKeysFromCharStats(selectedHistorySession?.entry.charStats, 5),
    [selectedHistorySession],
  );
  const bestSpeedEntry = useMemo(
    () => filteredHistory.reduce<HistoryEntry | null>((best, entry) => (
      !best || entry.wpm > best.wpm ? entry : best
    ), null),
    [filteredHistory],
  );
  const bestAccuracyEntry = useMemo(
    () => filteredHistory.reduce<HistoryEntry | null>((best, entry) => (
      !best || entry.acc > best.acc ? entry : best
    ), null),
    [filteredHistory],
  );
  const bestRhythmSession = useMemo(
    () => rhythmSessions.reduce<ScopedRhythmSession | null>((best, item) => (
      !best || item.session.rhythmScore > best.session.rhythmScore ? item : best
    ), null),
    [rhythmSessions],
  );
  const speedTrend = useMemo(
    () => getTrendSummary(filteredHistory.map(entry => Number(formatSpeed(entry.wpm, unit))), 2),
    [filteredHistory, unit],
  );
  const accuracyTrend = useMemo(
    () => getTrendSummary(filteredHistory.map(entry => entry.acc), 1, 1),
    [filteredHistory],
  );
  const summaryScopeLabel = useMemo(() => {
    const parts: string[] = [];
    const periodOption = PERIOD_OPTIONS.find(option => option.value === statsPeriod);
    const modeOption = MODE_OPTIONS.find(option => option.value === statsMode);

    parts.push(periodOption?.label ?? 'Все');
    parts.push(modeOption?.label ?? 'Все режимы');
    if (layoutScope === 'current') {
      parts.push(layout?.label ?? currentLayout);
    } else {
      parts.push('Все раскладки');
    }

    return parts.join(' · ');
  }, [currentLayout, layout?.label, layoutScope, statsMode, statsPeriod]);

  useEffect(() => {
    if (!filteredSessionHistory.length) {
      setSelectedHistorySessionId('');
      return;
    }
    if (!selectedHistorySessionId || !filteredSessionHistory.some(item => item.id === selectedHistorySessionId)) {
      setSelectedHistorySessionId(preferredHistorySession?.id ?? filteredSessionHistory[0].id);
    }
  }, [filteredSessionHistory, preferredHistorySession, selectedHistorySessionId]);

  useEffect(() => {
    if (!displayedRhythmSession) {
      rhythmChartRef.current?.destroy();
      rhythmChartRef.current = null;
      setRhythmChartError(prev => (prev ? false : prev));
      return;
    }

    const bodyStyles = getComputedStyle(document.body);
    const accent = bodyStyles.getPropertyValue('--accent').trim() || '#e8751a';
    const subtext = bodyStyles.getPropertyValue('--subtext').trim() || '#8b8b8b';
    const gridColor = '#2a2a2a';
    const tickColor = '#666';

    let frameId = 0;
    let cancelled = false;

    const initChart = () => {
      if (cancelled) return;
      const canvas = rhythmRef.current;
      if (!canvas || !canvas.isConnected || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        frameId = window.requestAnimationFrame(initChart);
        return;
      }

      try {
        Chart.getChart(canvas)?.destroy();
        rhythmChartRef.current?.destroy();
        rhythmChartRef.current = new Chart(canvas, {
          type: 'line',
          data: {
            labels: rhythmLabels,
            datasets: [
              {
                label: 'Интервал',
                data: rhythmData,
                borderColor: accent,
                backgroundColor: accent,
                tension: 0.24,
                fill: false,
                pointRadius: 1.8,
                pointHoverRadius: 3,
                borderWidth: 2,
              },
              {
                label: 'Средний интервал',
                data: rhythmAverageLine,
                borderColor: subtext,
                backgroundColor: subtext,
                borderDash: [6, 6],
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0,
                borderWidth: 1.5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
              x: { ticks: { color: tickColor, maxTicksLimit: 16 }, grid: { color: gridColor } },
            },
          },
        });
        setRhythmChartError(prev => (prev ? false : prev));
      } catch (error) {
        console.error('Failed to initialize rhythm chart', error);
        rhythmChartRef.current?.destroy();
        rhythmChartRef.current = null;
        setRhythmChartError(prev => (prev ? prev : true));
      }
    };

    frameId = window.requestAnimationFrame(initChart);

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      rhythmChartRef.current?.destroy();
      rhythmChartRef.current = null;
    };
  }, [displayedRhythmSession, rhythmAverageLine, rhythmData, rhythmLabels]);

  useEffect(() => {
    try {
      if (rhythmChartRef.current) {
        rhythmChartRef.current.data.labels = rhythmLabels;
        rhythmChartRef.current.data.datasets[0].data = rhythmData;
        rhythmChartRef.current.data.datasets[1].data = rhythmAverageLine;
        rhythmChartRef.current.update('none');
      }
    } catch (error) {
      console.error('Failed to update rhythm chart', error);
      rhythmChartRef.current?.destroy();
      rhythmChartRef.current = null;
      setRhythmChartError(prev => (prev ? prev : true));
    }
  }, [settings.theme, rhythmLabels, rhythmData, rhythmAverageLine]);

  // Worst keys
  const worstKeys = useMemo(() => {
    if (!ks) return [];
    return Object.entries(ks)
      .map(([ch, d]) => {
        const total = d.hits + d.misses;
        const errRate = total > 0 ? d.misses / total : 0;
        const avgTime = d.hits > 0 ? Math.round(d.totalTime / d.hits) : 0;
        return { ch, errRate, avgTime, total };
      })
      .filter(x => x.total >= 3)
      .sort((a, b) => (b.errRate * 100 + b.avgTime / 10) - (a.errRate * 100 + a.avgTime / 10))
      .slice(0, 5);
  }, [ks]);

  // Heatmap
  const heatmap = useMemo(() => {
    if (!ks) return [];
    let minT = Infinity, maxT = 0;
    for (const ch of allChars) {
      if (ks[ch] && ks[ch].hits > 0) {
        const t = ks[ch].totalTime / ks[ch].hits;
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }
    if (minT === Infinity) minT = 0;
    if (maxT === 0) maxT = 1;
    return allChars.map(ch => {
      const d = ks[ch];
      const avg = d && d.hits > 0 ? Math.round(d.totalTime / d.hits) : 0;
      const ratio = maxT > minT ? (avg - minT) / (maxT - minT) : 0;
      const r = Math.round(ratio * 255);
      const g = Math.round((1 - ratio) * 200);
      const bg = avg > 0 ? `rgba(${r},${g},60,0.7)` : 'var(--surface2)';
      return { ch, avg, bg };
    });
  }, [ks, allChars]);

  const weakestChars = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.chars)
      .map(([char, entry]) => ({ char, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.char !== ' ' && item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 5);
  }, [layoutInsights]);

  const weakestBigrams = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.bigrams)
      .map(([bigram, entry]) => ({ bigram, entry, ...formatBigramMeta(entry) }))
      .filter(item => !item.bigram.includes(' ') && item.attempts >= 3 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 5);
  }, [layoutInsights]);

  const weakestFingers = useMemo(() => {
    if (!layoutInsights) return [];
    return Object.entries(layoutInsights.fingers)
      .filter((entry): entry is [FingerName, PracticeInsightAggregate] => Boolean(entry[1]))
      .map(([finger, entry]) => ({ finger, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness)
      .slice(0, 4);
  }, [layoutInsights]);

  const rowInsights = useMemo(() => {
    if (!layoutInsights) return [];
    return (Object.entries(layoutInsights.rows) as Array<[keyof typeof ROW_LABELS, PracticeInsightAggregate]>)
      .map(([row, entry]) => ({ row, entry, ...formatAggregateMeta(entry) }))
      .filter(item => item.attempts >= 4 && item.entry.weakness > 0)
      .sort((a, b) => b.entry.weakness - a.entry.weakness);
  }, [layoutInsights]);

  const rhythmInsight = useMemo(() => {
    if (!layoutInsights || layoutInsights.rhythm.samples <= 0) return null;
    const score = getRhythmScore(layoutInsights.rhythm);
    return {
      score,
      avgInterval: Math.round(layoutInsights.rhythm.averageInterval),
      avgDeviation: Math.round(layoutInsights.rhythm.averageDeviation),
      samples: layoutInsights.rhythm.samples,
    };
  }, [layoutInsights]);

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Статистика</h1></div>

      <div className="stats-summary-grid">
        <div className="card stats-summary-card">
          <span className="stats-summary-label">Лучший темп</span>
          <b className="stats-summary-value">
            {bestSpeedEntry ? `${formatSpeed(bestSpeedEntry.wpm, unit)} ${speedLabel(unit)}` : '—'}
          </b>
          <span className="stats-summary-note">
            {bestSpeedEntry ? `${formatModeLabel(bestSpeedEntry.mode)} · ${formatSessionTimestamp(bestSpeedEntry.date)}` : summaryScopeLabel}
          </span>
        </div>

        <div className="card stats-summary-card">
          <span className="stats-summary-label">Лучшая точность</span>
          <b className="stats-summary-value">
            {bestAccuracyEntry ? `${Math.round(bestAccuracyEntry.acc)}%` : '—'}
          </b>
          <span className="stats-summary-note">
            {bestAccuracyEntry ? `${formatModeLabel(bestAccuracyEntry.mode)} · ${formatSessionTimestamp(bestAccuracyEntry.date)}` : summaryScopeLabel}
          </span>
        </div>

        <div className="card stats-summary-card">
          <span className="stats-summary-label">Самая ровная сессия</span>
          <b className="stats-summary-value">
            {bestRhythmSession ? `${Math.round(bestRhythmSession.session.rhythmScore)}%` : '—'}
          </b>
          <span className="stats-summary-note">
            {bestRhythmSession
              ? `${bestRhythmSession.session.trainingMode === 'rhythm' ? 'Ритм' : 'Обычная'} · ${formatSessionTimestamp(bestRhythmSession.session.date)}`
              : 'Нет практик с ритм-данными'}
          </span>
        </div>

        <div className="card stats-summary-card">
          <span className="stats-summary-label">Проблемный палец</span>
          <b className="stats-summary-value stats-summary-value-small">
            {weakestFingers[0] ? FINGER_LABELS[weakestFingers[0].finger] : '—'}
          </b>
          <span className="stats-summary-note">
            {weakestFingers[0]
              ? `${weakestFingers[0].errorRate}% ошибок · ${weakestFingers[0].avgMs}мс · текущая раскладка`
              : 'Недостаточно накопленной аналитики'}
          </span>
        </div>

        <div className="card stats-summary-card">
          <span className="stats-summary-label">Проблемный ряд</span>
          <b className="stats-summary-value stats-summary-value-small">
            {rowInsights[0] ? ROW_LABELS[rowInsights[0].row] : '—'}
          </b>
          <span className="stats-summary-note">
            {rowInsights[0]
              ? `${rowInsights[0].errorRate}% ошибок · ${rowInsights[0].avgMs}мс · текущая раскладка`
              : 'Ряды пока идут ровно'}
          </span>
        </div>

        <div className="card stats-summary-card">
          <span className="stats-summary-label">Тренд</span>
          <div className="stats-summary-trends">
            <div className={`stats-summary-trend ${speedTrend.tone}`}>
              <span>Темп</span>
              <b>{speedTrend.label}</b>
              <small>{filteredHistory.length >= 4 ? `${speedTrend.formattedDelta} ${speedLabel(unit)}` : summaryScopeLabel}</small>
            </div>
            <div className={`stats-summary-trend ${accuracyTrend.tone}`}>
              <span>Точность</span>
              <b>{accuracyTrend.label}</b>
              <small>{filteredHistory.length >= 4 ? `${accuracyTrend.formattedDelta} п.п.` : summaryScopeLabel}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card stats-filters-card">
        <div className="stats-filters-grid">
          <div className="stats-filter-group">
            <span className="stats-filter-label">Период</span>
            <div className="seg-group">
              {PERIOD_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`seg-btn${statsPeriod === option.value ? ' active' : ''}`}
                  onClick={() => setStatsPeriod(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-filter-group">
            <span className="stats-filter-label">Режим</span>
            <div className="seg-group">
              {MODE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`seg-btn${statsMode === option.value ? ' active' : ''}`}
                  onClick={() => setStatsMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-filter-group">
            <span className="stats-filter-label">Срез</span>
            <div className="seg-group">
              {LAYOUT_SCOPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`seg-btn${layoutScope === option.value ? ' active' : ''}`}
                  onClick={() => setLayoutScope(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card stats-section-card mt-16">
        <button
          type="button"
          className={`stats-section-toggle${showOverallProgress ? ' expanded' : ''}`}
          onClick={() => setShowOverallProgress(prev => !prev)}
        >
          <div>
            <h4>Общий прогресс</h4>
            <p className="card-desc">Скорость и точность по истории попыток. Наведи на точку, чтобы увидеть дату и время.</p>
          </div>
          {showOverallProgress ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showOverallProgress && (
          <OverallProgressCharts
            chartTimestamps={chartTimestamps}
            speedData={speedData}
            accData={accData}
            unit={unit}
          />
        )}
      </div>

      <div className="card stats-section-card mt-16">
        <button
          type="button"
          className={`stats-section-toggle${showKeyStats ? ' expanded' : ''}`}
          onClick={() => setShowKeyStats(prev => !prev)}
        >
          <div>
            <h4>Статистика по клавишам</h4>
            <p className="card-desc">Проблемные клавиши, локальная скорость и heatmap по текущей раскладке с учетом выбранных периода и режима.</p>
          </div>
          {showKeyStats ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showKeyStats && (
          <div className="stats-keys-layout">
            <div className="stats-keys-block">
              <h5>Топ-5 проблемных клавиш</h5>
              {worstKeys.length === 0 ? (
                <p className="smart-stats-empty">Пока нет данных</p>
              ) : (
                <div className="worst-keys-grid">
                  {worstKeys.map(k => (
                    <div className="worst-key-card" key={k.ch}>
                      <span className="wk-char">{k.ch === ' ' ? '␣' : k.ch}</span>
                      <span className="wk-err">ош: {Math.round(k.errRate * 100)}%</span>
                      <span className="wk-time">{k.avgTime}мс</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-keys-column">
              <div className="stats-keys-block">
                <h5>Скорость по клавишам</h5>
                <div className="keys-heatmap">
                  {heatmap.map(h => (
                    <span key={h.ch} className="hm-key" style={{ background: h.bg }} title={`${h.ch}: ${h.avg}мс`}>
                      {h.ch}
                    </span>
                  ))}
                </div>
              </div>

              <div className="stats-keys-heatmap-wrap">
                <KeyboardHeatmap layoutId={currentLayout} keyStats={ks} responsive />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card stats-section-card mt-16">
        <button
          type="button"
          className={`stats-section-toggle${showSessions ? ' expanded' : ''}`}
          onClick={() => setShowSessions(prev => !prev)}
        >
          <div>
            <h4>Сессии</h4>
            <p className="card-desc">Ритм последней сессии и история попыток с локальным разбором.</p>
          </div>
          {showSessions ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showSessions && (
          <>
            <div>
              <div className="stats-rhythm-head">
                <div>
                  <h4>Ритм сессии</h4>
                  <p className="card-desc">
                    График обновляется по выбранной записи из истории сессий.
                  </p>
                </div>
              </div>

              {!displayedRhythmSession ? (
                <p style={{ opacity: 0.5 }}>
                  Для выбранной сессии нет детальных данных ритма. Выбери практику с сохраненной аналитикой.
                </p>
              ) : rhythmChartError ? (
                <p style={{ opacity: 0.6 }}>График ритма временно недоступен. Остальная статистика сохранена.</p>
              ) : (
                <div className="stats-rhythm-grid">
                  <div className="stats-chart-wrap rhythm">
                    <canvas ref={rhythmRef} />
                  </div>
                  <div className="stats-rhythm-summary">
                    <div className="stats-rhythm-metric">
                      <span>Оценка ритма</span>
                      <b>{Math.round(displayedRhythmSession.session.rhythmScore)}%</b>
                    </div>
                    <div className="stats-rhythm-metric">
                      <span>Средний интервал</span>
                      <b>{Math.round(displayedRhythmSession.session.averageInterval)}мс</b>
                    </div>
                    <div className="stats-rhythm-metric">
                      <span>Среднее отклонение</span>
                      <b>{Math.round(displayedRhythmSession.session.averageDeviation)}мс</b>
                    </div>
                    <div className="stats-rhythm-metric">
                      <span>Худший провал</span>
                      <b>{Math.round(rhythmWorstPoint)}мс</b>
                    </div>
                    <div className="stats-rhythm-metric">
                      <span>Лучший ровный отрезок</span>
                      <b>{rhythmStableRun} символов</b>
                    </div>
                    <div className="stats-rhythm-metric">
                      <span>Сессия</span>
                      <b>{displayedRhythmSession.session.textLength} знаков · {Math.round(displayedRhythmSession.session.acc)}%</b>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="stats-section-divider" />

            <div>
              <div className="stats-session-head">
                <div>
                  <h4>История сессий</h4>
                  <p className="card-desc">
                    Выбери конкретную попытку, чтобы посмотреть ее локальные проблемы и быстрый разбор.
                  </p>
                </div>
              </div>

              {!filteredSessionHistory.length ? (
                <p style={{ opacity: 0.5 }}>По текущим фильтрам пока нет подходящих сессий.</p>
              ) : (
                <div className="stats-session-grid">
                  <div className="stats-session-list">
                    {filteredSessionHistory.slice(0, 20).map((item) => {
                      const isActive = selectedHistorySession?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`stats-session-item${isActive ? ' active' : ''}`}
                          onClick={() => setSelectedHistorySessionId(item.id)}
                        >
                          <div className="stats-session-item-top">
                            <strong>{formatModeLabel(item.entry.mode)}</strong>
                            <span>{formatSessionTimestamp(item.entry.date)}</span>
                          </div>
                          <div className="stats-session-item-meta">
                            <span>{layouts.layouts[item.layoutId]?.label ?? item.layoutId}</span>
                            {item.entry.trainingMode && (
                              <span>{item.entry.trainingMode === 'rhythm' ? 'Ритм' : 'Обычная'}</span>
                            )}
                          </div>
                          <div className="stats-session-item-metrics">
                            <b>{formatSpeed(item.entry.wpm, unit)} {speedLabel(unit)}</b>
                            <b>{Math.round(item.entry.acc)}%</b>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="stats-session-detail">
                    {!selectedHistorySession ? (
                      <p style={{ opacity: 0.5 }}>Выбери сессию слева.</p>
                    ) : (
                      <>
                        <div className="stats-session-summary">
                          <div className="stats-rhythm-metric">
                            <span>Режим</span>
                            <b>{formatModeLabel(selectedHistorySession.entry.mode)}</b>
                          </div>
                          <div className="stats-rhythm-metric">
                            <span>Раскладка</span>
                            <b>{layouts.layouts[selectedHistorySession.layoutId]?.label ?? selectedHistorySession.layoutId}</b>
                          </div>
                          <div className="stats-rhythm-metric">
                            <span>Скорость</span>
                            <b>{formatSpeed(selectedHistorySession.entry.wpm, unit)} {speedLabel(unit)}</b>
                          </div>
                          <div className="stats-rhythm-metric">
                            <span>Точность</span>
                            <b>{Math.round(selectedHistorySession.entry.acc)}%</b>
                          </div>
                          {selectedHistoryRhythm && !displayedRhythmSession && (
                            <>
                              <div className="stats-rhythm-metric">
                                <span>Ритм</span>
                                <b>{Math.round(selectedHistoryRhythm.session.rhythmScore)}%</b>
                              </div>
                              <div className="stats-rhythm-metric">
                                <span>Худший провал</span>
                                <b>{Math.round(selectedHistoryRhythm.session.worstInterval)}мс</b>
                              </div>
                            </>
                          )}
                        </div>

                        {selectedHistorySession.entry.charStats ? (
                          <>
                            <KeyboardHeatmap
                              layoutId={selectedHistorySession.layoutId}
                              keyStats={selectedHistorySession.entry.charStats}
                              title="Heatmap сессии"
                              description="Локальная картина по этой попытке."
                              showControls={false}
                              initialMode="errors"
                              className="keyboard-heatmap-compact"
                            />

                            <div className="card-like stats-session-worst">
                              <h5>Проблемные клавиши сессии</h5>
                              {selectedHistoryWorstKeys.length === 0 ? (
                                <p className="smart-stats-empty">Для этой попытки пока нет детальных клавишных данных.</p>
                              ) : (
                                <div className="worst-keys-grid compact">
                                  {selectedHistoryWorstKeys.map(k => (
                                    <div className="worst-key-card compact" key={k.ch}>
                                      <span className="wk-char">{k.ch === ' ' ? '␣' : k.ch}</span>
                                      <span className="wk-err">ош: {Math.round(k.errRate * 100)}%</span>
                                      <span className="wk-time">{k.avgTime}мс</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <p style={{ opacity: 0.5 }}>Для этой сессии нет детальных `charStats`, поэтому доступен только общий разбор.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card stats-section-card mt-16">
        <button
          type="button"
          className={`stats-section-toggle${showSmartAnalytics ? ' expanded' : ''}`}
          onClick={() => setShowSmartAnalytics(prev => !prev)}
        >
          <div>
            <h4>Аналитика умной практики</h4>
            <p className="card-desc">
              Здесь видно, почему система считает конкретные буквы, сочетания и зоны клавиатуры слабыми.
            </p>
          </div>
          {showSmartAnalytics ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showSmartAnalytics && (
          <>
            {!layoutInsights || (!weakestChars.length && !weakestBigrams.length && !weakestFingers.length && !rowInsights.length && !rhythmInsight) ? (
              <p style={{ opacity: 0.5 }}>Пока недостаточно данных. Заверши несколько практик, чтобы увидеть аналитику.</p>
            ) : (
              <div className="smart-stats-grid">
                <div className="smart-stats-card">
                  <div className="smart-stats-head">
                    <h5>Слабые буквы</h5>
                    <span>Ошибки + медленное нажатие</span>
                  </div>
                  {weakestChars.length === 0 ? (
                    <p className="smart-stats-empty">Пока все ровно.</p>
                  ) : (
                    <div className="smart-stats-list">
                      {weakestChars.map(item => (
                        <div key={item.char} className="smart-stat-row">
                          <div className="smart-stat-main">
                            <span className="smart-stat-token mono">{item.char.toUpperCase()}</span>
                            <span className="smart-stat-reason">
                              {item.errorRate}% ошибок · {item.avgMs}мс
                            </span>
                          </div>
                          <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="smart-stats-card">
                  <div className="smart-stats-head">
                    <h5>Слабые сочетания</h5>
                    <span>Ошибки перехода и потеря темпа</span>
                  </div>
                  {weakestBigrams.length === 0 ? (
                    <p className="smart-stats-empty">Недостаточно данных по биграммам.</p>
                  ) : (
                    <div className="smart-stats-list">
                      {weakestBigrams.map(item => (
                        <div key={item.bigram} className="smart-stat-row">
                          <div className="smart-stat-main">
                            <span className="smart-stat-token mono">{item.bigram.toUpperCase()}</span>
                            <span className="smart-stat-reason">
                              {item.errorRate}% сбоев · {item.avgMs}мс
                            </span>
                          </div>
                          <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="smart-stats-card">
                  <div className="smart-stats-head">
                    <h5>Пальцы и ряды</h5>
                    <span>Где копится нагрузка</span>
                  </div>
                  <div className="smart-stats-dual">
                    <div>
                      <span className="smart-stats-subtitle">Пальцы</span>
                      {weakestFingers.length === 0 ? (
                        <p className="smart-stats-empty">Пока без явного перекоса.</p>
                      ) : (
                        <div className="smart-stats-list compact">
                          {weakestFingers.map(item => (
                            <div key={item.finger} className="smart-stat-row">
                              <div className="smart-stat-main">
                                <span className="smart-stat-token">{FINGER_LABELS[item.finger]}</span>
                                <span className="smart-stat-reason">
                                  {item.errorRate}% ошибок · {item.avgMs}мс
                                </span>
                              </div>
                              <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="smart-stats-subtitle">Ряды</span>
                      {rowInsights.length === 0 ? (
                        <p className="smart-stats-empty">Ряды пока выровнены.</p>
                      ) : (
                        <div className="smart-stats-list compact">
                          {rowInsights.map(item => (
                            <div key={item.row} className="smart-stat-row">
                              <div className="smart-stat-main">
                                <span className="smart-stat-token">{ROW_LABELS[item.row]}</span>
                                <span className="smart-stat-reason">
                                  {item.errorRate}% ошибок · {item.avgMs}мс
                                </span>
                              </div>
                              <span className="smart-stat-score">{Math.round(item.entry.weakness)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="smart-stats-card">
                  <div className="smart-stats-head">
                    <h5>Ритм печати</h5>
                    <span>Насколько ровно держится темп</span>
                  </div>
                  {!rhythmInsight ? (
                    <p className="smart-stats-empty">Пока недостаточно интервалов для оценки ритма.</p>
                  ) : (
                    <div className="smart-rhythm-card">
                      <div className="smart-rhythm-score">
                        <b>{Math.round(rhythmInsight.score)}%</b>
                        <span>оценка ритма</span>
                      </div>
                      <div className="smart-rhythm-meta">
                        <span>Средний интервал: {rhythmInsight.avgInterval}мс</span>
                        <span>Среднее отклонение: {rhythmInsight.avgDeviation}мс</span>
                        <span>Сэмплов: {rhythmInsight.samples}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
