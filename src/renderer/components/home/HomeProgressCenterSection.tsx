import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';

type HomeProgressCenterCard = {
  id: 'season' | 'mode-focus' | 'records' | 'mastery' | 'goals' | 'streaks';
  title: string;
  summary: string;
  description: string;
  icon: ReactNode;
};

type HomeProgressCenterSectionProps = {
  cards: HomeProgressCenterCard[];
  collapseLabel: string;
  defaultExpanded?: boolean;
  expandLabel: string;
  openWindowLabel: string;
  sectionTitle: string;
  onOpenCard: (id: HomeProgressCenterCard['id']) => void;
};

export function HomeProgressCenterSection({
  cards,
  collapseLabel,
  defaultExpanded = false,
  expandLabel,
  onOpenCard,
  openWindowLabel,
  sectionTitle,
}: HomeProgressCenterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visibleCards = useMemo(
    () => (expanded ? cards : cards.slice(0, 3)),
    [cards, expanded],
  );
  const canToggle = cards.length > 3;

  return (
    <div className="home-section">
      <div className="home-section-head home-section-head-collapsible">
        <SectionHeader title={sectionTitle} />
        {canToggle ? (
          <button
            type="button"
            className={`home-section-toggle${expanded ? ' expanded' : ''}`}
            aria-expanded={expanded}
            onClick={() => setExpanded(current => !current)}
          >
            <span>{expanded ? collapseLabel : expandLabel}</span>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : null}
      </div>
      <div className="home-hub-grid">
        {visibleCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="card home-hub-card"
            onClick={() => onOpenCard(card.id)}
          >
            <div className="home-card-head">
              <span className="home-card-icon">{card.icon}</span>
              <span className="home-card-meta">{openWindowLabel}</span>
            </div>
            <h4>{card.title}</h4>
            <strong className="home-hub-card-summary">{card.summary}</strong>
            <p>{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
