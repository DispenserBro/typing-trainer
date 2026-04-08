import type { Dispatch, SetStateAction } from 'react';
import type {
  LayoutPracticeInsights,
  PracticeRhythmSessionEntry,
  Progress,
} from '../../shared/types';
import {
  normalizeLayoutPracticeInsights,
  normalizePracticeRhythmSessionEntry,
  resolvePracticeInsights,
  resolvePracticeRhythmHistory,
} from './appResolvers';

type PersistProgress = (next: Progress) => void;

type PracticeActionsArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  persistProgress: PersistProgress;
  currentLayout: string;
};

export function createPracticeActions({
  setProgress,
  persistProgress,
  currentLayout,
}: PracticeActionsArgs) {
  const savePracticeInsights = (insights: LayoutPracticeInsights) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.practiceInsights) {
        next.practiceInsights = resolvePracticeInsights(prev);
      }
      next.practiceInsights.byLayout[currentLayout] = normalizeLayoutPracticeInsights(insights);
      persistProgress(next);
      return { ...next };
    });
  };

  const savePracticeRhythmSession = (
    entry: Omit<PracticeRhythmSessionEntry, 'id' | 'date'> & { id?: string; date?: string },
  ) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.practiceRhythmHistory) {
        next.practiceRhythmHistory = resolvePracticeRhythmHistory(prev);
      }
      const normalized = normalizePracticeRhythmSessionEntry(entry);
      const current = next.practiceRhythmHistory[currentLayout] ?? [];
      next.practiceRhythmHistory[currentLayout] = [...current, normalized].slice(-30);
      persistProgress(next);
      return { ...next };
    });
  };

  return {
    savePracticeInsights,
    savePracticeRhythmSession,
  };
}
