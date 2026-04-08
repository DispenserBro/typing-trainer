import type {
  LayoutPracticeInsights,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeInsightsState,
  PracticeRhythmInsight,
  PracticeRhythmSessionEntry,
  Progress,
} from '../../shared/types';
import { createEmptyLayoutPracticeInsights } from '../../core/practice/insights';

export function normalizePracticeInsightAggregate(
  aggregate?: Partial<PracticeInsightAggregate>,
): PracticeInsightAggregate {
  return {
    hits: Math.max(0, Math.floor(aggregate?.hits ?? 0)),
    misses: Math.max(0, Math.floor(aggregate?.misses ?? 0)),
    totalTime: Math.max(0, Number(aggregate?.totalTime ?? 0)),
    weakness: Math.max(0, Number(aggregate?.weakness ?? 0)),
  };
}

export function normalizePracticeBigramInsight(
  aggregate?: Partial<PracticeBigramInsight>,
): PracticeBigramInsight {
  return {
    hits: Math.max(0, Math.floor(aggregate?.hits ?? 0)),
    misses: Math.max(0, Math.floor(aggregate?.misses ?? 0)),
    totalTransitionTime: Math.max(0, Number(aggregate?.totalTransitionTime ?? 0)),
    weakness: Math.max(0, Number(aggregate?.weakness ?? 0)),
  };
}

export function normalizePracticeRhythmInsight(
  rhythm?: Partial<PracticeRhythmInsight>,
): PracticeRhythmInsight {
  return {
    samples: Math.max(0, Math.floor(rhythm?.samples ?? 0)),
    averageInterval: Math.max(0, Number(rhythm?.averageInterval ?? 0)),
    averageDeviation: Math.max(0, Number(rhythm?.averageDeviation ?? 0)),
    weakness: Math.max(0, Number(rhythm?.weakness ?? 0)),
  };
}

export function normalizeLayoutPracticeInsights(
  insights?: Partial<LayoutPracticeInsights>,
): LayoutPracticeInsights {
  const empty = createEmptyLayoutPracticeInsights();
  const chars = Object.fromEntries(
    Object.entries(insights?.chars ?? {}).map(([char, aggregate]) => [
      char.toLowerCase(),
      normalizePracticeInsightAggregate(aggregate),
    ]),
  );
  const bigrams = Object.fromEntries(
    Object.entries(insights?.bigrams ?? {}).map(([bigram, aggregate]) => [
      bigram.toLowerCase(),
      normalizePracticeBigramInsight(aggregate),
    ]),
  );
  const fingers = Object.fromEntries(
    Object.entries(insights?.fingers ?? {}).map(([finger, aggregate]) => [
      finger,
      normalizePracticeInsightAggregate(aggregate),
    ]),
  ) as LayoutPracticeInsights['fingers'];

  return {
    chars,
    bigrams,
    fingers,
    rows: {
      top: normalizePracticeInsightAggregate(insights?.rows?.top ?? empty.rows.top),
      middle: normalizePracticeInsightAggregate(insights?.rows?.middle ?? empty.rows.middle),
      bottom: normalizePracticeInsightAggregate(insights?.rows?.bottom ?? empty.rows.bottom),
    },
    rhythm: normalizePracticeRhythmInsight(insights?.rhythm ?? empty.rhythm),
    lastUpdated: typeof insights?.lastUpdated === 'string' ? insights.lastUpdated : '',
  };
}

export function resolvePracticeInsights(progress: Progress): PracticeInsightsState {
  return {
    byLayout: Object.fromEntries(
      Object.entries(progress.practiceInsights?.byLayout ?? {}).map(([layoutId, insights]) => [
        layoutId,
        normalizeLayoutPracticeInsights(insights),
      ]),
    ),
  };
}

export function normalizePracticeRhythmSessionEntry(
  entry?: Partial<PracticeRhythmSessionEntry>,
): PracticeRhythmSessionEntry {
  const intervals = Array.isArray(entry?.intervals)
    ? entry.intervals
      .map(value => Math.max(0, Math.round(Number(value) || 0)))
      .filter(value => value > 0)
      .slice(0, 300)
    : [];

  const averageInterval = Math.max(0, Number(entry?.averageInterval ?? 0));
  const averageDeviation = Math.max(0, Number(entry?.averageDeviation ?? 0));
  const worstInterval = Math.max(0, Number(entry?.worstInterval ?? 0));
  const mode = entry?.trainingMode === 'rhythm' ? 'rhythm' : 'normal';

  return {
    id: typeof entry?.id === 'string' && entry.id ? entry.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: typeof entry?.date === 'string' ? entry.date : new Date().toISOString(),
    trainingMode: mode,
    wpm: Math.max(0, Math.round(Number(entry?.wpm ?? 0) * 10) / 10),
    acc: Math.max(0, Math.round(Number(entry?.acc ?? 0) * 10) / 10),
    textLength: Math.max(0, Math.floor(Number(entry?.textLength ?? 0))),
    intervals,
    averageInterval,
    averageDeviation,
    rhythmScore: Math.max(0, Math.min(100, Math.round(Number(entry?.rhythmScore ?? 0) * 10) / 10)),
    worstInterval,
  };
}

export function resolvePracticeRhythmHistory(progress: Progress): Record<string, PracticeRhythmSessionEntry[]> {
  return Object.fromEntries(
    Object.entries(progress.practiceRhythmHistory ?? {}).map(([layoutId, entries]) => [
      layoutId,
      (Array.isArray(entries) ? entries : [])
        .map(entry => normalizePracticeRhythmSessionEntry(entry))
        .slice(-30),
    ]),
  );
}

