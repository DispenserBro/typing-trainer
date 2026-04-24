import type {
  StatsInsightListItemViewModel,
  StatsInsightListViewModel,
  StatsInsightsViewModel,
} from '../../../core/stats/viewModel';
import { EmptyStateNotice } from '../ui/EmptyStateNotice';
import { ExpandableSectionCard } from '../ui/ExpandableSectionCard';

type StatsInsightsSectionProps = {
  expanded: boolean;
  insights: StatsInsightsViewModel;
  onToggle: () => void;
};

function InsightList({ items }: { items: StatsInsightListItemViewModel[] }) {
  return (
    <div className="smart-stats-list">
      {items.map(item => (
        <div key={item.id} className="smart-stat-row">
          <div className="smart-stat-main">
            <span className={`smart-stat-token${item.tokenMono ? ' mono' : ''}`}>{item.tokenLabel}</span>
            <span className="smart-stat-reason">{item.reasonLabel}</span>
          </div>
          <span className="smart-stat-score">{item.scoreLabel}</span>
        </div>
      ))}
    </div>
  );
}

function InsightListCard({ card }: { card: StatsInsightListViewModel }) {
  return (
    <div className="smart-stats-card">
      <div className="smart-stats-head">
        <h5>{card.title}</h5>
        <span>{card.subtitle}</span>
      </div>
      {card.items.length === 0 ? (
        <EmptyStateNotice className="smart-stats-empty" text={card.emptyLabel} />
      ) : (
        <InsightList items={card.items} />
      )}
    </div>
  );
}

export function StatsInsightsSection({
  expanded,
  insights,
  onToggle,
}: StatsInsightsSectionProps) {
  return (
    <ExpandableSectionCard
      title={insights.title}
      description={insights.description}
      expanded={expanded}
      onToggle={onToggle}
    >
      <>
        {!insights.hasInsights ? (
          <EmptyStateNotice text={insights.notEnoughDataLabel} />
        ) : (
          <div className="smart-stats-grid">
            <InsightListCard card={insights.weakChars} />

            <InsightListCard card={insights.weakBigrams} />

            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>{insights.zones.title}</h5>
                <span>{insights.zones.subtitle}</span>
              </div>
              <div className="smart-stats-dual">
                {insights.zones.groups.map(group => (
                  <div key={group.id}>
                    <span className="smart-stats-subtitle">{group.title}</span>
                    {group.items.length === 0 ? (
                      <EmptyStateNotice className="smart-stats-empty" text={group.emptyLabel} />
                    ) : (
                      <div className="smart-stats-list compact">
                        {group.items.map(item => (
                          <div key={item.id} className="smart-stat-row">
                            <div className="smart-stat-main">
                              <span className="smart-stat-token">{item.tokenLabel}</span>
                              <span className="smart-stat-reason">{item.reasonLabel}</span>
                            </div>
                            <span className="smart-stat-score">{item.scoreLabel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="smart-stats-card">
              <div className="smart-stats-head">
                <h5>{insights.rhythm.title}</h5>
                <span>{insights.rhythm.subtitle}</span>
              </div>
              {!insights.rhythm.insight ? (
                <EmptyStateNotice className="smart-stats-empty" text={insights.rhythm.emptyLabel} />
              ) : (
                <div className="smart-rhythm-card">
                  <div className="smart-rhythm-score">
                    <b>{insights.rhythm.insight.scoreLabel}</b>
                    <span>{insights.rhythm.insight.scoreTitle}</span>
                  </div>
                  <div className="smart-rhythm-meta">
                    {insights.rhythm.insight.metaLabels.map(label => <span key={label}>{label}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    </ExpandableSectionCard>
  );
}

