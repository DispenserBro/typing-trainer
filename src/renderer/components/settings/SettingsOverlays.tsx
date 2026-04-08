import { ThemeModal } from '../ThemeModal';
import { SettingsResetModals } from './SettingsResetModals';

type SettingsOverlaysProps = {
  showThemeModal: boolean;
  onCloseThemeModal: () => void;
  showResetGameModal: boolean;
  showResetModal: boolean;
  onCloseResetGame: () => void;
  onCloseResetAll: () => void;
  onConfirmResetGame: () => void;
  onConfirmResetAll: () => void;
};

export function SettingsOverlays({
  showThemeModal,
  onCloseThemeModal,
  showResetGameModal,
  showResetModal,
  onCloseResetGame,
  onCloseResetAll,
  onConfirmResetGame,
  onConfirmResetAll,
}: SettingsOverlaysProps) {
  return (
    <>
      {showThemeModal && <ThemeModal onClose={onCloseThemeModal} />}
      <SettingsResetModals
        showResetGameModal={showResetGameModal}
        showResetModal={showResetModal}
        onCloseResetGame={onCloseResetGame}
        onCloseResetAll={onCloseResetAll}
        onConfirmResetGame={onConfirmResetGame}
        onConfirmResetAll={onConfirmResetAll}
      />
    </>
  );
}
