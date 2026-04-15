import type { Dispatch, SetStateAction } from 'react';
import type {
  CharStat,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
  Progress,
} from '../../shared/types';

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
    extras?: {
      contentScenarioId?: PracticeContentScenarioId;
      trainingMode?: PracticeTrainingMode;
      contentMode?: PracticeContentMode;
      durationSeconds?: number;
      gameLevel?: number;
      gameStageType?: 'normal' | 'boss';
      passed?: boolean;
      victory?: boolean;
      timedOut?: boolean;
      charStats?: Record<string, CharStat>;
    },
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
        contentScenarioId: extras?.contentScenarioId,
        trainingMode: extras?.trainingMode,
        contentMode: extras?.contentMode,
        durationSeconds: extras?.durationSeconds != null
          ? Math.max(0, Math.round(extras.durationSeconds * 10) / 10)
          : undefined,
        gameLevel: extras?.gameLevel != null ? Math.max(1, Math.floor(extras.gameLevel)) : undefined,
        gameStageType: extras?.gameStageType,
        passed: extras?.passed,
        victory: extras?.victory,
        timedOut: extras?.timedOut,
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
