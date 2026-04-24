import { useMemo, useState, type ReactNode } from 'react';
import {
  Accessibility,
  BrushCleaning,
  Globe2,
  Info,
  Keyboard,
} from 'lucide-react';
import type {
  CustomPresets,
  CustomThemes,
  ImportedInterfaceLocaleDefinition,
  ThemeDefinitions,
  ThemeInstallResult,
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
  SettingsModeProfilesCard,
  SettingsSpeedUnitCard,
  SettingsTextCard,
  SettingsThemeCard,
} from './SettingsGeneralCards';
import { SettingsKeyboardCard } from './SettingsKeyboardCard';
import { SettingsAboutCard } from './SettingsAboutCard';
import { SettingsPresetsCard } from './SettingsPresetsCard';
import { SettingsProgressCard } from './SettingsProgressCard';
import { useI18n } from '../../contexts/I18nContext';
import type { SettingsResetTarget } from '../../hooks/useSettingsPageState';

type SettingsGridProps = {
  currentLanguage: string;
  languages: LanguageInfo[];
  setCurrentLanguage: (language: string) => void;
  settings: UserSettings;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  importedInterfaceLocales: Record<string, ImportedInterfaceLocaleDefinition>;
  importInterfaceLocale: () => Promise<string | null>;
  removeImportedInterfaceLocale: (localeId: string) => void;
  currentLayout: string;
  layoutsForLanguage: [string, Layout][];
  setCurrentLayout: (layout: string) => void;
  customThemes: CustomThemes;
  availableThemes: ThemeDefinitions;
  applyTheme: (name: string) => void;
  installTheme: () => Promise<ThemeInstallResult>;
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
  onResetProgress: (target: SettingsResetTarget) => void;
};

type SettingsCategory = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  cards: ReactNode[];
};

export function SettingsGrid({
  currentLanguage,
  languages,
  setCurrentLanguage,
  settings,
  saveSetting,
  importedInterfaceLocales,
  importInterfaceLocale,
  removeImportedInterfaceLocale,
  currentLayout,
  layoutsForLanguage,
  setCurrentLayout,
  customThemes,
  availableThemes,
  applyTheme,
  installTheme,
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
  onResetProgress,
}: SettingsGridProps) {
  const { t } = useI18n();
  const categories = useMemo<SettingsCategory[]>(() => ([
    {
      id: 'general',
      label: t('settings.categories.general.label'),
      description: t('settings.categories.general.description'),
      icon: <Globe2 size={18} />,
      cards: [
        <SettingsLanguageCard
          key="language"
          currentLanguage={currentLanguage}
          languages={languages}
          setCurrentLanguage={setCurrentLanguage}
          currentLayout={currentLayout}
          layoutsForLanguage={layoutsForLanguage}
          setCurrentLayout={setCurrentLayout}
          settings={settings}
          saveSetting={saveSetting}
          importedInterfaceLocales={importedInterfaceLocales}
          importInterfaceLocale={importInterfaceLocale}
          removeImportedInterfaceLocale={removeImportedInterfaceLocale}
        />,
        <SettingsSpeedUnitCard
          key="speed-unit"
          settings={settings}
          saveSetting={saveSetting}
        />,
        <SettingsInputCard
          key="input"
          settings={settings}
          saveSetting={saveSetting}
        />,
      ],
    },
    {
      id: 'appearance',
      label: t('settings.categories.appearance.label'),
      description: t('settings.categories.appearance.description'),
      icon: <BrushCleaning size={18} />,
      cards: [
        <SettingsThemeCard
          key="theme"
          settings={settings}
          customThemes={customThemes}
          availableThemes={availableThemes}
          saveSetting={saveSetting}
          applyTheme={applyTheme}
          installTheme={installTheme}
          onOpenThemeEditor={onOpenThemeEditor}
        />,
        <SettingsCursorCard
          key="cursor"
          settings={settings}
          saveSetting={saveSetting}
        />,
        <SettingsTextCard
          key="text"
          settings={settings}
          saveSetting={saveSetting}
        />,
        <SettingsDisplayCard
          key="display"
          settings={settings}
          saveSetting={saveSetting}
        />,
        <SettingsPresetsCard
          key="presets"
          customPresets={customPresets}
          settings={settings}
          applyPreset={applyPreset}
          saveCurrentAsPreset={saveCurrentAsPreset}
          deletePreset={deletePreset}
          exportConfig={exportConfig}
          importConfig={importConfig}
        />,
        <SettingsModeProfilesCard
          key="mode-profiles"
          currentMode={currentMode}
          modeProfiles={modeProfiles}
          saveModeProfile={saveModeProfile}
          clearModeProfile={clearModeProfile}
        />,
      ],
    },
    {
      id: 'keyboard',
      label: t('settings.categories.keyboard.label'),
      description: t('settings.categories.keyboard.description'),
      icon: <Keyboard size={18} />,
      cards: [
        <SettingsKeyboardCard
          key="keyboard"
          settings={settings}
          keyboardPreviewActive={keyboardPreviewActive}
          setKeyboardPreviewActive={setKeyboardPreviewActive}
          saveSetting={saveSetting}
        />,
      ],
    },
    {
      id: 'accessibility',
      label: t('settings.categories.accessibility.label'),
      description: t('settings.categories.accessibility.description'),
      icon: <Accessibility size={18} />,
      cards: [
        <SettingsAccessibilityCard
          key="accessibility"
          settings={settings}
          saveSetting={saveSetting}
        />,
      ],
    },
    {
      id: 'about',
      label: t('settings.categories.about.label'),
      description: t('settings.categories.about.description'),
      icon: <Info size={18} />,
      cards: [
        <SettingsAboutCard key="about" />,
        <SettingsProgressCard
          key="progress"
          onReset={onResetProgress}
        />,
      ],
    },
  ]), [
    applyPreset,
    applyTheme,
    clearModeProfile,
    currentLanguage,
    currentLayout,
    currentMode,
    customPresets,
    customThemes,
    availableThemes,
    deletePreset,
    exportConfig,
    importConfig,
    installTheme,
    keyboardPreviewActive,
    languages,
    layoutsForLanguage,
    modeProfiles,
    onOpenThemeEditor,
    onResetProgress,
    saveCurrentAsPreset,
    saveModeProfile,
    saveSetting,
    setCurrentLanguage,
    setCurrentLayout,
    setKeyboardPreviewActive,
    settings,
    importedInterfaceLocales,
    importInterfaceLocale,
    removeImportedInterfaceLocale,
    t,
  ]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? 'general');
  const activeCategory = categories.find(category => category.id === activeCategoryId) ?? categories[0];

  if (!activeCategory) return null;

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar card">
        <div className="settings-sidebar-head">
          <h3>{t('settings.sectionsTitle')}</h3>
        </div>
        <nav className="settings-category-list" aria-label="Категории настроек">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`settings-category-button${category.id === activeCategory.id ? ' active' : ''}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              <span className="settings-category-icon">{category.icon}</span>
              <span className="settings-category-copy">
                <span className="settings-category-label">{category.label}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="settings-content">
        <div className="card settings-category-hero">
          <div className="settings-category-hero-icon">{activeCategory.icon}</div>
          <div className="settings-category-hero-copy">
            <h3>{activeCategory.label}</h3>
            <p>{activeCategory.description}</p>
          </div>
        </div>

        <div className="settings-category-grid">
          {activeCategory.cards}
        </div>
      </div>
    </div>
  );
}
