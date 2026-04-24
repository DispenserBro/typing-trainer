import { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameAchievementDefinition } from '../../../shared/types';
import { checkAchievements, type AchievementEvent } from '../../../core/achievements/achievementEngine';

type UseModeAchievementsArgs = {
  category: 'practice' | 'test';
  gameAchievementCatalog: GameAchievementDefinition[];
  unlockedAchievementIds: string[];
  unlockAchievements: (ids: string[]) => GameAchievementDefinition[];
};

export function useModeAchievements({
  category,
  gameAchievementCatalog,
  unlockedAchievementIds,
  unlockAchievements,
}: UseModeAchievementsArgs) {
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);

  const handleAchievementEvent = useCallback((event: AchievementEvent) => {
    const newlyUnlockedIds = checkAchievements(
      gameAchievementCatalog,
      new Set(unlockedAchievementIds),
      event,
    );
    if (newlyUnlockedIds.length === 0) return;

    const unlockedObjects = unlockAchievements(newlyUnlockedIds);
    if (unlockedObjects.length > 0) {
      setAchievementToasts(prev => [...prev, ...unlockedObjects]);
    }
  }, [gameAchievementCatalog, unlockedAchievementIds, unlockAchievements]);

  const handleRemoveToast = useCallback((achievementIndex: number) => {
    setAchievementToasts(prev => prev.filter((_, idx) => idx !== achievementIndex));
  }, []);

  const achievementCatalog = useMemo(
    () => gameAchievementCatalog.filter(a => (a.category ?? 'game') === category),
    [category, gameAchievementCatalog],
  );

  const unlockedCount = useMemo(
    () => achievementCatalog.filter(a => unlockedAchievementIds.includes(a.id)).length,
    [achievementCatalog, unlockedAchievementIds],
  );

  useEffect(() => {
    if (!achievementToasts.length) return;
    const timeout = setTimeout(() => {
      setAchievementToasts(prev => prev.slice(1));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [achievementToasts]);

  return {
    achievementCatalog,
    achievementToasts,
    handleAchievementEvent,
    handleRemoveToast,
    setShowAchievements,
    showAchievements,
    unlockedCount,
  };
}
