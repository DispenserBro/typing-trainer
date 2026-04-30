import type { AchievementCategory, GameAchievementDefinition } from '../../shared/types';

export type AchievementListItemViewModel = {
  achievement: GameAchievementDefinition;
  unlocked: boolean;
};

export type AchievementsModalViewModel = {
  categories: string[];
  effectiveFilter: string | null;
  items: AchievementListItemViewModel[];
  totalCount: number;
  unlockedCount: number;
};

function getAchievementCategory(achievement: GameAchievementDefinition, fallbackCategory: AchievementCategory) {
  return achievement.category || fallbackCategory;
}

export function buildAchievementsModalViewModel(args: {
  achievementCatalog: GameAchievementDefinition[];
  activeCategory?: string | null;
  categoryFilter?: AchievementCategory;
  fallbackCategory?: AchievementCategory;
  unlockedAchievementIds: string[];
}): AchievementsModalViewModel {
  const {
    achievementCatalog,
    activeCategory = null,
    categoryFilter,
    fallbackCategory = 'game',
    unlockedAchievementIds,
  } = args;
  const unlockedSet = new Set(unlockedAchievementIds);
  const categories: string[] = [];
  const seenCategories = new Set<string>();

  for (const achievement of achievementCatalog) {
    const category = getAchievementCategory(achievement, fallbackCategory);
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    categories.push(category);
  }

  const effectiveFilter = categoryFilter ?? activeCategory ?? null;
  const filteredAchievements = effectiveFilter
    ? achievementCatalog.filter(achievement => getAchievementCategory(achievement, fallbackCategory) === effectiveFilter)
    : achievementCatalog;
  const items = filteredAchievements.map(achievement => ({
    achievement,
    unlocked: unlockedSet.has(achievement.id),
  }));

  return {
    categories,
    effectiveFilter,
    items,
    totalCount: items.length,
    unlockedCount: items.filter(item => item.unlocked).length,
  };
}

export function buildGameAchievementsModalViewModel(args: {
  achievementCatalog: GameAchievementDefinition[];
  unlockedAchievementIds: string[];
}) {
  return buildAchievementsModalViewModel({
    achievementCatalog: args.achievementCatalog,
    categoryFilter: 'game',
    fallbackCategory: 'game',
    unlockedAchievementIds: args.unlockedAchievementIds,
  });
}
