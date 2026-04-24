import type { ReactNode } from 'react';
import { SummaryCard } from '../ui/SummaryCard';

type HomeSummaryCardProps = {
  className?: string;
  description?: ReactNode;
  details?: ReactNode[];
  label: ReactNode;
  onClick?: () => void;
  progressPercent?: number;
  value: ReactNode;
  variant?: 'summary' | 'insight';
};

export function HomeSummaryCard({
  className,
  description,
  details,
  label,
  onClick,
  progressPercent,
  value,
  variant = 'summary',
}: HomeSummaryCardProps) {
  const cardClassName = [
    variant === 'insight' ? 'home-insight-card' : 'home-summary-card',
    className,
  ].filter(Boolean).join(' ');

  return (
    <SummaryCard
      className={cardClassName}
      description={description}
      details={details}
      label={label}
      labelClassName="home-summary-label"
      onClick={onClick}
      progressClassName="home-progress-bar"
      progressFillClassName=""
      progressPercent={progressPercent}
      value={value}
    />
  );
}
