import { useMemo } from 'react';
import {
  buildHomePageViewModel,
  buildHomeVisibleQuickActions,
} from '../../core/home/viewModel';
import {
  useAppGame,
  useAppPractice,
  useAppSettings,
} from '../contexts/AppContext';
import { AchievementsModal } from '../components/AchievementsModal';
import { HomeAchievementsSection } from '../components/home/HomeAchievementsSection';
import { HomeDetailModal } from '../components/home/HomeDetailModal';
import { HomeHeroSection } from '../components/home/HomeHeroSection';
import { HomeModesSection } from '../components/home/HomeModesSection';
import { HomeProfileSection } from '../components/home/HomeProfileSection';
import { HomeProgressCenterSection } from '../components/home/HomeProgressCenterSection';
import { HomeQuickActionsSection } from '../components/home/HomeQuickActionsSection';
import { HomeWeeklySection } from '../components/home/HomeWeeklySection';
import { ACTION_CARD_ICONS, MODE_CARD_ICONS, useHomePageState } from '../hooks/home/useHomePageState';
import { useI18n } from '../contexts/I18nContext';
import { getReplayModeFromHistory, getReplayTitleFromHistory } from '../../core/home/summary';

export function HomePage() {
  const { locale, t } = useI18n();
  const {
    layouts,
    progress,
    fmtSpeed,
    spdLabel,
    switchMode,
    gameAchievementCatalog,
    unlockedAchievementIds,
    motivationProgress,
  } = useAppPractice();
  const { gameState } = useAppGame();
  const { currentLayout, settings, practiceSettings } = useAppSettings();

  const homeViewModel = useMemo(() => buildHomePageViewModel({
    achievementCatalog: gameAchievementCatalog,
    currentLayout,
    fmtSpeed,
    gameState,
    layouts,
    motivationProgress,
    practiceSettings,
    progress,
    settings,
    speedLabel: spdLabel,
    translate: t,
    unlockedAchievementIds,
    locale,
  }), [
    currentLayout,
    fmtSpeed,
    gameAchievementCatalog,
    gameState,
    layouts,
    motivationProgress,
    practiceSettings,
    progress,
    settings,
    spdLabel,
    t,
    unlockedAchievementIds,
    locale,
  ]);
  const {
    activeDetailMeta,
    activeDetailModal,
    progressCenterCards,
    setActiveDetailModal,
    setShowAchievements,
    showAchievements,
  } = useHomePageState({ homeViewModel, t });
  const primaryActionMode = homeViewModel.recommendation.actionMode;
  const secondaryActionMode = homeViewModel.currentRun
    ? 'game'
    : getReplayModeFromHistory(homeViewModel.lastSession);
  const secondaryActionLabel = homeViewModel.currentRun
    ? t('home.hero.openGame')
    : getReplayTitleFromHistory(homeViewModel.lastSession, t);
  const showSecondaryHeroAction = secondaryActionMode !== primaryActionMode;
  const visibleQuickActions = buildHomeVisibleQuickActions({
    actions: homeViewModel.actions,
    currentRunActive: Boolean(homeViewModel.currentRun),
    primaryActionMode,
    showSecondaryHeroAction,
  });

  return (
    <section className="mode-panel active home-panel">
      <AchievementsModal
        open={showAchievements}
        achievementCatalog={gameAchievementCatalog}
        unlockedAchievementIds={unlockedAchievementIds}
        onClose={() => setShowAchievements(false)}
      />
      <HomeDetailModal
        activeDetailModal={activeDetailModal}
        detailMeta={activeDetailMeta}
        formatSpeed={fmtSpeed}
        homeViewModel={homeViewModel}
        onClose={() => setActiveDetailModal(null)}
        onSwitchMode={switchMode}
        speedLabel={spdLabel}
        t={t}
      />

      <HomeHeroSection
        kicker={t('home.hero.kicker')}
        title={homeViewModel.heroCopy.title}
        description={homeViewModel.heroCopy.description}
        primaryActionLabel={homeViewModel.recommendation.actionLabel}
        onRunPrimary={() => switchMode(primaryActionMode)}
        openSecondaryLabel={showSecondaryHeroAction ? secondaryActionLabel : null}
        onOpenSecondary={showSecondaryHeroAction ? () => switchMode(secondaryActionMode) : undefined}
        heroTags={homeViewModel.heroTags}
        recommendationLabel={t('home.recommendation.label')}
        recommendationTitle={homeViewModel.recommendation.title}
        recommendationDescription={homeViewModel.recommendation.description}
      />

      {visibleQuickActions.length > 1 ? (
        <HomeQuickActionsSection
          sectionTitle={t('home.sections.quickActions')}
          actions={visibleQuickActions}
          icons={ACTION_CARD_ICONS}
          onRunAction={switchMode}
        />
      ) : null}

      <HomeModesSection
        sectionTitle={t('home.sections.modes')}
        cards={homeViewModel.modeCards}
        icons={MODE_CARD_ICONS}
        onOpenMode={switchMode}
      />

      <HomeProgressCenterSection
        sectionTitle={t('home.sections.progressCenter')}
        cards={progressCenterCards}
        collapseLabel={t('home.common.collapseSection')}
        expandLabel={t('home.common.expandSection')}
        openWindowLabel={t('home.common.openWindow')}
        onOpenCard={setActiveDetailModal}
      />

      <div className="home-secondary-layout">
        <HomeProfileSection
          collapseLabel={t('home.common.collapseSection')}
          expandLabel={t('home.common.expandSection')}
          sectionTitle={t('home.sections.profile')}
          summaryCards={homeViewModel.summaryCards}
          quickInsightsTitle={t('home.quickInsights.title')}
          quickInsights={homeViewModel.quickInsights}
        />

        <HomeWeeklySection
          collapseLabel={t('home.common.collapseSection')}
          expandLabel={t('home.common.expandSection')}
          sectionTitle={t('home.sections.weekly')}
          description={t('home.weekly.remainingDays', {
            title: homeViewModel.weeklySnapshot.template.title,
            count: homeViewModel.weeklyRemainingDays,
          })}
          goals={homeViewModel.weeklyGoals}
        />

        <HomeAchievementsSection
          sectionTitle={t('home.sections.achievements')}
          collectionTitle={t('home.achievements.collectionTitle')}
          collectionDescription={t('home.achievements.collectionDescription')}
          totalUnlockedAchievements={homeViewModel.totalUnlockedAchievements}
          totalAchievementsCount={homeViewModel.totalAchievementsCount}
          onOpen={() => setShowAchievements(true)}
        />
      </div>

    </section>
  );
}
