import type {
  CustomPresets,
  CustomThemes,
  LanguageInfo,
  Layout,
  PresetSettings,
  UserSettings,
} from '../../../shared/types';
import {
  SettingsAccessibilityCard,
  SettingsCursorCard,
  SettingsDisplayCard,
  SettingsInputCard,
  SettingsLanguageCard,
  SettingsLayoutCard,
  SettingsModeProfilesCard,
  SettingsSpeedUnitCard,
  SettingsTextCard,
  SettingsThemeCard,
} from './SettingsGeneralCards';
import { SettingsKeyboardCard } from './SettingsKeyboardCard';
import { SettingsPresetsCard } from './SettingsPresetsCard';
import { SettingsProgressCard } from './SettingsProgressCard';

type SettingsGridProps = {
  currentLanguage: string;
  languages: LanguageInfo[];
  setCurrentLanguage: (language: string) => void;
  settings: UserSettings;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  currentLayout: string;
  layoutsForLanguage: [string, Layout][];
  setCurrentLayout: (layout: string) => void;
  customThemes: CustomThemes;
  applyTheme: (name: string) => void;
  onOpenThemeEditor: () => void;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;
  customPresets: CustomPresets;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => string;
  deletePreset: (presetId: string) => void;
  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<string | null>;
  currentMode: string;
  modeProfiles: Partial<Record<string, Partial<PresetSettings>>>;
  saveModeProfile: (mode: string) => void;
  clearModeProfile: (mode: string) => void;
  onResetGame: () => void;
  onResetAll: () => void;
};

export function SettingsGrid({
  currentLanguage,
  languages,
  setCurrentLanguage,
  settings,
  saveSetting,
  currentLayout,
  layoutsForLanguage,
  setCurrentLayout,
  customThemes,
  applyTheme,
  onOpenThemeEditor,
  keyboardPreviewActive,
  setKeyboardPreviewActive,
  customPresets,
  applyPreset,
  saveCurrentAsPreset,
  deletePreset,
  exportConfig,
  importConfig,
  currentMode,
  modeProfiles,
  saveModeProfile,
  clearModeProfile,
  onResetGame,
  onResetAll,
}: SettingsGridProps) {
  return (
    <div className="settings-grid">
      <SettingsLanguageCard
        currentLanguage={currentLanguage}
        languages={languages}
        setCurrentLanguage={setCurrentLanguage}
        settings={settings}
        saveSetting={saveSetting}
      />
      <SettingsLayoutCard
        currentLayout={currentLayout}
        layoutsForLanguage={layoutsForLanguage}
        setCurrentLayout={setCurrentLayout}
      />
      <SettingsSpeedUnitCard settings={settings} saveSetting={saveSetting} />
      <SettingsCursorCard settings={settings} saveSetting={saveSetting} />
      <SettingsThemeCard
        settings={settings}
        customThemes={customThemes}
        saveSetting={saveSetting}
        applyTheme={applyTheme}
        onOpenThemeEditor={onOpenThemeEditor}
      />
      <SettingsKeyboardCard
        settings={settings}
        keyboardPreviewActive={keyboardPreviewActive}
        setKeyboardPreviewActive={setKeyboardPreviewActive}
        saveSetting={saveSetting}
      />
      <SettingsInputCard settings={settings} saveSetting={saveSetting} />
      <SettingsTextCard settings={settings} saveSetting={saveSetting} />
      <SettingsDisplayCard settings={settings} saveSetting={saveSetting} />
      <SettingsAccessibilityCard settings={settings} saveSetting={saveSetting} />
      <SettingsPresetsCard
        customPresets={customPresets}
        settings={settings}
        applyPreset={applyPreset}
        saveCurrentAsPreset={saveCurrentAsPreset}
        deletePreset={deletePreset}
        exportConfig={exportConfig}
        importConfig={importConfig}
      />
      <SettingsModeProfilesCard
        currentMode={currentMode}
        modeProfiles={modeProfiles}
        saveModeProfile={saveModeProfile}
        clearModeProfile={clearModeProfile}
      />
      <SettingsProgressCard
        onResetGame={onResetGame}
        onResetAll={onResetAll}
      />
    </div>
  );
}
