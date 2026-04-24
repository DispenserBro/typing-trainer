import { useState } from 'react';

export type SettingsResetTarget =
  | 'game'
  | 'lessons'
  | 'mastery'
  | 'all';

type SettingsResetHandlers = Record<SettingsResetTarget, () => void>;

export function useSettingsPageState(resetHandlers: SettingsResetHandlers) {
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<SettingsResetTarget | null>(null);

  const handleResetConfirm = () => {
    if (!resetTarget) return;
    resetHandlers[resetTarget]();
    setResetTarget(null);
  };

  return {
    showThemeModal,
    setShowThemeModal,
    resetTarget,
    setResetTarget,
    handleResetConfirm,
  };
}
