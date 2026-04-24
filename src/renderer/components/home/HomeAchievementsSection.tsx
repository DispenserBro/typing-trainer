import { Trophy } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';

type HomeAchievementsSectionProps = {
  collectionDescription: string;
  collectionTitle: string;
  description?: string;
  sectionTitle: string;
  totalAchievementsCount: number;
  totalUnlockedAchievements: number;
  onOpen: () => void;
};

export function HomeAchievementsSection({
  collectionDescription,
  collectionTitle,
  description,
  onOpen,
  sectionTitle,
  totalAchievementsCount,
  totalUnlockedAchievements,
}: HomeAchievementsSectionProps) {
  return (
    <div className="home-section">
      <SectionHeader className="home-section-head" title={sectionTitle} description={description} />
      <button
        type="button"
        className="card home-achievements-card"
        onClick={onOpen}
      >
        <div className="home-achievements-card-left">
          <div className="home-achievements-card-head">
            <Trophy size={24} className="home-achievements-card-icon" />
            <h3>{collectionTitle}</h3>
          </div>
          <p className="home-achievements-card-desc">{collectionDescription}</p>
        </div>
        <div className="home-achievements-card-count">
          <span className="home-achievements-card-value">
            {totalUnlockedAchievements}
          </span>
          <span className="home-achievements-card-total">
            / {totalAchievementsCount}
          </span>
        </div>
      </button>
    </div>
  );
}
