import {
  mergeAddonAchievements,
  mergeAddonItems,
} from '../../core/addons/addonMerger';
import { runAllMods } from '../../core/addons/modRunner';
import { GAME_ACHIEVEMENT_CATALOG } from '../../core/game/gameAchievements';
import { GAME_ITEM_CATALOG } from '../../core/game/items';
import type {
  GameAchievementDefinition,
  GameItemDefinition,
  InstalledAddon,
  InstalledMod,
  LayoutsData,
  Lesson,
  ModLocaleResourceFile,
  UserSettings,
} from '../../shared/types';
import type { ModAPIState } from '../../core/addons/modApi';

export type ResolvedModEffectState = {
  state: ModAPIState;
  errors: Array<{ modId: string; error: string }>;
  itemCatalog: GameItemDefinition[];
  achievementCatalog: GameAchievementDefinition[];
  disabledSections: string[];
  ruleOverrides: Map<string, unknown>;
  settingOverrides: Map<string, unknown>;
  cssSnippets: string[];
  panels: ModAPIState['panels'];
  modes: ModAPIState['registeredModes'];
  interfaceLocales: ModAPIState['interfaceLocales'];
};

type ResolveModEffectStateArgs = {
  mods: InstalledMod[];
  addons: InstalledAddon[];
  settings: UserSettings;
  words: string[];
  layouts: LayoutsData;
  readModScript: (modId: string) => Promise<string | null>;
  readModLocaleResources: (modId: string) => Promise<ModLocaleResourceFile[]>;
};

function applyItemCatalogEffects(
  items: GameItemDefinition[],
  state: ModAPIState,
): GameItemDefinition[] {
  let finalItems = items.filter(item => !state.removedItemIds.has(item.id));
  for (const [id, replacement] of state.replacedItems) {
    finalItems = finalItems.filter(item => item.id !== id);
    finalItems.push(replacement);
  }
  finalItems.push(...state.addedItems);
  return finalItems;
}

function applyAchievementCatalogEffects(
  achievements: GameAchievementDefinition[],
  state: ModAPIState,
): GameAchievementDefinition[] {
  let finalAchievements = achievements.filter(achievement => !state.removedAchievementIds.has(achievement.id));
  for (const [id, replacement] of state.replacedAchievements) {
    finalAchievements = finalAchievements.filter(achievement => achievement.id !== id);
    finalAchievements.push(replacement);
  }
  finalAchievements.push(...state.addedAchievements.map(achievement => ({
    ...achievement,
    category: achievement.category || 'game',
  })));
  return finalAchievements;
}

export function hasModWordEffects(state: ModAPIState): boolean {
  return state.addedWords.length > 0 || state.removedWords.size > 0;
}

export function applyModWordEffects(words: string[], state: ModAPIState): string[] {
  let nextWords = state.removedWords.size > 0
    ? words.filter(word => !state.removedWords.has(word))
    : [...words];

  if (state.addedWords.length > 0) {
    const uniqueWords = new Set(nextWords);
    for (const word of state.addedWords) uniqueWords.add(word);
    nextWords = Array.from(uniqueWords);
  }

  return nextWords;
}

export function hasModLessonEffects(state: ModAPIState): boolean {
  return state.addedLessons.size > 0
    || state.removedLessonIds.size > 0
    || state.replacedLessons.size > 0;
}

export function applyModLessonEffects(layouts: LayoutsData, state: ModAPIState): LayoutsData {
  const nextLayouts = { ...layouts.layouts };

  for (const [layoutId, ids] of state.removedLessonIds) {
    if (!nextLayouts[layoutId]) continue;
    nextLayouts[layoutId] = {
      ...nextLayouts[layoutId],
      lessonOrder: nextLayouts[layoutId].lessonOrder.filter(lesson => !ids.has(lesson.id)),
    };
  }

  for (const [layoutId, replacements] of state.replacedLessons) {
    if (!nextLayouts[layoutId]) continue;
    nextLayouts[layoutId] = {
      ...nextLayouts[layoutId],
      lessonOrder: nextLayouts[layoutId].lessonOrder.map(lesson => (
        replacements.has(lesson.id) ? replacements.get(lesson.id)! : lesson
      )),
    };
  }

  for (const [layoutId, lessons] of state.addedLessons) {
    if (!nextLayouts[layoutId]) continue;
    const existingIds = new Set(nextLayouts[layoutId].lessonOrder.map(lesson => lesson.id));
    const newLessons = lessons.filter(lesson => !existingIds.has(lesson.id));
    if (newLessons.length === 0) continue;
    nextLayouts[layoutId] = {
      ...nextLayouts[layoutId],
      lessonOrder: [...nextLayouts[layoutId].lessonOrder, ...newLessons],
    };
  }

  return {
    ...layouts,
    layouts: nextLayouts,
  };
}

export async function resolveModEffectState({
  mods,
  addons,
  settings,
  words,
  layouts,
  readModScript,
  readModLocaleResources,
}: ResolveModEffectStateArgs): Promise<ResolvedModEffectState> {
  const items = mergeAddonItems(GAME_ITEM_CATALOG, addons);
  const achievements = mergeAddonAchievements(GAME_ACHIEVEMENT_CATALOG, addons);

  const { state, errors } = await runAllMods(
    mods,
    readModScript,
    readModLocaleResources,
    () => settings,
    () => items,
    () => achievements,
    () => words,
    (layoutId): Lesson[] => layouts.layouts[layoutId]?.lessonOrder ?? [],
  );

  return {
    state,
    errors,
    itemCatalog: applyItemCatalogEffects(items, state),
    achievementCatalog: applyAchievementCatalogEffects(achievements, state),
    disabledSections: [...state.disabledSections],
    ruleOverrides: new Map(state.ruleOverrides),
    settingOverrides: new Map(state.settingOverrides),
    cssSnippets: [...state.cssSnippets],
    panels: state.panels.filter(panel => !state.removedPanelIds.has(panel.id)),
    modes: state.registeredModes.filter(mode => !state.unregisteredModeIds.has(mode.id)),
    interfaceLocales: state.interfaceLocales,
  };
}
