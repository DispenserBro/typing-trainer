import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { HomeSummaryCard } from './HomeSummaryCard';

type HomeProfileSummaryCard = {
  id: string;
  label: string;
  value: string;
  description: string;
  progressPercent?: number;
};

type HomeQuickInsight = {
  id: string;
  label: string;
  value: string;
  description: string;
};

type HomeProfileSectionProps = {
  collapseLabel: string;
  defaultExpanded?: boolean;
  expandLabel: string;
  quickInsightsTitle: string;
  sectionTitle: string;
  summaryCards: HomeProfileSummaryCard[];
  quickInsights: HomeQuickInsight[];
};

export function HomeProfileSection({
  collapseLabel,
  defaultExpanded = false,
  expandLabel,
  quickInsights,
  quickInsightsTitle,
  sectionTitle,
  summaryCards,
}: HomeProfileSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="home-section">
      <div className="home-section-head home-section-head-collapsible">
        <SectionHeader title={sectionTitle} />
        <button
          type="button"
          className={`home-section-toggle${expanded ? ' expanded' : ''}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{expanded ? collapseLabel : expandLabel}</span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {expanded ? (
        <>
          <div className="home-summary-grid">
            {summaryCards.map((card) => (
              <HomeSummaryCard
                key={card.id}
                label={card.label}
                value={card.value}
                progressPercent={card.progressPercent}
                description={card.description}
              />
            ))}
          </div>
          <div className="home-inline-stack">
            <span className="home-inline-subtitle">{quickInsightsTitle}</span>
            <div className="home-insight-grid">
              {quickInsights.map((insight) => (
                <HomeSummaryCard
                  key={insight.id}
                  variant="insight"
                  label={insight.label}
                  value={insight.value}
                  description={insight.description}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
