import { StatsFilterBar } from '../components/stats/StatsFilterBar';
import { StatsInsightsSection } from '../components/stats/StatsInsightsSection';
import { StatsKeysSection } from '../components/stats/StatsKeysSection';
import { StatsOverallProgressSection } from '../components/stats/StatsOverallProgressSection';
import { StatsSessionsSection } from '../components/stats/StatsSessionsSection';
import { StatsSummaryCards } from '../components/stats/StatsSummaryCards';
import { PageHeader } from '../components/ui/PageHeader';
import { useStatsPageState } from '../hooks/stats/useStatsPageState';

export function StatsPage() {
  const {
    filterBarState,
    handleFilterSelect,
    insightsViewModel,
    keysViewModel,
    overallProgressViewModel,
    pageTitle,
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
  } = useStatsPageState();

  return (
    <section className="mode-panel active">
      <PageHeader title={pageTitle} />

      <StatsSummaryCards {...summaryCardsProps} />

      <StatsFilterBar filters={filterBarState} onOptionSelect={handleFilterSelect} />

      <StatsOverallProgressSection
        expanded={showOverallProgress}
        onToggle={() => setShowOverallProgress(prev => !prev)}
        progress={overallProgressViewModel}
      />

      <StatsKeysSection
        expanded={showKeyStats}
        onToggle={() => setShowKeyStats(prev => !prev)}
        keys={keysViewModel}
      />

      <StatsSessionsSection
        expanded={showSessions}
        onToggle={() => setShowSessions(prev => !prev)}
        sessions={sessionsViewModel}
        onSelectSession={setSelectedHistorySessionId}
      />

      <StatsInsightsSection
        expanded={showSmartAnalytics}
        onToggle={() => setShowSmartAnalytics(prev => !prev)}
        insights={insightsViewModel}
      />
    </section>
  );
}
