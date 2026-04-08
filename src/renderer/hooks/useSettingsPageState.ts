import { useState } from 'react';

export function useSettingsPageState(onResetAllProgress: () => void, onResetGameProgress: () => void) {
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetGameModal, setShowResetGameModal] = useState(false);

  const handleResetAll = () => {
    onResetAllProgress();
    setShowResetModal(false);
  };

  const handleResetGame = () => {
    onResetGameProgress();
    setShowResetGameModal(false);
  };

  return {
    showThemeModal,
    setShowThemeModal,
    showResetModal,
    setShowResetModal,
    showResetGameModal,
    setShowResetGameModal,
    handleResetAll,
    handleResetGame,
  };
}
