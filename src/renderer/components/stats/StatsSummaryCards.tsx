import type { StatsSummaryCardsViewModel } from '../../../core/stats/viewModel';
import { SummaryCard } from '../ui/SummaryCard';

export function StatsSummaryCards({
  cards,
  trendTitle,
  trends,
}: StatsSummaryCardsViewModel) {
  return (
    <div className="stats-summary-grid">
      {cards.map(card => (
        <SummaryCard
          key={card.id}
          className="stats-summary-card"
          label={card.label}
          labelClassName="stats-summary-label"
          note={card.note}
          noteClassName="stats-summary-note"
          value={card.value}
          valueClassName={`stats-summary-value${card.valueSmall ? ' stats-summary-value-small' : ''}`}
        />
      ))}

      <div className="card stats-summary-card">
        <span className="stats-summary-label">{trendTitle}</span>
        <div className="stats-summary-trends">
          {trends.map(trend => (
            <div className={`stats-summary-trend ${trend.tone}`} key={trend.id}>
              <span>{trend.label}</span>
              <b>{trend.value}</b>
              <small>{trend.note}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
