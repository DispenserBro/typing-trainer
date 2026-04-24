import { ThemeModal } from '../ThemeModal';
import { SettingsResetModals } from './SettingsResetModals';
import type { SettingsResetTarget } from '../../hooks/useSettingsPageState';

type SettingsOverlaysProps = {
  showThemeModal: boolean;
  onCloseThemeModal: () => void;
  resetTarget: SettingsResetTarget | null;
  onCloseReset: () => void;
  onConfirmReset: () => void;
};

export function SettingsOverlays({
  showThemeModal,
  onCloseThemeModal,
  resetTarget,
  onCloseReset,
  onConfirmReset,
}: SettingsOverlaysProps) {
  return (
    <>
      {showThemeModal && <ThemeModal onClose={onCloseThemeModal} />}
      <SettingsResetModals
        resetTarget={resetTarget}
        onCloseReset={onCloseReset}
        onConfirmReset={onConfirmReset}
      />
    </>
  );
}
