import type {
  HistoryEntry,
  TranslationParams,
} from '../../shared/types';
import {
  isBasePracticeHistoryEntry,
  isChallengeHistoryEntry,
  isFlawlessHistoryEntry,
  isSprintHistoryEntry,
} from '../history/selectors';

type TranslateFn = (key: string, options?: TranslationParams) => string;

export interface ModeFocusSnapshot {
  id: 'practice' | 'test' | 'survival';
  title: string;
  description: string;
  actionMode: string;
  attempts: number;
  bestEntry: HistoryEntry | null;
  lastEntry: HistoryEntry | null;
  emphasis: 'good' | 'warn' | 'neutral';
  recommendation: string;
}

export function pickBestHistoryEntry(entries: HistoryEntry[]) {
  if (!entries.length) return null;
  return entries.reduce<HistoryEntry | null>((best, entry) => {
    if (!best) return entry;
    if (entry.wpm !== best.wpm) return entry.wpm > best.wpm ? entry : best;
    if (entry.acc !== best.acc) return entry.acc > best.acc ? entry : best;
    return new Date(entry.date).getTime() > new Date(best.date).getTime() ? entry : best;
  }, null);
}

function buildModeFocusSnapshot(
  id: ModeFocusSnapshot['id'],
  title: string,
  description: string,
  actionMode: string,
  modeEntries: HistoryEntry[],
  recommendation: (
    attempts: number,
    best: HistoryEntry | null,
    last: HistoryEntry | null,
  ) => Pick<ModeFocusSnapshot, 'emphasis' | 'recommendation'>,
): ModeFocusSnapshot {
  const attempts = modeEntries.length;
  const bestEntry = pickBestHistoryEntry(modeEntries);
  const lastEntry = attempts > 0 ? modeEntries[attempts - 1]! : null;
  const feedback = recommendation(attempts, bestEntry, lastEntry);

  return {
    id,
    title,
    description,
    actionMode,
    attempts,
    bestEntry,
    lastEntry,
    emphasis: feedback.emphasis,
    recommendation: feedback.recommendation,
  };
}

function buildPracticeModeFocus(entries: HistoryEntry[], t: TranslateFn): ModeFocusSnapshot {
  return buildModeFocusSnapshot(
    'practice',
    t('records.modeFocus.practice.title'),
    t('records.modeFocus.practice.description'),
    'practice',
    entries,
    (attempts, best, last) => {
      if (attempts === 0) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.practice.recommendation.empty'),
        };
      }
      if ((last?.acc ?? 0) < 93) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.practice.recommendation.lowAccuracy'),
        };
      }
      if ((best?.wpm ?? 0) >= 60 && (best?.acc ?? 0) >= 96) {
        return {
          emphasis: 'good',
          recommendation: t('records.modeFocus.practice.recommendation.ready'),
        };
      }
      return {
        emphasis: 'neutral',
        recommendation: t('records.modeFocus.practice.recommendation.building'),
      };
    },
  );
}

function buildSprintModeFocus(entries: HistoryEntry[], t: TranslateFn): ModeFocusSnapshot {
  return buildModeFocusSnapshot(
    'test',
    t('records.modeFocus.test.title'),
    t('records.modeFocus.test.description'),
    'test',
    entries,
    (attempts, best, last) => {
      if (attempts === 0) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.test.recommendation.empty'),
        };
      }
      if ((last?.acc ?? best?.acc ?? 0) < 93) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.test.recommendation.lowAccuracy'),
        };
      }
      if ((best?.wpm ?? 0) >= 70 && (best?.acc ?? 0) >= 95) {
        return {
          emphasis: 'good',
          recommendation: t('records.modeFocus.test.recommendation.ready'),
        };
      }
      return {
        emphasis: 'neutral',
        recommendation: t('records.modeFocus.test.recommendation.building'),
      };
    },
  );
}

function buildSurvivalModeFocus(
  survivalEntries: HistoryEntry[],
  flawlessEntries: HistoryEntry[],
  t: TranslateFn,
): ModeFocusSnapshot {
  return buildModeFocusSnapshot(
    'survival',
    t('records.modeFocus.survival.title'),
    t('records.modeFocus.survival.description'),
    'survival',
    survivalEntries,
    (attempts, best, last) => {
      if (attempts === 0) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.survival.recommendation.empty'),
        };
      }
      if (flawlessEntries.length > 0 && (best?.acc ?? 0) >= 98) {
        return {
          emphasis: 'good',
          recommendation: t('records.modeFocus.survival.recommendation.flawlessReady'),
        };
      }
      if ((last?.acc ?? best?.acc ?? 0) < 94) {
        return {
          emphasis: 'warn',
          recommendation: t('records.modeFocus.survival.recommendation.lowAccuracy'),
        };
      }
      if ((best?.acc ?? 0) >= 96 && (best?.wpm ?? 0) >= 55) {
        return {
          emphasis: 'good',
          recommendation: t('records.modeFocus.survival.recommendation.ready'),
        };
      }
      return {
        emphasis: 'neutral',
        recommendation: flawlessEntries.length > 0
          ? t('records.modeFocus.survival.recommendation.buildingWithFlawless')
          : t('records.modeFocus.survival.recommendation.building'),
      };
    },
  );
}

export function buildModeFocusSnapshots(entries: HistoryEntry[], t: TranslateFn): ModeFocusSnapshot[] {
  const basePracticeEntries = entries.filter(isBasePracticeHistoryEntry);
  const sprintEntries = entries.filter(isSprintHistoryEntry);
  const survivalEntries = entries.filter(isChallengeHistoryEntry);
  const flawlessEntries = entries.filter(isFlawlessHistoryEntry);

  return [
    buildPracticeModeFocus(basePracticeEntries, t),
    buildSprintModeFocus(sprintEntries, t),
    buildSurvivalModeFocus(survivalEntries, flawlessEntries, t),
  ];
}
