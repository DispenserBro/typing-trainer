import type {
  LayoutPracticeInsights,
  PracticeRhythmSessionEntry,
} from '../../shared/types';
import {
  normalizeLayoutPracticeInsights,
  normalizePracticeRhythmSessionEntry,
  resolvePracticeInsights,
  resolvePracticeRhythmHistory,
} from './appResolvers';
import type { ProgressUpdater } from './progressUpdate';

type PracticeActionsArgs = {
  commitProgress: (updater: ProgressUpdater) => void;
  currentLayout: string;
};

export function createPracticeActions({
  commitProgress,
  currentLayout,
}: PracticeActionsArgs) {
  const savePracticeInsights = (insights: LayoutPracticeInsights) => {
    const normalizedInsights = normalizeLayoutPracticeInsights(insights);
    commitProgress(prev => {
      const currentInsights = prev.practiceInsights ?? resolvePracticeInsights(prev);
      const currentLayoutInsights = currentInsights.byLayout[currentLayout];
      if (currentLayoutInsights === normalizedInsights) return prev;

      return {
        ...prev,
        practiceInsights: {
          ...currentInsights,
          byLayout: {
            ...currentInsights.byLayout,
            [currentLayout]: normalizedInsights,
          },
        },
      };
    });
  };

  const savePracticeRhythmSession = (
    entry: Omit<PracticeRhythmSessionEntry, 'id' | 'date'> & { id?: string; date?: string },
  ) => {
    const normalizedEntry = normalizePracticeRhythmSessionEntry(entry);
    commitProgress(prev => {
      const currentHistory = prev.practiceRhythmHistory ?? resolvePracticeRhythmHistory(prev);
      const currentLayoutHistory = currentHistory[currentLayout] ?? [];
      const nextLayoutHistory = [...currentLayoutHistory, normalizedEntry].slice(-30);

      return {
        ...prev,
        practiceRhythmHistory: {
          ...currentHistory,
          [currentLayout]: nextLayoutHistory,
        },
      };
    });
  };

  return {
    savePracticeInsights,
    savePracticeRhythmSession,
  };
}
