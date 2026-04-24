import {
  useAppGame,
  useAppNavigation,
  useAppPractice,
  useAppSettings,
  useAppUi,
} from '../contexts/AppContext';
import { SettingsGrid } from '../components/settings/SettingsGrid';
import { SettingsOverlays } from '../components/settings/SettingsOverlays';
import { PageHeader } from '../components/ui/PageHeader';
import { useSettingsPageState } from '../hooks/useSettingsPageState';
import { useI18n } from '../contexts/I18nContext';

export function SettingsPage() {
  const { t } = useI18n();
  const {
    progress, saveProgress,
  } = useAppPractice();
  const { resetGameProgress } = useAppGame();
  const { currentMode } = useAppNavigation();
  const {
    importedInterfaceLocales,
    currentLayout, setCurrentLayout,
    currentLanguage, setCurrentLanguage,
    languages, layoutsForLanguage,
    settings, saveSetting,
    customThemes, availableThemes, applyTheme, installTheme,
    customPresets, applyPreset, saveCurrentAsPreset, deletePreset,
    exportConfig, importConfig, importInterfaceLocale, removeImportedInterfaceLocale,
    modeProfiles, saveModeProfile, clearModeProfile,
  } = useAppSettings();
  const { keyboardPreviewActive, setKeyboardPreviewActive } = useAppUi();

  const handleResetAllProgress = () => {
    const empty = {
      settings: progress.settings,
      practiceSettings: progress.practiceSettings,
      modePracticeSettings: progress.modePracticeSettings,
      customPresets: progress.customPresets,
      modeProfiles: progress.modeProfiles,
      customPracticePacks: progress.customPracticePacks,
      importedInterfaceLocales: progress.importedInterfaceLocales,
    };
    saveProgress(empty);
  };

  const handleResetLessonsProgress = () => {
    saveProgress({
      ...progress,
      lessons: undefined,
    });
  };

  const handleResetMasteryProgress = () => {
    saveProgress({
      ...progress,
      layoutProgress: undefined,
      practice: undefined,
      motivation: undefined,
    });
  };

  const {
    showThemeModal,
    setShowThemeModal,
    resetTarget,
    setResetTarget,
    handleResetConfirm,
  } = useSettingsPageState({
    game: resetGameProgress,
    lessons: handleResetLessonsProgress,
    mastery: handleResetMasteryProgress,
    all: handleResetAllProgress,
  });

  return (
    <section className="mode-panel active settings-page">
      <PageHeader title={t('settings.title')} />

      <SettingsGrid
        currentLanguage={currentLanguage}
        languages={languages}
        setCurrentLanguage={setCurrentLanguage}
        settings={settings}
        saveSetting={saveSetting}
        importedInterfaceLocales={importedInterfaceLocales}
        importInterfaceLocale={importInterfaceLocale}
        removeImportedInterfaceLocale={removeImportedInterfaceLocale}
        currentLayout={currentLayout}
        layoutsForLanguage={layoutsForLanguage}
        setCurrentLayout={setCurrentLayout}
        customThemes={customThemes}
        availableThemes={availableThemes}
        applyTheme={applyTheme}
        installTheme={installTheme}
        onOpenThemeEditor={() => setShowThemeModal(true)}
        keyboardPreviewActive={keyboardPreviewActive}
        setKeyboardPreviewActive={setKeyboardPreviewActive}
        customPresets={customPresets}
        applyPreset={applyPreset}
        saveCurrentAsPreset={saveCurrentAsPreset}
        deletePreset={deletePreset}
        exportConfig={exportConfig}
        importConfig={importConfig}
        currentMode={currentMode}
        modeProfiles={modeProfiles}
        saveModeProfile={saveModeProfile}
        clearModeProfile={clearModeProfile}
        onResetProgress={setResetTarget}
      />

      <SettingsOverlays
        showThemeModal={showThemeModal}
        onCloseThemeModal={() => setShowThemeModal(false)}
        resetTarget={resetTarget}
        onCloseReset={() => setResetTarget(null)}
        onConfirmReset={handleResetConfirm}
      />
    </section>
  );
}
