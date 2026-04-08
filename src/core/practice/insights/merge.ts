import type { FingerName, LayoutPracticeInsights, PracticeInsightRow } from '../../../shared/types';
import {
  computeAggregateWeakness,
  computeBigramWeakness,
  computeRhythmWeakness,
  createAggregate,
  createBigramInsight,
  createEmptyLayoutPracticeInsights,
} from './core';

export function mergeLayoutPracticeInsights(
  base: LayoutPracticeInsights,
  delta: LayoutPracticeInsights,
): LayoutPracticeInsights {
  const next = createEmptyLayoutPracticeInsights();

  const mergedChars = new Set([...Object.keys(base.chars), ...Object.keys(delta.chars)]);
  for (const char of mergedChars) {
    const target = createAggregate();
    const prev = base.chars[char];
    const extra = delta.chars[char];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTime += prev.totalTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTime += extra.totalTime;
    }
    target.weakness = computeAggregateWeakness(target);
    next.chars[char] = target;
  }

  const mergedBigrams = new Set([...Object.keys(base.bigrams), ...Object.keys(delta.bigrams)]);
  for (const bigram of mergedBigrams) {
    const target = createBigramInsight();
    const prev = base.bigrams[bigram];
    const extra = delta.bigrams[bigram];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTransitionTime += prev.totalTransitionTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTransitionTime += extra.totalTransitionTime;
    }
    target.weakness = computeBigramWeakness(target);
    next.bigrams[bigram] = target;
  }

  const mergedFingers = new Set([
    ...Object.keys(base.fingers),
    ...Object.keys(delta.fingers),
  ]) as Set<FingerName>;
  for (const finger of mergedFingers) {
    const target = createAggregate();
    const prev = base.fingers[finger];
    const extra = delta.fingers[finger];
    if (prev) {
      target.hits += prev.hits;
      target.misses += prev.misses;
      target.totalTime += prev.totalTime;
    }
    if (extra) {
      target.hits += extra.hits;
      target.misses += extra.misses;
      target.totalTime += extra.totalTime;
    }
    target.weakness = computeAggregateWeakness(target);
    next.fingers[finger] = target;
  }

  (['top', 'middle', 'bottom'] as PracticeInsightRow[]).forEach((row) => {
    const target = createAggregate();
    target.hits = base.rows[row].hits + delta.rows[row].hits;
    target.misses = base.rows[row].misses + delta.rows[row].misses;
    target.totalTime = base.rows[row].totalTime + delta.rows[row].totalTime;
    target.weakness = computeAggregateWeakness(target);
    next.rows[row] = target;
  });

  const rhythmSamples = base.rhythm.samples + delta.rhythm.samples;
  const averageInterval = rhythmSamples > 0
    ? ((base.rhythm.averageInterval * base.rhythm.samples) + (delta.rhythm.averageInterval * delta.rhythm.samples)) / rhythmSamples
    : 0;
  const averageDeviation = rhythmSamples > 0
    ? ((base.rhythm.averageDeviation * base.rhythm.samples) + (delta.rhythm.averageDeviation * delta.rhythm.samples)) / rhythmSamples
    : 0;

  next.rhythm = {
    samples: rhythmSamples,
    averageInterval,
    averageDeviation,
    weakness: computeRhythmWeakness({ samples: rhythmSamples, averageInterval, averageDeviation }),
  };

  next.lastUpdated = delta.lastUpdated || base.lastUpdated;
  return next;
}
