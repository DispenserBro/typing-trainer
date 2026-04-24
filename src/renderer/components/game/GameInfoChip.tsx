import type { ReactNode } from 'react';

type GameInfoChipProps = {
  className?: string;
  subtitle: ReactNode;
  title: ReactNode;
};

export function GameInfoChip({
  className,
  subtitle,
  title,
}: GameInfoChipProps) {
  return (
    <div className={className}>
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </div>
  );
}
