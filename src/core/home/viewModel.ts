import type {
  GameAchievementDefinition,
  GameState,
  LayoutsData,
  MotivationProgress,
  PracticeSettings,
  PracticeInsightsState,
  Progress,
  TranslationParams,
  UserSettings,
} from '../../shared/types';
import { EXERCISE_COUNT, filterYoKeys } from '../engine';
import { DAILY_RUN_LEVELS } from '../game/dailyRun';
import {
  countUnlockedAchievements,
  getReplayModeFromHistory,
  getReplayTitleFromHistory,
  summarizeDailyRunState,
  summarizeHomeHistory,
  summarizeLessonCompletion,
} from './summary';
import {
  getActiveMotivationGoalSnapshots,
  getMotivationStreakSnapshots,
  getMotivationWindowRemainingDays,
  getSeasonMotivationSnapshot,
  getWeeklyMotivationRecommendation,
  getWeeklyMotivationSnapshot,
} from '../motivation/progress';
import {
  buildHistoryFollowupRecommendation,
  buildHomePersonalRecordCards,
  buildLayoutMasterySnapshot,
  buildModeFocusSnapshots,
} from '../motivation/records';
import { formatLocaleDate } from '../i18n';
import { buildHomeHistoryMetrics } from './historyMetrics';
import {
  buildHomeModeFocusDetailCards,
  type HomeModeFocusDetailCardModel,
} from './modeFocusDetails';
import {
  buildHomePersonalRecordDetailCards,
  type HomePersonalRecordDetailCardModel,
} from './personalRecordDetails';

export type HomeActionId = 'continue-run' | 'replay-last' | 'start-practice' | 'lessons';
export type HomeModeCardId = 'practice' | 'test' | 'survival' | 'lessons' | 'game' | 'stats' | 'settings';
export type HomeDetailModalId = 'season' | 'mode-focus' | 'records' | 'mastery' | 'goals' | 'streaks';
export type HomeProgressCenterCardId = HomeDetailModalId;

export interface HomeActionModel {
  id: HomeActionId;
  title: string;
  description: string;
  meta: string;
  actionMode: string;
}

export type BuildHomeVisibleQuickActionsArgs = {
  actions: HomeActionModel[];
  currentRunActive: boolean;
  primaryActionMode: string;
  showSecondaryHeroAction: boolean;
};

export type HomeModeCardGroup<T extends { id: string }> = {
  primaryCards: T[];
  utilityCards: T[];
};

export type HomeProgressCenterVisibility<T> = {
  canToggle: boolean;
  visibleCards: T[];
};

export interface HomeModeCardModel {
  id: HomeModeCardId;
  title: string;
  description: string;
  meta: string;
  badge?: string;
}

export interface HomeRecommendationModel {
  title: string;
  description: string;
  actionLabel: string;
  actionMode: string;
}

export interface HomeHeroCopyModel {
  title: string;
  description: string;
}

export interface HomeSummaryCardModel {
  id: string;
  label: string;
  value: string;
  description: string;
  progressPercent?: number;
}

export interface HomeQuickInsightModel {
  id: string;
  label: string;
  value: string;
  description: string;
}

export interface HomeProgressCenterCardModel {
  id: HomeProgressCenterCardId;
  title: string;
  summary: string;
  description: string;
}

export interface HomeDetailMeta {
  title: string;
  description: string;
}

export type { HomeModeFocusDetailCardModel };
export type { HomePersonalRecordDetailCardModel };

type RecommendationCandidate = HomeRecommendationModel & {
  score: number;
};

type WeaknessHotspot = {
  kind: 'char' | 'bigram' | 'rhythm';
  label: string;
  weakness: number;
  detail: string;
};

export function buildHomeVisibleQuickActions({
  actions,
  currentRunActive,
  primaryActionMode,
  showSecondaryHeroAction,
}: BuildHomeVisibleQuickActionsArgs): HomeActionModel[] {
  return actions.filter((action) => {
    if (currentRunActive && action.id === 'continue-run') return false;
    if (!currentRunActive && primaryActionMode === 'practice' && action.id === 'start-practice') return false;
    if (!currentRunActive && primaryActionMode === 'lessons' && action.id === 'lessons') return false;
    if (showSecondaryHeroAction && action.id === 'replay-last') return false;
    return true;
  });
}

export function buildHomeModeCardGroups<T extends { id: string }>(
  cards: T[],
): HomeModeCardGroup<T> {
  return {
    primaryCards: cards.filter(card => card.id !== 'stats' && card.id !== 'settings'),
    utilityCards: cards.filter(card => card.id === 'stats' || card.id === 'settings'),
  };
}

export function buildHomeProgressCenterVisibility<T>(
  cards: T[],
  expanded: boolean,
  collapsedLimit = 3,
): HomeProgressCenterVisibility<T> {
  const limit = Math.max(0, Math.floor(collapsedLimit));
  return {
    canToggle: cards.length > limit,
    visibleCards: expanded ? cards : cards.slice(0, limit),
  };
}

type BuildHomePageViewModelArgs = {
  achievementCatalog: GameAchievementDefinition[];
  currentLayout: string;
  fmtSpeed: (wpm: number) => string;
  gameState: GameState;
  layouts: LayoutsData;
  motivationProgress: MotivationProgress;
  practiceSettings: PracticeSettings;
  progress: Progress;
  settings: UserSettings;
  speedLabel: string;
  translate: (key: string, params?: TranslationParams) => string;
  unlockedAchievementIds: string[];
  locale: string;
};

function formatShortDate(
  value: string | undefined,
  locale: string,
  t: (key: string, params?: TranslationParams) => string,
) {
  if (!value) return t('home.common.noData');
  return formatLocaleDate(value, locale, {
    day: '2-digit',
    month: 'short',
  }, t('home.common.noData'));
}

function formatChallengeProgress(current: number, target: number) {
  const displayCurrent = Number.isInteger(current) ? current.toString() : Math.round(current).toString();
  const displayTarget = Number.isInteger(target) ? target.toString() : Math.round(target).toString();
  return `${displayCurrent} / ${displayTarget}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pushRecommendationCandidate(
  candidates: RecommendationCandidate[],
  candidate: RecommendationCandidate | null,
) {
  if (candidate) candidates.push(candidate);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildWeaknessHotspot(
  layoutInsights: PracticeInsightsState['byLayout'][string] | undefined,
  t: (key: string, params?: TranslationParams) => string,
): WeaknessHotspot | null {
  if (!layoutInsights) return null;

  const charCandidate = Object.entries(layoutInsights.chars)
    .map(([char, entry]) => ({
      kind: 'char' as const,
      label: char.toUpperCase(),
      weakness: entry.weakness,
      attempts: entry.hits + entry.misses,
      avgTime: entry.hits > 0 ? Math.round(entry.totalTime / entry.hits) : 0,
      detail: t('home.viewModel.weakness.char', { label: char.toUpperCase() }),
    }))
    .filter(item => item.label !== ' ' && item.attempts >= 8 && item.weakness > 0);

  const bigramCandidate = Object.entries(layoutInsights.bigrams)
    .map(([bigram, entry]) => ({
      kind: 'bigram' as const,
      label: bigram.toUpperCase(),
      weakness: entry.weakness,
      attempts: entry.hits + entry.misses,
      avgTime: entry.hits > 0 ? Math.round(entry.totalTransitionTime / entry.hits) : 0,
      detail: t('home.viewModel.weakness.bigram', { label: bigram.toUpperCase() }),
    }))
    .filter(item => !item.label.includes(' ') && item.attempts >= 6 && item.weakness > 0);

  const rhythmCandidate = layoutInsights.rhythm.samples >= 6 && layoutInsights.rhythm.weakness > 0
    ? {
        kind: 'rhythm' as const,
        label: t('home.viewModel.weakness.rhythmLabel'),
        weakness: layoutInsights.rhythm.weakness,
        detail: t('home.viewModel.weakness.rhythm', {
          deviation: Math.round(layoutInsights.rhythm.averageDeviation),
        }),
      }
    : null;

  const candidates = [
    ...charCandidate,
    ...bigramCandidate,
    ...(rhythmCandidate ? [rhythmCandidate] : []),
  ];

  if (!candidates.length) return null;
  return candidates.sort((left, right) => right.weakness - left.weakness)[0] ?? null;
}

function getCompletionPressure(percent: number, remainingDays: number) {
  if (remainingDays <= 1 && percent < 100) return 1.2;
  if (remainingDays <= 2 && percent < 100) return 1.1;
  if (remainingDays >= 5 && percent < 50) return 0.95;
  return 1;
}

function buildHeroCopy(
  recommendation: HomeRecommendationModel,
  args: {
    currentRun: GameState['currentRun'] | null;
    currentHistoryCount: number;
    nextLessonNumber: number | null;
    t: (key: string, params?: TranslationParams) => string;
  },
): HomeHeroCopyModel {
  const { currentHistoryCount, currentRun, nextLessonNumber, t } = args;

  if (currentRun) {
    return {
      title: t('home.hero.dynamic.currentRun.title'),
      description: t('home.hero.dynamic.currentRun.description'),
    };
  }

  if (currentHistoryCount === 0 && nextLessonNumber !== null) {
    return {
      title: t('home.hero.dynamic.firstSteps.title'),
      description: t('home.hero.dynamic.firstSteps.description', { lesson: nextLessonNumber }),
    };
  }

  switch (recommendation.actionMode) {
    case 'lessons':
      return {
        title: t('home.hero.dynamic.lessons.title', { lesson: nextLessonNumber ?? 1 }),
        description: t('home.hero.dynamic.lessons.description'),
      };
    case 'test':
      return {
        title: t('home.hero.dynamic.test.title'),
        description: t('home.hero.dynamic.test.description'),
      };
    case 'survival':
      return {
        title: t('home.hero.dynamic.survival.title'),
        description: t('home.hero.dynamic.survival.description'),
      };
    case 'game':
      return {
        title: t('home.hero.dynamic.game.title'),
        description: t('home.hero.dynamic.game.description'),
      };
    case 'practice':
    default:
      return {
        title: t('home.hero.dynamic.practice.title'),
        description: t('home.hero.dynamic.practice.description'),
      };
  }
}

export function buildHomePageViewModel({
  achievementCatalog,
  currentLayout,
  fmtSpeed,
  gameState,
  layouts,
  motivationProgress,
  practiceSettings,
  progress,
  settings,
  speedLabel,
  translate: t,
  unlockedAchievementIds,
  locale,
}: BuildHomePageViewModelArgs) {
  const totalAchievementsCount = achievementCatalog.length;
  const totalUnlockedAchievements = countUnlockedAchievements(achievementCatalog, unlockedAchievementIds);

  const layout = layouts.layouts[currentLayout];
  const layoutLabel = layout?.label ?? currentLayout.toUpperCase();
  const practiceUnlockOrder = filterYoKeys(layout?.practiceUnlockOrder ?? [], settings.useYo);
  const layoutProgress = progress.layoutProgress?.[currentLayout] ?? { unlocked: 0, unlockProgress: 0 };
  const practiceState = progress.practice?.[currentLayout] ?? { sessionsToday: 0, minutesToday: 0 };
  const totalUnlocked = Math.min(layoutProgress.unlocked, practiceUnlockOrder.length);
  const nextLetter = practiceUnlockOrder[layoutProgress.unlocked] ?? null;
  const unlockProgress = practiceUnlockOrder.length > 0
    ? `${totalUnlocked}/${practiceUnlockOrder.length}`
    : '0/0';

  const goalValue = Math.max(1, practiceSettings.dailyGoalValue || 15);
  const dailyProgressValue = practiceSettings.dailyGoalType === 'sessions'
    ? practiceState.sessionsToday
    : Math.round(practiceState.minutesToday || 0);
  const dailyProgressLabel = practiceSettings.dailyGoalType === 'sessions'
    ? t('home.viewModel.dailyGoal.sessionsProgress', {
        current: practiceState.sessionsToday,
        target: goalValue,
      })
    : t('home.viewModel.dailyGoal.minutesProgress', {
        current: Math.round(practiceState.minutesToday || 0),
        target: goalValue,
      });
  const dailyProgressPercent = Math.min(100, Math.round((dailyProgressValue / goalValue) * 100));

  const currentHistory = progress.history?.[currentLayout] ?? [];
  const {
    lastSession,
    bestSession,
    bestSprintSession,
    bestSurvivalSession,
    bestFlawlessSession,
  } = summarizeHomeHistory(currentHistory);

  const lessons = layout?.lessonOrder ?? [];
  const lessonProgress = progress.lessons?.[currentLayout] ?? {};
  const {
    completedLessons,
    nextLessonNumber,
  } = summarizeLessonCompletion(lessons, lessonProgress, EXERCISE_COUNT);

  const currentRun = gameState.currentRun ?? null;
  const activeRunLabel = currentRun
    ? t('home.viewModel.activeRun.label', { level: currentRun.level, lives: currentRun.lives })
    : t('home.viewModel.activeRun.empty');
  const todayKey = new Date().toISOString().slice(0, 10);
  const {
    todayDailyRun,
    dailyRunCompleted,
  } = summarizeDailyRunState(gameState.dailyRun?.history, todayKey, DAILY_RUN_LEVELS);

  const weeklySnapshot = getWeeklyMotivationSnapshot(motivationProgress, t);
  const seasonSnapshot = getSeasonMotivationSnapshot(motivationProgress, t);
  const weeklyRecommendation = getWeeklyMotivationRecommendation(motivationProgress, t, {
    todayDailyRunCompleted: dailyRunCompleted,
  });
  const homeGoals = getActiveMotivationGoalSnapshots(motivationProgress, t, 4);
  const homeStreaks = getMotivationStreakSnapshots(motivationProgress, t);
  const weeklyRemainingDays = getMotivationWindowRemainingDays(weeklySnapshot.endsAt);
  const seasonRemainingDays = getMotivationWindowRemainingDays(seasonSnapshot.endsAt);
  const layoutInsights = progress.practiceInsights?.byLayout?.[currentLayout];
  const weaknessHotspot = buildWeaknessHotspot(layoutInsights, t);

  const modeFocusSnapshots = buildModeFocusSnapshots(currentHistory, t);
  const modeFocusDetailCards = buildHomeModeFocusDetailCards({
    formatSpeed: fmtSpeed,
    locale,
    modeFocusSnapshots,
    speedLabel,
    translate: t,
  });
  const personalRecordCards = buildHomePersonalRecordCards(progress, layouts, currentLayout, t);
  const personalRecordDetailCards = buildHomePersonalRecordDetailCards({
    formatSpeed: fmtSpeed,
    personalRecordCards,
    speedLabel,
    translate: t,
  });
  const recommendedModeFocus = modeFocusSnapshots.find(snapshot => snapshot.id !== 'practice' && snapshot.attempts === 0)
    ?? modeFocusSnapshots.find(snapshot => snapshot.id !== 'practice' && snapshot.emphasis === 'warn')
    ?? null;
  const lastModeFollowup = buildHistoryFollowupRecommendation(lastSession, t);

  const historyMetrics = buildHomeHistoryMetrics(currentHistory);
  const {
    flawlessEntries,
    practiceAccuracyTrend,
    practiceSpeedTrend,
    recentAvgAccuracy,
    recentEntries,
    recentFlawlessCount14d,
    recentPracticeAvgAccuracy,
    recentPracticeCount14d,
    recentPracticeEntries,
    recentSprintAvgAccuracy,
    recentSprintCount14d,
    recentSprintEntries,
    recentSurvivalAvgAccuracy,
    recentSurvivalCount14d,
    recentSurvivalEntries,
    sprintAccuracyTrend,
    sprintEntries,
    sprintSpeedTrend,
    survivalEntries,
    survivalPassRate,
  } = historyMetrics;
  const weeklyCompletionPercent = weeklySnapshot.totalCount > 0
    ? clampPercent((weeklySnapshot.completedCount / weeklySnapshot.totalCount) * 100)
    : 0;
  const dailyProgressGap = Math.max(0, goalValue - dailyProgressValue);

  const recommendation: HomeRecommendationModel = (() => {
    if (currentRun) {
      return {
        title: t('home.viewModel.recommendation.continueRun.title'),
        description: t('home.viewModel.recommendation.continueRun.description'),
        actionLabel: t('home.viewModel.recommendation.continueRun.action'),
        actionMode: 'game',
      };
    }

    const candidates: RecommendationCandidate[] = [];
    const weeklyPressure = getCompletionPressure(weeklyCompletionPercent, weeklyRemainingDays);

    if (currentHistory.length === 0) {
      pushRecommendationCandidate(candidates, nextLessonNumber !== null
        ? {
            score: 96,
            title: t('home.viewModel.recommendation.startLessons.title'),
            description: t('home.viewModel.recommendation.startLessons.description', { lesson: nextLessonNumber }),
            actionLabel: t('home.viewModel.recommendation.startLessons.action'),
            actionMode: 'lessons',
          }
        : {
            score: 95,
            title: t('home.viewModel.recommendation.startPractice.title'),
            description: t('home.viewModel.recommendation.startPractice.description'),
            actionLabel: t('home.viewModel.recommendation.startPractice.action'),
            actionMode: 'practice',
          });
    }

    if (weaknessHotspot && recentPracticeEntries.length >= 3 && (recentPracticeAvgAccuracy < 95 || recentAvgAccuracy < 94)) {
      const weaknessScoreBoost = weaknessHotspot.kind === 'bigram' ? 6 : weaknessHotspot.kind === 'rhythm' ? 4 : 5;
      pushRecommendationCandidate(candidates, {
        score: 88 + weaknessScoreBoost,
        title: weaknessHotspot.kind === 'bigram'
          ? t('home.viewModel.recommendation.fixWeakness.bigramTitle', { label: weaknessHotspot.label })
          : weaknessHotspot.kind === 'char'
            ? t('home.viewModel.recommendation.fixWeakness.charTitle', { label: weaknessHotspot.label })
            : t('home.viewModel.recommendation.fixWeakness.rhythmTitle'),
        description: t('home.viewModel.recommendation.fixWeakness.description', {
          detail: weaknessHotspot.detail,
          accuracy: Math.round(recentPracticeAvgAccuracy || recentAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.fixWeakness.action'),
        actionMode: 'practice',
      });
    }

    if (recentEntries.length >= 4 && recentAvgAccuracy > 0 && recentAvgAccuracy < 92) {
      pushRecommendationCandidate(candidates, {
        score: 92,
        title: t('home.viewModel.recommendation.stabilizeAccuracy.title'),
        description: t('home.viewModel.recommendation.stabilizeAccuracy.description', {
          count: recentEntries.length,
          accuracy: Math.round(recentAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.stabilizeAccuracy.action'),
        actionMode: 'practice',
      });
    }

    if (recentPracticeEntries.length >= 6 && (practiceAccuracyTrend <= -2 || practiceSpeedTrend <= -8)) {
      pushRecommendationCandidate(candidates, {
        score: 90,
        title: t('home.viewModel.recommendation.catchDecline.title'),
        description: t('home.viewModel.recommendation.catchDecline.description', {
          speed: Math.round(practiceSpeedTrend),
          speedLabel,
          accuracy: practiceAccuracyTrend.toFixed(1),
        }),
        actionLabel: t('home.viewModel.recommendation.catchDecline.action'),
        actionMode: 'practice',
      });
    }

    if (recentPracticeEntries.length >= 4 && recentPracticeAvgAccuracy >= 94 && sprintEntries.length === 0) {
      pushRecommendationCandidate(candidates, {
        score: 86,
        title: t('home.viewModel.recommendation.checkSprint.title'),
        description: t('home.viewModel.recommendation.checkSprint.description', {
          count: recentPracticeEntries.length,
          accuracy: Math.round(recentPracticeAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.checkSprint.action'),
        actionMode: 'test',
      });
    }

    if (recentPracticeEntries.length >= 5 && recentPracticeAvgAccuracy >= 95 && recentPracticeCount14d >= 5 && recentSprintCount14d === 0) {
      pushRecommendationCandidate(candidates, {
        score: 89,
        title: t('home.viewModel.recommendation.keepSprint.title'),
        description: t('home.viewModel.recommendation.keepSprint.description', {
          count: recentPracticeCount14d,
          accuracy: Math.round(recentPracticeAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.keepSprint.action'),
        actionMode: 'test',
      });
    }

    if (recentSprintEntries.length >= 2 && recentSprintAvgAccuracy > 0 && recentSprintAvgAccuracy < 91) {
      pushRecommendationCandidate(candidates, {
        score: 88,
        title: t('home.viewModel.recommendation.recoverAfterSprint.title'),
        description: t('home.viewModel.recommendation.recoverAfterSprint.description', {
          accuracy: Math.round(recentSprintAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.recoverAfterSprint.action'),
        actionMode: 'practice',
      });
    }

    if (recentSprintEntries.length >= 3 && sprintAccuracyTrend >= 1.5 && sprintSpeedTrend >= 12 && recentSurvivalCount14d === 0) {
      pushRecommendationCandidate(candidates, {
        score: 86,
        title: t('home.viewModel.recommendation.sprintToSurvival.title'),
        description: t('home.viewModel.recommendation.sprintToSurvival.description', {
          speed: Math.round(sprintSpeedTrend),
          speedLabel,
        }),
        actionLabel: t('home.viewModel.recommendation.sprintToSurvival.action'),
        actionMode: 'survival',
      });
    }

    if ((recentPracticeEntries.length + sprintEntries.length) >= 8 && recentAvgAccuracy >= 94 && survivalEntries.length === 0) {
      pushRecommendationCandidate(candidates, {
        score: 84,
        title: t('home.viewModel.recommendation.checkLongRun.title'),
        description: t('home.viewModel.recommendation.checkLongRun.description', {
          accuracy: Math.round(recentAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.checkLongRun.action'),
        actionMode: 'survival',
      });
    }

    if (recentSurvivalCount14d === 0 && recentPracticeCount14d >= 4 && recentAvgAccuracy >= 94) {
      pushRecommendationCandidate(candidates, {
        score: 81,
        title: t('home.viewModel.recommendation.returnLongRuns.title'),
        description: t('home.viewModel.recommendation.returnLongRuns.description'),
        actionLabel: t('home.viewModel.recommendation.returnLongRuns.action'),
        actionMode: 'survival',
      });
    }

    if (recentSurvivalEntries.length >= 2 && recentSurvivalAvgAccuracy > 0 && recentSurvivalAvgAccuracy < 94) {
      pushRecommendationCandidate(candidates, {
        score: 87,
        title: t('home.viewModel.recommendation.stabilizeSurvival.title'),
        description: t('home.viewModel.recommendation.stabilizeSurvival.description', {
          accuracy: Math.round(recentSurvivalAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.stabilizeSurvival.action'),
        actionMode: 'practice',
      });
    }

    if (survivalEntries.length >= 3 && survivalPassRate >= 0.66 && recentSurvivalAvgAccuracy >= 96 && flawlessEntries.length === 0) {
      pushRecommendationCandidate(candidates, {
        score: 90,
        title: t('home.viewModel.recommendation.raiseSurvival.title'),
        description: t('home.viewModel.recommendation.raiseSurvival.description', {
          passed: survivalEntries.filter(entry => entry.passed).length,
          total: survivalEntries.length,
          accuracy: Math.round(recentSurvivalAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.raiseSurvival.action'),
        actionMode: 'survival',
      });
    }

    if (survivalEntries.length >= 4 && survivalPassRate >= 0.66 && recentSurvivalAvgAccuracy >= 96 && recentFlawlessCount14d === 0) {
      pushRecommendationCandidate(candidates, {
        score: 88,
        title: t('home.viewModel.recommendation.enableFlawless.title'),
        description: t('home.viewModel.recommendation.enableFlawless.description', {
          passed: survivalEntries.filter(entry => entry.passed).length,
          total: survivalEntries.length,
          accuracy: Math.round(recentSurvivalAvgAccuracy),
        }),
        actionLabel: t('home.viewModel.recommendation.enableFlawless.action'),
        actionMode: 'survival',
      });
    }

    if (nextLessonNumber !== null && completedLessons < Math.max(3, Math.floor(lessons.length * 0.35)) && recentPracticeEntries.length < 6) {
      pushRecommendationCandidate(candidates, {
        score: 82,
        title: t('home.viewModel.recommendation.foundationLessons.title'),
        description: t('home.viewModel.recommendation.foundationLessons.description', {
          completed: completedLessons,
          total: lessons.length || 0,
          lesson: nextLessonNumber,
        }),
        actionLabel: t('home.viewModel.recommendation.foundationLessons.action'),
        actionMode: 'lessons',
      });
    }

    if (nextLetter && layoutProgress.unlockProgress >= 2) {
      pushRecommendationCandidate(candidates, {
        score: 78,
        title: t('home.viewModel.recommendation.unlockNextLetter.title'),
        description: t('home.viewModel.recommendation.unlockNextLetter.description', {
          letter: nextLetter.toUpperCase(),
        }),
        actionLabel: t('home.viewModel.recommendation.unlockNextLetter.action'),
        actionMode: 'practice',
      });
    }

    if (dailyProgressPercent < 45 && currentHistory.length > 0 && dailyProgressGap > 0) {
      pushRecommendationCandidate(candidates, {
        score: 77,
        title: t('home.viewModel.recommendation.dailyGoal.title'),
        description: practiceSettings.dailyGoalType === 'sessions'
          ? t('home.viewModel.recommendation.dailyGoal.sessionsDescription', {
              current: practiceState.sessionsToday,
              target: goalValue,
            })
          : t('home.viewModel.recommendation.dailyGoal.minutesDescription', {
              current: Math.round(practiceState.minutesToday || 0),
              target: goalValue,
            }),
        actionLabel: t('home.viewModel.recommendation.dailyGoal.action'),
        actionMode: 'practice',
      });
    }

    if (!todayDailyRun && dailyProgressPercent >= 60 && recentAvgAccuracy >= 94) {
      pushRecommendationCandidate(candidates, {
        score: 76,
        title: t('home.viewModel.recommendation.dailyRun.title'),
        description: t('home.viewModel.recommendation.dailyRun.description', {
          progress: dailyProgressPercent,
        }),
        actionLabel: t('home.viewModel.recommendation.dailyRun.action'),
        actionMode: 'game',
      });
    }

    if (weeklyRecommendation) {
      pushRecommendationCandidate(candidates, {
        score: Math.round((weeklyRemainingDays <= 2 ? 80 : 70) * weeklyPressure),
        title: weeklyRecommendation.title,
        description: weeklyCompletionPercent < 100
          ? t('home.viewModel.recommendation.weeklyProgress', {
              description: weeklyRecommendation.description,
              progress: weeklyCompletionPercent,
            })
          : weeklyRecommendation.description,
        actionLabel: weeklyRecommendation.actionLabel,
        actionMode: weeklyRecommendation.actionMode,
      });
    }

    if (recommendedModeFocus) {
      pushRecommendationCandidate(candidates, {
        score: recommendedModeFocus.attempts === 0 ? 70 : 66,
        title: t('home.viewModel.recommendation.modeFocus.title', { title: recommendedModeFocus.title }),
        description: recommendedModeFocus.recommendation,
        actionLabel: t('home.viewModel.recommendation.modeFocus.action', {
          title: recommendedModeFocus.title.toLowerCase(),
        }),
        actionMode: recommendedModeFocus.actionMode,
      });
    }

    if (lastModeFollowup) {
      pushRecommendationCandidate(candidates, {
        score: 56,
        ...lastModeFollowup,
      });
    }

    const bestCandidate = candidates.sort((left, right) => right.score - left.score)[0];
    if (bestCandidate) {
      const { score: _score, ...recommendationModel } = bestCandidate;
      return recommendationModel;
    }

    return {
      title: t('home.viewModel.recommendation.default.title'),
      description: t('home.viewModel.recommendation.default.description'),
      actionLabel: t('home.viewModel.recommendation.default.action'),
      actionMode: 'practice',
    };
  })();

  const actions: HomeActionModel[] = [
    currentRun
      ? {
          id: 'continue-run',
          title: t('home.viewModel.actions.continueRun.title'),
          description: t('home.viewModel.actions.continueRun.description'),
          meta: activeRunLabel,
          actionMode: 'game',
        }
      : {
          id: 'start-practice',
          title: t('home.viewModel.actions.startPractice.title'),
          description: t('home.viewModel.actions.startPractice.description'),
          meta: nextLetter
            ? t('home.viewModel.actions.startPractice.nextLetter', { letter: nextLetter.toUpperCase() })
            : t('home.viewModel.actions.startPractice.complete'),
          actionMode: 'practice',
        },
    ...(lastSession ? [{
      id: 'replay-last' as const,
      title: getReplayTitleFromHistory(lastSession, t),
      description: t('home.viewModel.actions.replayLast.description', {
        speed: fmtSpeed(lastSession.wpm),
        speedLabel,
        accuracy: Math.round(lastSession.acc),
      }),
      meta: t('home.viewModel.actions.replayLast.meta', {
        date: formatShortDate(lastSession.date, locale, t),
      }),
      actionMode: getReplayModeFromHistory(lastSession),
    }] : []),
    {
      id: 'lessons',
      title: t('home.viewModel.actions.lessons.title'),
      description: t('home.viewModel.actions.lessons.description'),
      meta: nextLessonNumber
        ? t('home.viewModel.actions.lessons.nextLesson', { lesson: nextLessonNumber })
        : t('home.viewModel.actions.lessons.complete'),
      actionMode: 'lessons',
    },
  ];

  const replayMode = getReplayModeFromHistory(lastSession);
  const nextLessonTag = nextLessonNumber !== null
    ? t('home.viewModel.heroTags.nextLesson', { lesson: nextLessonNumber })
    : null;
  const heroCopy = buildHeroCopy(recommendation, {
    currentRun,
    currentHistoryCount: currentHistory.length,
    nextLessonNumber,
    t,
  });

  const modeCards = ([
    {
      id: 'practice',
      title: t('home.viewModel.modeCards.practice.title'),
      description: t('home.viewModel.modeCards.practice.description'),
      meta: nextLetter
        ? t('home.viewModel.modeCards.practice.nextLetter', { count: layoutProgress.unlockProgress })
        : t('home.viewModel.modeCards.practice.complete'),
      badge: recommendation.actionMode === 'practice'
        ? t('home.viewModel.modeCards.badges.next')
        : replayMode === 'practice' && lastSession
          ? t('home.viewModel.modeCards.badges.last')
          : undefined,
    },
    {
      id: 'test',
      title: t('home.viewModel.modeCards.test.title'),
      description: t('home.viewModel.modeCards.test.description'),
      meta: bestSprintSession
        ? t('home.viewModel.modeCards.test.best', {
            speed: fmtSpeed(bestSprintSession.wpm),
            speedLabel,
          })
        : t('home.viewModel.modeCards.test.empty'),
      badge: recommendation.actionMode === 'test'
        ? t('home.viewModel.modeCards.badges.next')
        : replayMode === 'test' && lastSession
          ? t('home.viewModel.modeCards.badges.last')
          : undefined,
    },
    {
      id: 'survival',
      title: t('home.viewModel.modeCards.survival.title'),
      description: t('home.viewModel.modeCards.survival.description'),
      meta: bestSurvivalSession
        ? t('home.viewModel.modeCards.survival.best', {
            speed: fmtSpeed(bestSurvivalSession.wpm),
            speedLabel,
          })
        : bestFlawlessSession
          ? t('home.viewModel.modeCards.survival.bestFlawless', {
              speed: fmtSpeed(bestFlawlessSession.wpm),
              speedLabel,
            })
          : t('home.viewModel.modeCards.survival.empty'),
      badge: recommendation.actionMode === 'survival'
        ? t('home.viewModel.modeCards.badges.next')
        : replayMode === 'survival' && lastSession
          ? t('home.viewModel.modeCards.badges.last')
          : undefined,
    },
    {
      id: 'lessons',
      title: t('home.viewModel.modeCards.lessons.title'),
      description: t('home.viewModel.modeCards.lessons.description'),
      meta: t('home.viewModel.modeCards.lessons.meta', {
        completed: completedLessons,
        total: lessons.length || 0,
      }),
      badge: recommendation.actionMode === 'lessons'
        ? t('home.viewModel.modeCards.badges.next')
        : undefined,
    },
    {
      id: 'game',
      title: t('home.viewModel.modeCards.game.title'),
      description: t('home.viewModel.modeCards.game.description'),
      meta: currentRun
        ? activeRunLabel
        : t('home.viewModel.modeCards.game.bestLevel', { level: gameState.highestLevel }),
      badge: currentRun
        ? t('home.viewModel.modeCards.badges.active')
        : recommendation.actionMode === 'game'
          ? t('home.viewModel.modeCards.badges.next')
          : undefined,
    },
    {
      id: 'stats',
      title: t('home.viewModel.modeCards.stats.title'),
      description: t('home.viewModel.modeCards.stats.description'),
      meta: lastSession
        ? t('home.viewModel.modeCards.stats.lastEntry', {
            date: formatShortDate(lastSession.date, locale, t),
          })
        : t('home.viewModel.modeCards.stats.empty'),
    },
    {
      id: 'settings',
      title: t('home.viewModel.modeCards.settings.title'),
      description: t('home.viewModel.modeCards.settings.description'),
      meta: `${layoutLabel} · ${settings.theme}`,
    },
  ] satisfies HomeModeCardModel[]).sort((left, right) => {
    const getPriority = (card: HomeModeCardModel) => {
      if (card.id === 'game' && currentRun) return 300;
      if (card.id === recommendation.actionMode) return 220;
      if (lastSession && card.id === replayMode) return 180;
      if (card.id === 'lessons' && nextLessonNumber !== null) return 140;
      if (card.id === 'practice') return 120;
      if (card.id === 'stats') return 40;
      if (card.id === 'settings') return 20;
      return 80;
    };

    return getPriority(right) - getPriority(left);
  });

  const summaryCards: HomeSummaryCardModel[] = [
    {
      id: 'layout',
      label: t('home.viewModel.summary.layout.label'),
      value: layoutLabel,
      description: t('home.viewModel.summary.layout.description', { progress: unlockProgress }),
    },
    {
      id: 'daily-goal',
      label: t('home.viewModel.summary.dailyGoal.label'),
      value: dailyProgressLabel,
      description: practiceSettings.dailyGoalType === 'sessions'
        ? t('home.viewModel.summary.dailyGoal.sessions')
        : t('home.viewModel.summary.dailyGoal.minutes'),
      progressPercent: dailyProgressPercent,
    },
    {
      id: 'lessons',
      label: t('home.viewModel.summary.lessons.label'),
      value: `${completedLessons}/${lessons.length || 0}`,
      description: nextLessonNumber
        ? t('home.viewModel.summary.lessons.next', { lesson: nextLessonNumber })
        : t('home.viewModel.summary.lessons.complete'),
    },
    {
      id: 'game',
      label: t('home.viewModel.summary.game.label'),
      value: currentRun
        ? t('home.viewModel.summary.game.currentLevel', { level: currentRun.level })
        : t('home.viewModel.summary.game.bestLevel', { level: gameState.highestLevel }),
      description: currentRun
        ? t('home.viewModel.summary.game.currentRun', { lives: currentRun.lives })
        : t('home.viewModel.summary.game.empty'),
    },
  ];

  const quickInsights: HomeQuickInsightModel[] = [
    {
      id: 'last-session',
      label: t('home.viewModel.quickInsights.lastSession.label'),
      value: lastSession ? `${fmtSpeed(lastSession.wpm)} ${speedLabel}` : t('home.common.noData'),
      description: lastSession
        ? `${Math.round(lastSession.acc)}% · ${formatShortDate(lastSession.date, locale, t)}`
        : t('home.viewModel.quickInsights.lastSession.empty'),
    },
    {
      id: 'best-speed',
      label: t('home.viewModel.quickInsights.bestSpeed.label'),
      value: bestSession ? `${fmtSpeed(bestSession.wpm)} ${speedLabel}` : t('home.common.noData'),
      description: bestSession
        ? t('home.viewModel.quickInsights.bestSpeed.description', { accuracy: Math.round(bestSession.acc) })
        : t('home.viewModel.quickInsights.bestSpeed.empty'),
    },
    {
      id: 'daily-series',
      label: t('home.viewModel.quickInsights.dailySeries.label'),
      value: practiceSettings.dailyGoalType === 'sessions'
        ? practiceState.sessionsToday.toString()
        : t('home.viewModel.quickInsights.dailySeries.minutesValue', {
            count: Math.round(practiceState.minutesToday || 0),
          }),
      description: practiceSettings.dailyGoalType === 'sessions'
        ? t('home.viewModel.quickInsights.dailySeries.sessions')
        : t('home.viewModel.quickInsights.dailySeries.minutes'),
    },
    {
      id: 'daily-run',
      label: t('home.viewModel.quickInsights.dailyRun.label'),
      value: dailyRunCompleted
        ? t('home.viewModel.quickInsights.dailyRun.complete')
        : t('home.viewModel.quickInsights.dailyRun.incomplete'),
      description: todayDailyRun
        ? t('home.viewModel.quickInsights.dailyRun.attempts', { count: todayDailyRun.attempts })
        : t('home.viewModel.quickInsights.dailyRun.empty'),
    },
  ];

  return {
    actions,
    currentRun,
    dailyProgressLabel,
    heroCopy,
    homeGoals,
    homeStreaks,
    heroTags: uniqueStrings([
      currentRun ? activeRunLabel : null,
      t('home.viewModel.heroTags.dailyGoal', { value: dailyProgressLabel }),
      weeklySnapshot.totalCount > 0
        ? t('home.viewModel.heroTags.weekly', {
            completed: weeklySnapshot.completedCount,
            total: weeklySnapshot.totalCount,
          })
        : null,
      recommendation.actionMode === 'lessons' ? nextLessonTag : null,
      !currentRun ? nextLessonTag : null,
      !currentRun ? layoutLabel : null,
      currentRun
        ? t('home.viewModel.heroTags.runSaved')
        : t('home.viewModel.heroTags.newSession'),
    ]).slice(0, 3),
    lastModeFollowup,
    lastSession,
    layoutLabel,
    layoutMastery: buildLayoutMasterySnapshot(progress, layouts, currentLayout, t),
    modeCards,
    modeFocusDetailCards,
    modeFocusSnapshots,
    nextLessonNumber,
    personalRecordCards,
    personalRecordDetailCards,
    quickInsights,
    recommendation,
    replayTitle: lastSession ? null : t('home.viewModel.replayTitle'),
    seasonRemainingDays,
    seasonSnapshot,
    summaryCards,
    totalAchievementsCount,
    totalUnlockedAchievements,
    weeklyRemainingDays,
    weeklySnapshot,
    weeklyGoals: weeklySnapshot.goals.map((goal) => ({
      id: goal.definition.id,
      title: goal.definition.title,
      value: formatChallengeProgress(goal.current, goal.target),
      progressPercent: goal.progressPercent,
      description: goal.completed ? t('home.viewModel.weeklyGoalDone') : goal.definition.description,
    })),
  };
}

export type HomePageViewModel = ReturnType<typeof buildHomePageViewModel>;

export function buildHomeProgressCenterCards(
  homeViewModel: HomePageViewModel,
  t: (key: string, params?: TranslationParams) => string,
): HomeProgressCenterCardModel[] {
  const activeSeasonGoal = homeViewModel.seasonSnapshot.goals.find(goal => !goal.completed) ?? null;
  const emptyModeCount = homeViewModel.modeFocusSnapshots.filter(snapshot => snapshot.attempts === 0).length;
  const unlockedRecordCount = homeViewModel.personalRecordDetailCards.filter(card => card.hasRecord).length;
  const hottestStreak = homeViewModel.homeStreaks.length > 0
    ? homeViewModel.homeStreaks.reduce((best, streak) => (
        streak.current > best.current ? streak : best
      ), homeViewModel.homeStreaks[0]!)
    : null;

  return [
    {
      id: 'season',
      title: t('home.progressCenter.season.title'),
      summary: t('home.progressCenter.season.summary', {
        completed: homeViewModel.seasonSnapshot.completedCount,
        total: homeViewModel.seasonSnapshot.totalCount,
      }),
      description: activeSeasonGoal
        ? t('home.progressCenter.season.next', { title: activeSeasonGoal.definition.title })
        : t('home.progressCenter.season.completed'),
    },
    {
      id: 'mode-focus',
      title: t('home.progressCenter.modeFocus.title'),
      summary: emptyModeCount > 0
        ? t('home.progressCenter.modeFocus.summaryMissing', { count: emptyModeCount })
        : t('home.progressCenter.modeFocus.summaryReady'),
      description: emptyModeCount > 0
        ? t('home.progressCenter.modeFocus.descriptionMissing')
        : t('home.progressCenter.modeFocus.descriptionReady'),
    },
    {
      id: 'records',
      title: t('home.progressCenter.records.title'),
      summary: t('home.progressCenter.records.summary', {
        count: unlockedRecordCount,
        total: homeViewModel.personalRecordDetailCards.length,
      }),
      description: t('home.progressCenter.records.description'),
    },
    {
      id: 'mastery',
      title: t('home.progressCenter.mastery.title'),
      summary: homeViewModel.layoutMastery.currentMilestone.title,
      description: t('home.progressCenter.mastery.description', {
        score: homeViewModel.layoutMastery.currentScore,
      }),
    },
    {
      id: 'goals',
      title: t('home.progressCenter.goals.title'),
      summary: t('home.progressCenter.goals.summary', {
        count: homeViewModel.homeGoals.length,
      }),
      description: t('home.progressCenter.goals.description'),
    },
    {
      id: 'streaks',
      title: t('home.progressCenter.streaks.title'),
      summary: hottestStreak
        ? t('home.progressCenter.streaks.summaryActive', { count: hottestStreak.current })
        : t('home.progressCenter.streaks.summaryEmpty'),
      description: hottestStreak
        ? t('home.progressCenter.streaks.descriptionActive', {
            title: hottestStreak.definition.title,
          })
        : t('home.progressCenter.streaks.descriptionEmpty'),
    },
  ];
}

export function buildHomeDetailMeta(
  activeDetailModal: HomeDetailModalId | null,
  homeViewModel: HomePageViewModel,
  t: (key: string, params?: TranslationParams) => string,
): HomeDetailMeta | null {
  switch (activeDetailModal) {
    case 'season':
      return {
        title: t('home.detail.season.title'),
        description: t('home.detail.season.description', {
          title: homeViewModel.seasonSnapshot.definition.title,
          count: homeViewModel.seasonRemainingDays,
        }),
      };
    case 'mode-focus':
      return {
        title: t('home.detail.modeFocus.title'),
        description: t('home.detail.modeFocus.description'),
      };
    case 'records':
      return {
        title: t('home.detail.records.title'),
        description: t('home.detail.records.description'),
      };
    case 'mastery':
      return {
        title: t('home.detail.mastery.title'),
        description: t('home.detail.mastery.description'),
      };
    case 'goals':
      return {
        title: t('home.detail.goals.title'),
        description: t('home.detail.goals.description'),
      };
    case 'streaks':
      return {
        title: t('home.detail.streaks.title'),
        description: t('home.detail.streaks.description'),
      };
    default:
      return null;
  }
}
