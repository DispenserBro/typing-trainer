import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { HomeSummaryCard } from './HomeSummaryCard';

type HomeWeeklyGoal = {
  id: string;
  title: string;
  value: string;
  progressPercent: number;
  description: string;
};

type HomeWeeklySectionProps = {
  collapseLabel: string;
  defaultExpanded?: boolean;
  description: string;
  expandLabel: string;
  sectionTitle: string;
  goals: HomeWeeklyGoal[];
};

export function HomeWeeklySection({
  collapseLabel,
  defaultExpanded = false,
  description,
  expandLabel,
  goals,
  sectionTitle,
}: HomeWeeklySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="home-section">
      <div className="home-section-head home-section-head-collapsible">
        <SectionHeader title={sectionTitle} description={description} />
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
        <div className="home-summary-grid">
          {goals.map((goal) => (
            <HomeSummaryCard
              key={goal.id}
              label={goal.title}
              value={goal.value}
              progressPercent={goal.progressPercent}
              description={goal.description}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
