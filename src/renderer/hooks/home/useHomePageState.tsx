import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Clock3,
  Flame,
  Gamepad2,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import type { TranslationParams } from '../../../shared/types';
import type { HomeActionId, HomeModeCardId } from '../../../core/home/viewModel';

export const MODE_CARD_ICONS: Record<HomeModeCardId, ReactNode> = {
  practice: <Target size={20} />,
  test: <Clock3 size={20} />,
  survival: <Shield size={20} />,
  lessons: <BookOpen size={20} />,
  game: <Gamepad2 size={20} />,
  stats: <BarChart3 size={20} />,
  settings: <Settings size={20} />,
};

export const ACTION_CARD_ICONS: Record<HomeActionId, ReactNode> = {
  'continue-run': <Play size={20} />,
  'replay-last': <RotateCcw size={20} />,
  'start-practice': <Target size={20} />,
  lessons: <BookOpen size={20} />,
};

export type HomeDetailModalId = 'season' | 'mode-focus' | 'records' | 'mastery' | 'goals' | 'streaks';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UseHomePageStateArgs = {
  homeViewModel: any;
  t: TranslateFn;
};

export function useHomePageState({ homeViewModel, t }: UseHomePageStateArgs) {
  const [showAchievements, setShowAchievements] = useState(false);
  const [activeDetailModal, setActiveDetailModal] = useState<HomeDetailModalId | null>(null);

  const progressCenterCards = useMemo(() => {
    const activeSeasonGoal = homeViewModel.seasonSnapshot.goals.find((goal: any) => !goal.completed) ?? null;
    const emptyModeCount = homeViewModel.modeFocusSnapshots.filter((snapshot: any) => snapshot.attempts === 0).length;
    const unlockedRecordCount = homeViewModel.personalRecordCards.filter((card: any) => card.record).length;
    const hottestStreak = homeViewModel.homeStreaks.length > 0
      ? homeViewModel.homeStreaks.reduce((best: any, streak: any) => (
          streak.current > best.current ? streak : best
        ), homeViewModel.homeStreaks[0])
      : null;

    return [
      {
        id: 'season' as const,
        title: t('home.progressCenter.season.title'),
        summary: t('home.progressCenter.season.summary', {
          completed: homeViewModel.seasonSnapshot.completedCount,
          total: homeViewModel.seasonSnapshot.totalCount,
        }),
        description: activeSeasonGoal
          ? t('home.progressCenter.season.next', { title: activeSeasonGoal.definition.title })
          : t('home.progressCenter.season.completed'),
        icon: <Sparkles size={20} />,
      },
      {
        id: 'mode-focus' as const,
        title: t('home.progressCenter.modeFocus.title'),
        summary: emptyModeCount > 0
          ? t('home.progressCenter.modeFocus.summaryMissing', { count: emptyModeCount })
          : t('home.progressCenter.modeFocus.summaryReady'),
        description: emptyModeCount > 0
          ? t('home.progressCenter.modeFocus.descriptionMissing')
          : t('home.progressCenter.modeFocus.descriptionReady'),
        icon: <Shield size={20} />,
      },
      {
        id: 'records' as const,
        title: t('home.progressCenter.records.title'),
        summary: t('home.progressCenter.records.summary', {
          count: unlockedRecordCount,
          total: homeViewModel.personalRecordCards.length,
        }),
        description: t('home.progressCenter.records.description'),
        icon: <Trophy size={20} />,
      },
      {
        id: 'mastery' as const,
        title: t('home.progressCenter.mastery.title'),
        summary: homeViewModel.layoutMastery.currentMilestone.title,
        description: t('home.progressCenter.mastery.description', {
          score: homeViewModel.layoutMastery.currentScore,
        }),
        icon: <Target size={20} />,
      },
      {
        id: 'goals' as const,
        title: t('home.progressCenter.goals.title'),
        summary: t('home.progressCenter.goals.summary', {
          count: homeViewModel.homeGoals.length,
        }),
        description: t('home.progressCenter.goals.description'),
        icon: <BarChart3 size={20} />,
      },
      {
        id: 'streaks' as const,
        title: t('home.progressCenter.streaks.title'),
        summary: hottestStreak
          ? t('home.progressCenter.streaks.summaryActive', { count: hottestStreak.current })
          : t('home.progressCenter.streaks.summaryEmpty'),
        description: hottestStreak
          ? t('home.progressCenter.streaks.descriptionActive', {
              title: hottestStreak.definition.title,
            })
          : t('home.progressCenter.streaks.descriptionEmpty'),
        icon: <Flame size={20} />,
      },
    ];
  }, [homeViewModel, t]);

  const activeDetailMeta = useMemo(() => {
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
  }, [activeDetailModal, homeViewModel.seasonRemainingDays, homeViewModel.seasonSnapshot.definition.title, t]);

  return {
    activeDetailMeta,
    activeDetailModal,
    progressCenterCards,
    setActiveDetailModal,
    setShowAchievements,
    showAchievements,
  };
}
