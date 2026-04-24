import type {
  StatsSessionsViewModel,
} from '../../../core/stats/viewModel';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';
import { ExpandableSectionCard } from '../ui/ExpandableSectionCard';
import { SectionHeader } from '../ui/SectionHeader';
import { StatsSessionDetail } from './StatsSessionDetail';
import { StatsSessionHistoryList } from './StatsSessionHistoryList';
import { StatsSessionRhythmPanel } from './StatsSessionRhythmPanel';

type StatsSessionsSectionProps = {
  expanded: boolean;
  onToggle: () => void;
  sessions: StatsSessionsViewModel;
  onSelectSession: (id: string) => void;
};

export function StatsSessionsSection({
  expanded,
  onToggle,
  sessions,
  onSelectSession,
}: StatsSessionsSectionProps) {
  return (
    <ExpandableSectionCard
      title={sessions.title}
      description={sessions.description}
      expanded={expanded}
      onToggle={onToggle}
    >
          <StatsSessionRhythmPanel
            rhythmPanel={sessions.rhythmPanel}
          />

          <div className="stats-section-divider" />

          <div>
            <SectionHeader
              className="stats-session-head"
              title={sessions.historyTitle}
              description={sessions.historyDescription}
              titleTag="h4"
            />

            {!sessions.hasHistory ? (
              <EmptyStateNotice text={sessions.emptyLabel} />
            ) : (
              <div className="stats-session-grid">
                <StatsSessionHistoryList
                  items={sessions.historyItems}
                  emptyLabel={sessions.emptyLabel}
                  selectedHistorySessionId={sessions.selectedHistorySessionId}
                  onSelectSession={onSelectSession}
                />

                <StatsSessionDetail
                  detail={sessions.detail}
                />
              </div>
            )}
          </div>
    </ExpandableSectionCard>
  );
}

