import type { ReactNode } from 'react';
import { Button } from './Button';

type AchievementCounterButtonProps = {
  children: ReactNode;
  className?: string;
  countClassName?: string;
  icon: ReactNode;
  onClick: () => void;
  total: number;
  unlocked: number;
};

export function AchievementCounterButton({
  children,
  className,
  countClassName = 'game-achievements-count',
  icon,
  onClick,
  total,
  unlocked,
}: AchievementCounterButtonProps) {
  return (
    <Button
      size="sm"
      className={['game-achievements-button', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {icon}
      {children}
      <span className={countClassName}>{unlocked}/{total}</span>
    </Button>
  );
}
