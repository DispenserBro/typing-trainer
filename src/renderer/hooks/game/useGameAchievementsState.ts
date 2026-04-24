import { useCallback, useEffect, useState } from 'react';
import type { GameAchievementDefinition } from '../../../shared/types';
import { GAME_EQUIPMENT_SLOTS } from '../../../core/game/items';
import type { EquippedEntry } from '../../../core/game/viewTypes';

type UseGameAchievementsStateArgs = {
  stableEquippedItems: EquippedEntry[];
  unlockGameAchievements: (achievementIds: string[]) => GameAchievementDefinition[];
};

export function useGameAchievementsState({
  stableEquippedItems,
  unlockGameAchievements,
}: UseGameAchievementsStateArgs) {
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<GameAchievementDefinition[]>([]);

  const queueAchievementToasts = useCallback((achievementIds: string[]) => {
    const unlocked = unlockGameAchievements(achievementIds);
    if (!unlocked.length) return;
    setAchievementToasts(prev => [...prev, ...unlocked]);
  }, [unlockGameAchievements]);

  const handleRemoveToast = useCallback((achievementIndex: number) => {
    setAchievementToasts(prev => prev.filter((_, idx) => idx !== achievementIndex));
  }, []);

  const openAchievementsModal = useCallback(() => setShowAchievementsModal(true), []);
  const closeAchievementsModal = useCallback(() => setShowAchievementsModal(false), []);

  useEffect(() => {
    if (!achievementToasts.length) return;
    const timeout = setTimeout(() => {
      setAchievementToasts(prev => prev.slice(1));
    }, 4200);
    return () => clearTimeout(timeout);
  }, [achievementToasts]);

  useEffect(() => {
    const equippedHighestRarityItems = stableEquippedItems.filter(entry => entry.meta?.rarity === 3 && !entry.broken);
    const allTopRarityFilled = equippedHighestRarityItems.length === GAME_EQUIPMENT_SLOTS.length
      && stableEquippedItems.every(entry => entry.meta?.rarity === 3 && !entry.broken);
    if (!allTopRarityFilled) return;
    queueAchievementToasts(['full-top-rarity-loadout']);
  }, [stableEquippedItems, queueAchievementToasts]);

  return {
    achievementToasts,
    closeAchievementsModal,
    handleRemoveToast,
    openAchievementsModal,
    queueAchievementToasts,
    showAchievementsModal,
  };
}
