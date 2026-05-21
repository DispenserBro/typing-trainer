import type { ReactNode } from 'react';
import { buildHomeModeCardGroups } from '../../../core/home/viewModel';
import { SectionHeader } from '../ui/SectionHeader';

type HomeModeCard = {
  id: string;
  title: string;
  meta: string;
  description: string;
  badge?: string;
};

type HomeModesSectionProps = {
  cards: HomeModeCard[];
  icons: Record<string, ReactNode>;
  description?: string;
  sectionTitle: string;
  onOpenMode: (id: string) => void;
};

export function HomeModesSection({
  cards,
  description,
  icons,
  onOpenMode,
  sectionTitle,
}: HomeModesSectionProps) {
  const { primaryCards, utilityCards } = buildHomeModeCardGroups(cards);

  return (
    <div className="home-section">
      <SectionHeader className="home-section-head" title={sectionTitle} description={description} />
      <div className="home-mode-grid">
        {primaryCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="card home-mode-card"
            onClick={() => onOpenMode(card.id)}
          >
            <div className="home-card-head">
              <span className="home-card-icon">{icons[card.id]}</span>
              <span className="home-card-meta">{card.meta}</span>
            </div>
            <div className="home-card-copy">
              {card.badge ? <span className="home-mode-card-badge">{card.badge}</span> : null}
              <h4>{card.title}</h4>
              <p>{card.description}</p>
            </div>
          </button>
        ))}
      </div>
      {utilityCards.length > 0 ? (
        <div className="home-mode-utility-row">
          {utilityCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="card home-mode-card utility"
              onClick={() => onOpenMode(card.id)}
            >
              <div className="home-card-head">
                <span className="home-card-icon">{icons[card.id]}</span>
                <span className="home-card-meta">{card.meta}</span>
              </div>
              <div className="home-card-copy">
                <h4>{card.title}</h4>
                <p>{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
