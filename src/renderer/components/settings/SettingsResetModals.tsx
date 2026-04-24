import { useI18n } from '../../contexts/I18nContext';
import type { SettingsResetTarget } from '../../hooks/useSettingsPageState';
import { ActionRow } from '../ui/ActionRow';
import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';
import { UiNotice } from '../ui/UiNotice';

type SettingsResetModalsProps = {
  resetTarget: SettingsResetTarget | null;
  onCloseReset: () => void;
  onConfirmReset: () => void;
};

export function SettingsResetModals({
  resetTarget,
  onCloseReset,
  onConfirmReset,
}: SettingsResetModalsProps) {
  const { t } = useI18n();
  if (!resetTarget) return null;

  const itemKeys: Record<SettingsResetTarget, string[]> = {
    game: ['gameItem1', 'gameItem2', 'gameItem3'],
    lessons: ['lessonsItem1', 'lessonsItem2', 'lessonsItem3'],
    mastery: ['masteryItem1', 'masteryItem2', 'masteryItem3'],
    all: ['fullItem1', 'fullItem2', 'fullItem3', 'fullItem4'],
  };

  const prefix = `settings.cards.resetModal.${resetTarget}`;
  const title = t(`${prefix}.title`);
  const description = t(`${prefix}.description`);
  const willReset = t(`${prefix}.willReset`);

  return (
    <ModalLayout
      onClose={onCloseReset}
      title={title}
      description={description}
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button variant="danger" onClick={onConfirmReset}>{t('settings.cards.resetModal.confirm')}</Button>
          <Button onClick={onCloseReset}>{t('settings.cards.resetModal.cancel')}</Button>
        </ActionRow>
      )}
    >
      <UiNotice className="reset-progress-note" tone="danger" title={willReset}>
        <ul className="reset-progress-list">
          {itemKeys[resetTarget].map(itemKey => (
            <li key={itemKey}>{t(`${prefix}.${itemKey}`)}</li>
          ))}
        </ul>
      </UiNotice>
    </ModalLayout>
  );
}
