import type {
  CustomThemes,
  LanguageInfo,
  Layout,
  UserSettings,
} from '../../../shared/types';
import {
  SettingsCursorCard,
  SettingsInputCard,
  SettingsLanguageCard,
  SettingsLayoutCard,
  SettingsSpeedUnitCard,
  SettingsTextCard,
  SettingsThemeCard,
} from './SettingsGeneralCards';
import { SettingsKeyboardCard } from './SettingsKeyboardCard';
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
      <SettingsProgressCard
        onResetGame={onResetGame}
        onResetAll={onResetAll}
      />
    </div>
  );
}
