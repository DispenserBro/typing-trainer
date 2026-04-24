import { useEffect, useMemo, useState } from 'react';
import {
  buildStatsFilterBarViewModel,
  buildStatsInsightsViewModel,
  buildStatsKeysViewModel,
  buildStatsOverallProgressViewModel,
  buildStatsPageViewModel,
  buildStatsSessionSelectionViewModel,
  buildStatsSessionsViewModel,
  buildStatsSummaryCardsViewModel,
  type StatsFilterBarGroupId,
} from '../../../core/stats/viewModel';
import {
  type StatsLayoutScope,
  type StatsModeFilter,
  type StatsPeriod,
} from '../../../core/stats/utils';
import { useAppSettings, useAppStats } from '../../contexts/AppContext';
import { useI18n } from '../../contexts/I18nContext';

export function useStatsPageState() {
  const { progress, layouts, practiceInsights, practiceRhythmHistory } = useAppStats();
  const { currentLayout, settings } = useAppSettings();
  const { t, locale } = useI18n();
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('all');
  const [statsMode, setStatsMode] = useState<StatsModeFilter>('all');
  const [layoutScope, setLayoutScope] = useState<StatsLayoutScope>('current');
  const [showOverallProgress, setShowOverallProgress] = useState(false);
  const [showKeyStats, setShowKeyStats] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showSmartAnalytics, setShowSmartAnalytics] = useState(false);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState('');

  const unit = settings.speedUnit;
  const layout = layouts.layouts[currentLayout];
  const allChars = useMemo(
    () => (layout ? Object.values(layout.fingers).flat() : []),
    [layout],
  );
  const layoutInsights = practiceInsights.byLayout[currentLayout];

  const statsViewModel = useMemo(() => buildStatsPageViewModel({
    allChars,
    currentLayout,
    currentLayoutLabel: layout?.label ?? currentLayout,
    layoutInsights,
    layoutScope,
    practiceRhythmHistory,
    progressHistory: progress.history,
    statsMode,
    statsPeriod,
    translate: t,
    locale,
    unit,
  }), [
    allChars,
    currentLayout,
    layout?.label,
    layoutInsights,
    layoutScope,
    practiceRhythmHistory,
    progress.history,
    statsMode,
    statsPeriod,
    t,
    locale,
    unit,
  ]);

  const sessionSelection = useMemo(
    () => buildStatsSessionSelectionViewModel(
      statsViewModel.filteredSessionHistory,
      selectedHistorySessionId,
    ),
    [selectedHistorySessionId, statsViewModel.filteredSessionHistory],
  );

  useEffect(() => {
    if (sessionSelection.nextSelectedHistorySessionId !== selectedHistorySessionId) {
      setSelectedHistorySessionId(sessionSelection.nextSelectedHistorySessionId);
    }
  }, [selectedHistorySessionId, sessionSelection.nextSelectedHistorySessionId]);

  const summaryCardsProps = useMemo(
    () => buildStatsSummaryCardsViewModel({
      locale,
      statsViewModel,
      translate: t,
      unit,
    }),
    [locale, statsViewModel, t, unit],
  );

  const overallProgressViewModel = useMemo(
    () => buildStatsOverallProgressViewModel({
      statsViewModel,
      translate: t,
      unit,
    }),
    [statsViewModel, t, unit],
  );

  const keysViewModel = useMemo(
    () => buildStatsKeysViewModel({
      currentLayout,
      statsViewModel,
      translate: t,
    }),
    [currentLayout, statsViewModel, t],
  );

  const sessionsViewModel = useMemo(
    () => buildStatsSessionsViewModel({
      getLayoutLabel: (layoutId) => layouts.layouts[layoutId]?.label ?? layoutId,
      locale,
      sessionSelection,
      statsViewModel,
      translate: t,
      unit,
    }),
    [layouts.layouts, locale, sessionSelection, statsViewModel, t, unit],
  );

  const insightsViewModel = useMemo(
    () => buildStatsInsightsViewModel({
      statsViewModel,
      translate: t,
    }),
    [statsViewModel, t],
  );

  const filterBarState = useMemo(
    () => buildStatsFilterBarViewModel({
      layoutScope,
      statsMode,
      statsPeriod,
      translate: t,
    }),
    [layoutScope, statsMode, statsPeriod, t],
  );

  function handleFilterSelect(groupId: StatsFilterBarGroupId, value: string) {
    if (groupId === 'period') {
      setStatsPeriod(value as StatsPeriod);
      return;
    }
    if (groupId === 'mode') {
      setStatsMode(value as StatsModeFilter);
      return;
    }
    setLayoutScope(value as StatsLayoutScope);
  }

  return {
    filterBarState,
    handleFilterSelect,
    insightsViewModel,
    keysViewModel,
    overallProgressViewModel,
    pageTitle: t('stats.title'),
    sessionsViewModel,
    showKeyStats,
    showOverallProgress,
    showSessions,
    showSmartAnalytics,
    summaryCardsProps,
    setSelectedHistorySessionId,
    setShowKeyStats,
    setShowOverallProgress,
    setShowSessions,
    setShowSmartAnalytics,
  };
}
