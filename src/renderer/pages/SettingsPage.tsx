import { useApp } from '../contexts/AppContext';
import { SettingsGrid } from '../components/settings/SettingsGrid';
import { SettingsOverlays } from '../components/settings/SettingsOverlays';
import { useSettingsPageState } from '../hooks/useSettingsPageState';

export function SettingsPage() {
  const {
    layouts, currentLayout, setCurrentLayout,
    currentLanguage, setCurrentLanguage,
    languages, layoutsForLanguage,
    settings, saveSetting,
    keyboardPreviewActive, setKeyboardPreviewActive,
    progress, saveProgress, resetGameProgress,
    customThemes, applyTheme,
  } = useApp();

  const handleResetProgress = () => {
    const empty = { settings: progress.settings, practiceSettings: progress.practiceSettings };
    saveProgress(empty);
  };

  const {
    showThemeModal,
    setShowThemeModal,
    showResetModal,
    setShowResetModal,
    showResetGameModal,
    setShowResetGameModal,
    handleResetAll,
    handleResetGame,
  } = useSettingsPageState(handleResetProgress, resetGameProgress);

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Настройки</h1></div>

      <SettingsGrid
        currentLanguage={currentLanguage}
        languages={languages}
        setCurrentLanguage={setCurrentLanguage}
        settings={settings}
        saveSetting={saveSetting}
        currentLayout={currentLayout}
        layoutsForLanguage={layoutsForLanguage}
        setCurrentLayout={setCurrentLayout}
        customThemes={customThemes}
        applyTheme={applyTheme}
        onOpenThemeEditor={() => setShowThemeModal(true)}
        keyboardPreviewActive={keyboardPreviewActive}
        setKeyboardPreviewActive={setKeyboardPreviewActive}
        onResetGame={() => setShowResetGameModal(true)}
        onResetAll={() => setShowResetModal(true)}
      />

      <SettingsOverlays
        showThemeModal={showThemeModal}
        onCloseThemeModal={() => setShowThemeModal(false)}
        showResetGameModal={showResetGameModal}
        showResetModal={showResetModal}
        onCloseResetGame={() => setShowResetGameModal(false)}
        onCloseResetAll={() => setShowResetModal(false)}
        onConfirmResetGame={handleResetGame}
        onConfirmResetAll={handleResetAll}
      />
    </section>
  );
}
