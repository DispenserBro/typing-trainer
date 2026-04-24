import { Medal } from 'lucide-react';
import { AchievementCounterButton } from '../ui/AchievementCounterButton';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';

type ModePageHeaderProps = {
  achievementsLabel: string;
  achievementsTotal: number;
  achievementsUnlocked: number;
  description: string;
  extraDescription?: string | null;
  onOpenAchievements: () => void;
  onStart: () => void;
  startDisabled: boolean;
  startLabel: string;
  title: string;
};

export function ModePageHeader({
  achievementsLabel,
  achievementsTotal,
  achievementsUnlocked,
  description,
  extraDescription,
  onOpenAchievements,
  onStart,
  startDisabled,
  startLabel,
  title,
}: ModePageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      extraDescription={extraDescription}
      inlineActions={(
        <AchievementCounterButton
          icon={<Medal size={14} />}
          onClick={onOpenAchievements}
          total={achievementsTotal}
          unlocked={achievementsUnlocked}
        >
          {achievementsLabel}
        </AchievementCounterButton>
      )}
      actions={(
        <Button variant="accent" disabled={startDisabled} onClick={onStart}>{startLabel}</Button>
      )}
    />
  );
}
