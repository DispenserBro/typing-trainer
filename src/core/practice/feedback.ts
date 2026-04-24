import type {
  CharStat,
  FingerName,
  LayoutPracticeInsights,
  TranslationParams,
} from '../../shared/types';
import { i18n } from '../i18n';
import { getRhythmScore } from './insights';

export const PRACTICES_PER_UNLOCK = 3;

type TranslateFn = (key: string, params?: TranslationParams) => string;

const translateWithI18n: TranslateFn = (key, params) =>
  i18n.t(key, params ?? {}) as string;

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

function getFingerLabel(finger: FingerName, t: TranslateFn) {
  return t(`stats.fingers.${finger}`);
}

function getRhythmLabel(score: number, t: TranslateFn) {
  if (score >= 92) return t('practice.feedback.rhythmLabels.even');
  if (score >= 82) return t('practice.feedback.rhythmLabels.good');
  if (score >= 72) return t('practice.feedback.rhythmLabels.unstable');
  return t('practice.feedback.rhythmLabels.dropping');
}

export function buildPracticeFeedback(
  insights: LayoutPracticeInsights,
  fallbackWorstChar: string | null,
  t: TranslateFn = translateWithI18n,
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
    weakestFinger: weakestFingerKey ? getFingerLabel(weakestFingerKey, t) : null,
    rhythmScore,
    rhythmLabel: getRhythmLabel(rhythmScore, t),
  };
}
