import { Button } from '../ui/Button';
import { ModalLayout } from '../ui/ModalLayout';

type PracticeUnlockModalProps = {
  letter: string | null;
  onClose: () => void;
  translate: (key: string) => string;
};

export function PracticeUnlockModal({ letter, onClose, translate }: PracticeUnlockModalProps) {
  if (!letter) return null;

  return (
    <ModalLayout onClose={onClose} title={translate('practice.letterUnlockedTitle')}>
      <div className="unlock-letter-card mt-12">
        <div className="unlock-letter-value">{letter.toUpperCase()}</div>
        <p>{translate('practice.letterUnlockedDescription')}</p>
        <p className="card-desc">{translate('practice.letterUnlockedHint')}</p>
        <Button variant="accent" onClick={onClose}>
          {translate('practice.continue')}
        </Button>
      </div>
    </ModalLayout>
  );
}
