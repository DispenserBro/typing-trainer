import type { Dispatch, SetStateAction } from 'react';
import type { CharStat, PracticeTrainingMode, Progress } from '../../shared/types';

type PersistProgress = (next: Progress) => void;

type StatsActionsArgs = {
  setProgress: Dispatch<SetStateAction<Progress>>;
  persistProgress: PersistProgress;
  currentLayout: string;
};

export function createStatsActions({
  setProgress,
  persistProgress,
  currentLayout,
}: StatsActionsArgs) {
  const saveCharStats = (charStats: Record<string, CharStat>) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.keyStats) next.keyStats = {};
      if (!next.keyStats[currentLayout]) next.keyStats[currentLayout] = {};

      const layoutStats = next.keyStats[currentLayout];
      for (const [char, data] of Object.entries(charStats)) {
        if (!layoutStats[char]) layoutStats[char] = { hits: 0, misses: 0, totalTime: 0 };
        layoutStats[char].hits += data.hits;
        layoutStats[char].misses += data.misses;
        layoutStats[char].totalTime += data.totalTime;
      }

      persistProgress(next);
      return { ...next };
    });
  };

  const saveHistory = (
    mode: 'test' | 'lesson' | 'practice' | 'game',
    wpm: number,
    acc: number,
    extras?: { trainingMode?: PracticeTrainingMode; charStats?: Record<string, CharStat> },
  ) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.history) next.history = {};
      if (!next.history[currentLayout]) next.history[currentLayout] = [];

      next.history[currentLayout].push({
        date: new Date().toISOString(),
        mode,
        wpm: Math.round(wpm),
        acc: Math.round(acc * 10) / 10,
        trainingMode: extras?.trainingMode,
        charStats: extras?.charStats
          ? Object.fromEntries(
            Object.entries(extras.charStats).map(([char, stat]) => [
              char,
              {
                hits: Math.max(0, Math.floor(stat.hits || 0)),
                misses: Math.max(0, Math.floor(stat.misses || 0)),
                totalTime: Math.max(0, Number(stat.totalTime || 0)),
              },
            ]),
          )
          : undefined,
      });

      if (next.history[currentLayout].length > 500) {
        next.history[currentLayout] = next.history[currentLayout].slice(-500);
      }

      persistProgress(next);
      return { ...next };
    });
  };

  return {
    saveCharStats,
    saveHistory,
  };
}
