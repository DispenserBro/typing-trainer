import type {
  LayoutPracticeInsights,
  PracticeBigramInsight,
  PracticeInsightAggregate,
  PracticeRhythmInsight,
} from '../../../shared/types';

export function createAggregate(): PracticeInsightAggregate {
  return { hits: 0, misses: 0, totalTime: 0, weakness: 0 };
}

export function createBigramInsight(): PracticeBigramInsight {
  return { hits: 0, misses: 0, totalTransitionTime: 0, weakness: 0 };
}

export function createRhythmInsight(): PracticeRhythmInsight {
  return { samples: 0, averageInterval: 0, averageDeviation: 0, weakness: 0 };
}

export function createEmptyLayoutPracticeInsights(): LayoutPracticeInsights {
  return {
    chars: {},
    bigrams: {},
    fingers: {},
    rows: {
      top: createAggregate(),
      middle: createAggregate(),
      bottom: createAggregate(),
    },
    rhythm: createRhythmInsight(),
    lastUpdated: '',
  };
}

export function computeAggregateWeakness(aggregate: Pick<PracticeInsightAggregate, 'hits' | 'misses' | 'totalTime'>) {
  const attempts = aggregate.hits + aggregate.misses;
  if (attempts <= 0) return 0;

  const errorPenalty = (aggregate.misses / attempts) * 70;
  const averageTime = aggregate.hits > 0 ? aggregate.totalTime / aggregate.hits : 600;
  const speedPenalty = Math.min(30, Math.max(0, (averageTime - 220) / 8));
  return Math.round((errorPenalty + speedPenalty) * 10) / 10;
}

export function computeBigramWeakness(aggregate: Pick<PracticeBigramInsight, 'hits' | 'misses' | 'totalTransitionTime'>) {
  const attempts = aggregate.hits + aggregate.misses;
  if (attempts <= 0) return 0;

  const errorPenalty = (aggregate.misses / attempts) * 75;
  const averageTime = aggregate.hits > 0 ? aggregate.totalTransitionTime / aggregate.hits : 650;
  const speedPenalty = Math.min(25, Math.max(0, (averageTime - 240) / 10));
  return Math.round((errorPenalty + speedPenalty) * 10) / 10;
}

export function computeRhythmWeakness(rhythm: Pick<PracticeRhythmInsight, 'samples' | 'averageInterval' | 'averageDeviation'>) {
  if (rhythm.samples <= 0 || rhythm.averageInterval <= 0) return 0;
  const relativeDeviation = rhythm.averageDeviation / rhythm.averageInterval;
  return Math.round(Math.min(100, relativeDeviation * 100) * 10) / 10;
}

export function getRhythmScore(rhythm: Pick<PracticeRhythmInsight, 'samples' | 'averageInterval' | 'averageDeviation'>) {
  return Math.max(0, Math.round((100 - computeRhythmWeakness(rhythm)) * 10) / 10);
}
