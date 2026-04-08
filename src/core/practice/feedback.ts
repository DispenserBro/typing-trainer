import type {
  CharStat,
  FingerName,
  LayoutPracticeInsights,
} from '../../shared/types';
import { getRhythmScore } from './insights';

export const PRACTICES_PER_UNLOCK = 3;

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

export type PracticeFeedback = {
  weakestChar: string | null;
  weakestBigram: string | null;
  weakestFinger: string | null;
  rhythmScore: number;
  rhythmLabel: string;
};

export function mergeCharStats(
  base: Record<string, CharStat> | undefined,
  extra: Record<string, CharStat> | undefined,
): Record<string, CharStat> {
  const merged: Record<string, CharStat> = { ...(base ?? {}) };

  for (const [ch, stat] of Object.entries(extra ?? {})) {
    const prev = merged[ch] ?? { hits: 0, misses: 0, totalTime: 0 };
    merged[ch] = {
      hits: prev.hits + stat.hits,
      misses: prev.misses + stat.misses,
      totalTime: prev.totalTime + stat.totalTime,
    };
  }

  return merged;
}

function pickWeakestEntry<T extends { weakness: number; hits: number; misses: number }>(
  entries: [string, T][],
  minAttempts: number,
): string | null {
  const filtered = entries
    .filter(([, entry]) => (entry.hits + entry.misses) >= minAttempts && entry.weakness > 0)
    .sort((a, b) => b[1].weakness - a[1].weakness);

  return filtered[0]?.[0] ?? null;
}

function getRhythmLabel(score: number) {
  if (score >= 92) return 'Ровный темп';
  if (score >= 82) return 'Хороший темп';
  if (score >= 72) return 'Темп плавает';
  return 'Ритм проседает';
}

export function buildPracticeFeedback(
  insights: LayoutPracticeInsights,
  fallbackWorstChar: string | null,
): PracticeFeedback {
  const weakestChar = pickWeakestEntry(Object.entries(insights.chars), 4) ?? fallbackWorstChar;
  const weakestBigram = pickWeakestEntry(
    Object.entries(insights.bigrams).map(([bigram, entry]) => [
      bigram,
      { ...entry, totalTime: entry.totalTransitionTime },
    ]),
    3,
  );
  const weakestFingerKey = pickWeakestEntry(
    Object.entries(insights.fingers).filter(
      (entry): entry is [string, NonNullable<LayoutPracticeInsights['fingers'][FingerName]>] => Boolean(entry[1]),
    ),
    4,
  ) as FingerName | null;
  const rhythmScore = getRhythmScore(insights.rhythm);

  return {
    weakestChar,
    weakestBigram,
    weakestFinger: weakestFingerKey ? FINGER_LABELS[weakestFingerKey] : null,
    rhythmScore,
    rhythmLabel: getRhythmLabel(rhythmScore),
  };
}
