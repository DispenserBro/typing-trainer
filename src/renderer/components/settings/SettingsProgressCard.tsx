import { useI18n } from '../../contexts/I18nContext';
import type { SettingsResetTarget } from '../../hooks/useSettingsPageState';
import { Button } from '../ui/Button';
import { SettingsCard } from '../ui/SettingsCard';

export function SettingsProgressCard({
  onReset,
}: {
  onReset: (target: SettingsResetTarget) => void;
}) {
  const { t } = useI18n();
  const resetActions: Array<{ target: SettingsResetTarget; tone: 'secondary' | 'danger' }> = [
    { target: 'game', tone: 'secondary' },
    { target: 'lessons', tone: 'secondary' },
    { target: 'mastery', tone: 'secondary' },
    { target: 'all', tone: 'danger' },
  ];

  return (
    <SettingsCard
      title={t('settings.cards.progress.title')}
      description={t('settings.cards.progress.description')}
    >
      <div className="settings-reset-actions">
        {resetActions.map(action => (
          <Button
            key={action.target}
            variant={action.tone}
            className="settings-reset-button"
            onClick={() => onReset(action.target)}
          >
            {t(`settings.cards.progress.actions.${action.target}`)}
          </Button>
        ))}
      </div>
    </SettingsCard>
  );
}
