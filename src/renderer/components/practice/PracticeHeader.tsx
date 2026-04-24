import { Medal } from 'lucide-react';
import { AchievementCounterButton } from '../ui/AchievementCounterButton';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';

type PracticeHeaderProps = {
  achievementsLabel: string;
  achievementsTotal: number;
  achievementsUnlocked: number;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  settingsLabel: string;
  title: string;
};

export function PracticeHeader({
  achievementsLabel,
  achievementsTotal,
  achievementsUnlocked,
  onOpenAchievements,
  onOpenSettings,
  settingsLabel,
  title,
}: PracticeHeaderProps) {
  return (
    <PageHeader
      title={title}
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
      actionsClassName="practice-header-actions"
      actions={(
        <Button size="sm" className="practice-settings-trigger" onClick={onOpenSettings}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {settingsLabel}
        </Button>
      )}
    />
  );
}
