import type {
  CharStat,
  PracticeContentMode,
  PracticeContentScenarioId,
  PracticeTrainingMode,
} from '../../shared/types';
import type { ProgressUpdater } from './progressUpdate';

type StatsActionsArgs = {
  commitProgress: (updater: ProgressUpdater) => void;
  currentLayout: string;
};

export function createStatsActions({
  commitProgress,
  currentLayout,
}: StatsActionsArgs) {
  const saveCharStats = (charStats: Record<string, CharStat>) => {
    const entries = Object.entries(charStats);
    if (entries.length === 0) return;

    commitProgress(prev => {
      const currentKeyStats = prev.keyStats ?? {};
      const currentLayoutStats = currentKeyStats[currentLayout] ?? {};
      const nextLayoutStats = { ...currentLayoutStats };
      let changed = false;

      for (const [char, data] of entries) {
        const current = nextLayoutStats[char] ?? { hits: 0, misses: 0, totalTime: 0 };
        const updated = {
          hits: current.hits + data.hits,
          misses: current.misses + data.misses,
          totalTime: current.totalTime + data.totalTime,
        };
        if (
          updated.hits !== current.hits
          || updated.misses !== current.misses
          || updated.totalTime !== current.totalTime
        ) {
          nextLayoutStats[char] = updated;
          changed = true;
        }
      }

      if (!changed) return prev;

      return {
        ...prev,
        keyStats: {
          ...currentKeyStats,
          [currentLayout]: nextLayoutStats,
        },
      };
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
    commitProgress(prev => {
      const currentHistory = prev.history ?? {};
      const currentLayoutHistory = currentHistory[currentLayout] ?? [];
      const nextEntry = {
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
      };
      const nextLayoutHistory = [...currentLayoutHistory, nextEntry].slice(-500);

      return {
        ...prev,
        history: {
          ...currentHistory,
          [currentLayout]: nextLayoutHistory,
        },
      };
    });
  };

  return {
    saveCharStats,
    saveHistory,
  };
}
