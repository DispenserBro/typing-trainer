import type { ReactNode } from 'react';
import { SectionHeader } from '../ui/SectionHeader';

type HomeActionCard = {
  id: string;
  title: string;
  meta: string;
  actionMode: string;
};

type HomeQuickActionsSectionProps = {
  actions: HomeActionCard[];
  icons: Record<string, ReactNode>;
  sectionTitle: string;
  onRunAction: (mode: string) => void;
};

export function HomeQuickActionsSection({
  actions,
  icons,
  onRunAction,
  sectionTitle,
}: HomeQuickActionsSectionProps) {
  return (
    <div className="home-section">
      <SectionHeader className="home-section-head" title={sectionTitle} />
      <div className="home-action-grid compact">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="card home-action-card compact"
            onClick={() => onRunAction(action.actionMode)}
          >
            <div className="home-card-head compact">
              <span className="home-card-icon">{icons[action.id]}</span>
              <div className="home-action-copy">
                <h4>{action.title}</h4>
                <span className="home-card-meta inline">{action.meta}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
