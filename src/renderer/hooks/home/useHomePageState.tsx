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
import {
  buildHomeDetailMeta,
  buildHomeProgressCenterCards,
  type HomeActionId,
  type HomeDetailModalId,
  type HomeModeCardId,
  type HomePageViewModel,
  type HomeProgressCenterCardId,
} from '../../../core/home/viewModel';

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

const PROGRESS_CENTER_ICONS: Record<HomeProgressCenterCardId, ReactNode> = {
  season: <Sparkles size={20} />,
  'mode-focus': <Shield size={20} />,
  records: <Trophy size={20} />,
  mastery: <Target size={20} />,
  goals: <BarChart3 size={20} />,
  streaks: <Flame size={20} />,
};

type TranslateFn = (key: string, params?: TranslationParams) => string;

type UseHomePageStateArgs = {
  homeViewModel: HomePageViewModel;
  t: TranslateFn;
};

export function useHomePageState({ homeViewModel, t }: UseHomePageStateArgs) {
  const [showAchievements, setShowAchievements] = useState(false);
  const [activeDetailModal, setActiveDetailModal] = useState<HomeDetailModalId | null>(null);

  const progressCenterCards = useMemo(
    () => buildHomeProgressCenterCards(homeViewModel, t).map(card => ({
      ...card,
      icon: PROGRESS_CENTER_ICONS[card.id],
    })),
    [homeViewModel, t],
  );

  const activeDetailMeta = useMemo(
    () => buildHomeDetailMeta(activeDetailModal, homeViewModel, t),
    [activeDetailModal, homeViewModel, t],
  );

  return {
    activeDetailMeta,
    activeDetailModal,
    progressCenterCards,
    setActiveDetailModal,
    setShowAchievements,
    showAchievements,
  };
}
