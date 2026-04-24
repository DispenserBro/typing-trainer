import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

type HomeHeroSectionProps = {
  description: string;
  heroTags: string[];
  kicker: string;
  onOpenSecondary?: () => void;
  onRunPrimary: () => void;
  openSecondaryLabel?: string | null;
  primaryActionLabel: string;
  recommendationDescription: string;
  recommendationLabel: string;
  recommendationTitle: string;
  title: string;
};

export function HomeHeroSection({
  description,
  heroTags,
  kicker,
  onOpenSecondary,
  onRunPrimary,
  openSecondaryLabel,
  primaryActionLabel,
  recommendationDescription,
  recommendationLabel,
  recommendationTitle,
  title,
}: HomeHeroSectionProps) {
  return (
    <div className="home-hero card">
      <div className="home-hero-copy">
        <span className="home-kicker">{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="home-hero-actions">
          <Button variant="accent" onClick={onRunPrimary}>
            {primaryActionLabel}
          </Button>
          {openSecondaryLabel && onOpenSecondary ? (
            <Button onClick={onOpenSecondary}>
              {openSecondaryLabel}
            </Button>
          ) : null}
        </div>
        <div className="home-hero-tags">
          {heroTags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>

      <div className="home-recommendation">
        <div className="home-recommendation-head">
          <Sparkles size={18} />
          <span>{recommendationLabel}</span>
        </div>
        <h3>{recommendationTitle}</h3>
        <p>{recommendationDescription}</p>
      </div>
    </div>
  );
}
