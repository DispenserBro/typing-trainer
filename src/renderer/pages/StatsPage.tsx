import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  FingerName,
  HistoryEntry,
  PracticeBigramInsight,
  PracticeInsightAggregate,
} from '../../shared/types';
import { OverallProgressCharts } from '../components/stats/StatsCharts';
import { StatsFilterBar } from '../components/stats/StatsFilterBar';
import { StatsInsightsSection } from '../components/stats/StatsInsightsSection';
import { StatsKeysSection } from '../components/stats/StatsKeysSection';
import { StatsSessionsSection } from '../components/stats/StatsSessionsSection';
import { StatsSummaryCards } from '../components/stats/StatsSummaryCards';
import { useApp } from '../contexts/AppContext';
import { formatSpeed, speedLabel } from '../../core/engine';
import { getRhythmScore } from '../../core/practice/insights';
import {
  FINGER_LABELS,
  MODE_OPTIONS,
  PERIOD_OPTIONS,
  ROW_LABELS,
  aggregateCharStats,
  findMatchingRhythmSession,
  formatAggregateMeta,
  formatBigramMeta,
  formatModeLabel,
  formatSessionTimestamp,
  formatSessionTooltipTimestamp,
  getBestStableRun,
  getTrendSummary,
  getWorstKeysFromCharStats,
  isWithinPeriod,
  type ScopedHistoryEntry,
  type ScopedRhythmSession,
  type SessionHistoryItem,
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from '../../core/stats/utils';

export function StatsPage() {
  const { progress, currentLayout, layouts, settings, practiceInsights, practiceRhythmHistory } = useApp();
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('all');
  const [statsMode, setStatsMode] = useState<StatsModeFilter>('all');
  const [layoutScope, setLayoutScope] = useState<StatsLayoutScope>('current');
  const [showOverallProgress, setShowOverallProgress] = useState(false);
  const [showKeyStats, setShowKeyStats] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(false);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState('');

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

  const keyStats = useMemo(
    () => aggregateCharStats(filteredCurrentLayoutHistory),
    [filteredCurrentLayoutHistory],
  );

  const allRhythmSessions = useMemo<ScopedRhythmSession[]>(
    () => Object.entries(practiceRhythmHistory ?? {}).flatMap(([layoutId, sessions]) =>
      (sessions ?? []).map(session => ({ layoutId, session })),
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

  const chartTimestamps = useMemo(
    () => filteredHistory.map(entry => formatSessionTooltipTimestamp(entry.date)),
    [filteredHistory],
  );
  const speedData = useMemo(
    () => filteredHistory.map(entry => Number(formatSpeed(entry.wpm, unit))),
    [filteredHistory, unit],
  );
  const accData = useMemo(
    () => filteredHistory.map(entry => entry.acc),
    [filteredHistory],
  );

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
    () => displayedRhythmSession
      ? displayedRhythmSession.session.intervals.map(() => displayedRhythmSession.session.averageInterval)
      : [],
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
    parts.push(modeOption?.label ?? 'Все');
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

  const worstKeys = useMemo(() => {
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
  }, [keyStats]);

  const heatmap = useMemo(() => {
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
      };
    });
  }, [allChars, keyStats]);

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
    return {
      score: getRhythmScore(layoutInsights.rhythm),
      avgInterval: Math.round(layoutInsights.rhythm.averageInterval),
      avgDeviation: Math.round(layoutInsights.rhythm.averageDeviation),
      samples: layoutInsights.rhythm.samples,
    };
  }, [layoutInsights]);

  const hasInsights = Boolean(
    layoutInsights
    && (weakestChars.length || weakestBigrams.length || weakestFingers.length || rowInsights.length || rhythmInsight),
  );

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Статистика</h1></div>

      <StatsSummaryCards
        bestSpeedLabel={bestSpeedEntry ? `${formatSpeed(bestSpeedEntry.wpm, unit)} ${speedLabel(unit)}` : '—'}
        bestSpeedNote={bestSpeedEntry ? `${formatModeLabel(bestSpeedEntry.mode)} · ${formatSessionTimestamp(bestSpeedEntry.date)}` : summaryScopeLabel}
        bestAccuracyLabel={bestAccuracyEntry ? `${Math.round(bestAccuracyEntry.acc)}%` : '—'}
        bestAccuracyNote={bestAccuracyEntry ? `${formatModeLabel(bestAccuracyEntry.mode)} · ${formatSessionTimestamp(bestAccuracyEntry.date)}` : summaryScopeLabel}
        bestRhythmLabel={bestRhythmSession ? `${Math.round(bestRhythmSession.session.rhythmScore)}%` : '—'}
        bestRhythmNote={bestRhythmSession
          ? `${bestRhythmSession.session.trainingMode === 'rhythm' ? 'Ритм' : 'Обычная'} · ${formatSessionTimestamp(bestRhythmSession.session.date)}`
          : 'Нет практик с ритм-данными'}
        weakestFingerLabel={weakestFingers[0] ? FINGER_LABELS[weakestFingers[0].finger] : '—'}
        weakestFingerNote={weakestFingers[0]
          ? `${weakestFingers[0].errorRate}% ошибок · ${weakestFingers[0].avgMs}мс · текущая раскладка`
          : 'Недостаточно накопленной аналитики'}
        weakestRowLabel={rowInsights[0] ? ROW_LABELS[rowInsights[0].row] : '—'}
        weakestRowNote={rowInsights[0]
          ? `${rowInsights[0].errorRate}% ошибок · ${rowInsights[0].avgMs}мс · текущая раскладка`
          : 'Ряды пока выровнены'}
        speedTrendTone={speedTrend.tone}
        speedTrendLabel={speedTrend.label}
        speedTrendNote={filteredHistory.length >= 4 ? `${speedTrend.formattedDelta} ${speedLabel(unit)}` : summaryScopeLabel}
        accuracyTrendTone={accuracyTrend.tone}
        accuracyTrendLabel={accuracyTrend.label}
        accuracyTrendNote={filteredHistory.length >= 4 ? `${accuracyTrend.formattedDelta} п.п.` : summaryScopeLabel}
      />

      <StatsFilterBar
        statsPeriod={statsPeriod}
        setStatsPeriod={setStatsPeriod}
        statsMode={statsMode}
        setStatsMode={setStatsMode}
        layoutScope={layoutScope}
        setLayoutScope={setLayoutScope}
      />

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

      <StatsKeysSection
        expanded={showKeyStats}
        onToggle={() => setShowKeyStats(prev => !prev)}
        currentLayout={currentLayout}
        keyStats={keyStats}
        worstKeys={worstKeys}
        heatmap={heatmap}
      />

      <StatsSessionsSection
        expanded={showSessions}
        onToggle={() => setShowSessions(prev => !prev)}
        unit={unit}
        filteredSessionHistory={filteredSessionHistory}
        selectedHistorySession={selectedHistorySession}
        selectedHistoryRhythm={selectedHistoryRhythm}
        displayedRhythmSession={displayedRhythmSession}
        rhythmLabels={rhythmLabels}
        rhythmData={rhythmData}
        rhythmAverageLine={rhythmAverageLine}
        rhythmWorstPoint={rhythmWorstPoint}
        rhythmStableRun={rhythmStableRun}
        selectedHistoryWorstKeys={selectedHistoryWorstKeys}
        onSelectSession={setSelectedHistorySessionId}
        getLayoutLabel={(layoutId) => layouts.layouts[layoutId]?.label ?? layoutId}
      />

      <StatsInsightsSection
        expanded={showSmartAnalytics}
        onToggle={() => setShowSmartAnalytics(prev => !prev)}
        hasInsights={hasInsights}
        weakestChars={weakestChars}
        weakestBigrams={weakestBigrams}
        weakestFingers={weakestFingers}
        rowInsights={rowInsights}
        rhythmInsight={rhythmInsight}
      />
    </section>
  );
}



