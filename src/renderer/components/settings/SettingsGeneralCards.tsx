import { useState } from 'react';
import { AlignJustify, Minus, MoveRight, Pencil, Square, Tally1 } from 'lucide-react';
import type {
  CustomThemes,
  ImportedInterfaceLocaleDefinition,
  InterfaceDensity,
  KeyboardPosition,
  LanguageInfo,
  Layout,
  ThemeDefinitions,
  ThemeInstallResult,
  SpeedUnit,
  UserSettings,
} from '../../../shared/types';
import { NumberInput } from '../NumberInput';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/Button';
import { SelectInput } from '../ui/SelectInput';
import { SegmentedControl } from '../ui/SegmentedControl';
import { SettingsActionList, SettingsActionRow } from '../ui/SettingsActionList';
import { SettingsCard } from '../ui/SettingsCard';
import { SettingsField } from '../ui/SettingsField';
import { SettingsToggle } from '../ui/SettingsToggle';

type CommonHandlers = {
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
};

export function SettingsLanguageCard({
  currentLanguage,
  languages,
  setCurrentLanguage,
  currentLayout,
  layoutsForLanguage,
  setCurrentLayout,
  settings,
  saveSetting,
  importedInterfaceLocales,
  importInterfaceLocale,
  removeImportedInterfaceLocale,
}: {
  currentLanguage: string;
  languages: LanguageInfo[];
  setCurrentLanguage: (language: string) => void;
  currentLayout: string;
  layoutsForLanguage: [string, Layout][];
  setCurrentLayout: (layout: string) => void;
  settings: UserSettings;
  importedInterfaceLocales: Record<string, ImportedInterfaceLocaleDefinition>;
  importInterfaceLocale: () => Promise<string | null>;
  removeImportedInterfaceLocale: (localeId: string) => void;
} & CommonHandlers) {
  const { formatDateTime, formatNumber, localeQuality, locales, t } = useI18n();
  const [importMsg, setImportMsg] = useState('');
  const importedLocaleEntries = Object.values(importedInterfaceLocales).sort((left, right) => (
    right.importedAt.localeCompare(left.importedAt)
  ));

  const handleImportPo = async () => {
    const errorKey = await importInterfaceLocale();
    const message = errorKey ? t(errorKey) : t('settings.cards.language.poImported');
    setImportMsg(message);
    window.setTimeout(() => setImportMsg(''), 3000);
  };

  return (
    <SettingsCard title={t('settings.cards.language.title')}>
      <SettingsField className="settings-field-full" label={t('settings.cards.language.interfaceLanguage')}>
        <SelectInput value={settings.interfaceLanguage} onChange={e => saveSetting('interfaceLanguage', e.target.value)}>
          {locales.map((locale) => (
            <option key={locale.id} value={locale.id}>
              {locale.nativeLabel}
              {localeQuality[locale.id] ? ` · ${formatNumber(localeQuality[locale.id]!.coveragePercent)}%` : ''}
            </option>
          ))}
        </SelectInput>
        <div className="preset-io-row settings-language-import-row">
          <Button size="sm" onClick={handleImportPo}>
            {t('settings.cards.language.importPo')}
          </Button>
          {importMsg && <span className="card-desc preset-inline-message">{importMsg}</span>}
        </div>
      </SettingsField>
      <SettingsField className="settings-field-full" label={t('settings.cards.language.trainingLanguage')}>
        <SelectInput value={currentLanguage} onChange={e => setCurrentLanguage(e.target.value)}>
          {languages.map(l => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </SelectInput>
      </SettingsField>
      <SettingsField className="settings-field-full" label={t('settings.cards.language.keyboardLayout')}>
        <SelectInput value={currentLayout} onChange={e => setCurrentLayout(e.target.value)}>
          {layoutsForLanguage.map(([k, lay]) => (
            <option key={k} value={k}>{lay.label}</option>
          ))}
        </SelectInput>
      </SettingsField>
      {currentLanguage === 'ru' && (
        <SettingsToggle
          className="settings-language-yo-toggle"
          checked={settings.useYo}
          onChange={checked => saveSetting('useYo', checked)}
          label={t('settings.cards.language.useYo')}
        />
      )}

      {importedLocaleEntries.length > 0 && (
        <SettingsActionList className="settings-imported-locale-list">
          {importedLocaleEntries.map((locale) => (
            <SettingsActionRow
              key={locale.id}
              actions={(
                <Button
                  variant="ghost"
                  size="sm"
                  className="preset-delete-btn"
                  onClick={() => removeImportedInterfaceLocale(locale.id)}
                  title={t('settings.cards.language.removeImportedLocale')}
                >
                  ✕
                </Button>
              )}
            >
              <div className="settings-imported-locale-copy">
                <div className="settings-imported-locale-title">{locale.nativeLabel}</div>
                <div className="card-desc">
                  {locale.id} · {locale.sourceName}
                </div>
                {localeQuality[locale.id] && (
                  <div className="card-desc">
                    {t('settings.cards.language.coverageCompact', {
                      coverage: formatNumber(localeQuality[locale.id]!.coveragePercent),
                      count: formatNumber(localeQuality[locale.id]!.fallbackRiskCount),
                    })}
                  </div>
                )}
                <div className="card-desc">
                  {t('settings.cards.language.importedAt')}: {formatDateTime(locale.importedAt)}
                </div>
              </div>
            </SettingsActionRow>
          ))}
        </SettingsActionList>
      )}
    </SettingsCard>
  );
}

export function SettingsSpeedUnitCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();

  return (
    <SettingsCard title={t('settings.cards.speedUnit.title')}>
      <SegmentedControl
        ariaLabel={t('settings.cards.speedUnit.title')}
        value={settings.speedUnit}
        onChange={value => saveSetting('speedUnit', value)}
        options={(['wpm', 'cpm', 'cps'] as SpeedUnit[]).map(value => ({
          value,
          label: value.toUpperCase(),
        }))}
      />
    </SettingsCard>
  );
}

export function SettingsCursorCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();
  const cursorOptions = [
    { value: 'underline', icon: <Minus size={16} />, title: t('settings.cards.cursor.underline') },
    { value: 'block', icon: <Square size={16} />, title: t('settings.cards.cursor.block') },
    { value: 'line', icon: <Tally1 size={16} />, title: t('settings.cards.cursor.line') },
  ] as const;

  return (
    <SettingsCard title={t('settings.cards.cursor.title')}>
      <div className="poption-row">
        <SegmentedControl
          ariaLabel={t('settings.cards.cursor.title')}
          value={settings.cursorStyle}
          onChange={value => saveSetting('cursorStyle', value)}
          options={cursorOptions}
        />
        <SettingsToggle
          checked={settings.cursorSmooth === 'smooth'}
          onChange={checked => saveSetting('cursorSmooth', checked ? 'smooth' : 'instant')}
          label={t('settings.cards.cursor.smooth')}
        />
      </div>
      <SettingsToggle
        className="settings-toggle-offset-sm"
        checked={settings.highlightCurrentChar}
        onChange={checked => saveSetting('highlightCurrentChar', checked)}
        label={t('settings.cards.cursor.highlight')}
      />
    </SettingsCard>
  );
}

export function SettingsThemeCard({
  settings,
  availableThemes,
  saveSetting,
  applyTheme,
  installTheme,
  onOpenThemeEditor,
}: {
  settings: UserSettings;
  customThemes: CustomThemes;
  availableThemes: ThemeDefinitions;
  applyTheme: (name: string) => void;
  installTheme: () => Promise<ThemeInstallResult>;
  onOpenThemeEditor: () => void;
} & CommonHandlers) {
  const { t } = useI18n();
  const builtInThemes = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light'];
  const allThemes = [
    ...builtInThemes.map(themeId => ({ id: themeId, label: themeId })),
    ...Object.values(availableThemes)
      .filter(theme => !builtInThemes.includes(theme.id))
      .map(theme => ({ id: theme.id, label: theme.label })),
  ];

  return (
    <SettingsCard title={t('settings.cards.theme.title')}>
      <div className="poption-row">
        <SelectInput
          value={settings.theme}
          onChange={e => {
            saveSetting('theme', e.target.value);
            applyTheme(e.target.value);
          }}
        >
          {allThemes.map(theme => (
            <option key={theme.id} value={theme.id}>{theme.label}</option>
          ))}
        </SelectInput>
        <Button size="sm" variant="secondary" onClick={() => void installTheme()}>
          {t('settings.cards.theme.install')}
        </Button>
        <Button size="sm" onClick={onOpenThemeEditor}>
          <Pencil size={14} className="settings-inline-icon" /> {t('settings.cards.theme.editor')}
        </Button>
      </div>
    </SettingsCard>
  );
}

export function SettingsInputCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();

  return (
    <SettingsCard title={t('settings.cards.input.title')}>
      <SettingsToggle
        title="При включении для завершения ввода в тренировке, тесте и уроках нужно нажать пробел"
        checked={settings.endWithSpace}
        onChange={checked => saveSetting('endWithSpace', checked)}
        label={t('settings.cards.input.endWithSpace')}
      />
    </SettingsCard>
  );
}

export function SettingsTextCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();
  const displayModeOptions = [
    {
      value: 'block',
      icon: <AlignJustify size={16} />,
      title: t('settings.cards.text.displayModeBlock'),
    },
    {
      value: 'running',
      icon: <MoveRight size={16} />,
      title: t('settings.cards.text.displayModeRunning'),
    },
  ] as const;

  return (
    <SettingsCard title={t('settings.cards.text.title')}>
      <SettingsField label={t('settings.cards.text.displayMode')}>
        <SegmentedControl
          ariaLabel={t('settings.cards.text.displayMode')}
          value={settings.textDisplay}
          onChange={value => saveSetting('textDisplay', value)}
          options={displayModeOptions}
        />
      </SettingsField>
      <SettingsField label={t('settings.cards.text.inputFontSize')}>
        <div className="poption-row">
          <NumberInput
            value={settings.textFontSize}
            min={0.75}
            max={2.5}
            step={0.05}
            className="w72"
            ariaLabel="Размер текста для ввода"
            onChange={(next) => saveSetting('textFontSize', next)}
          />
          <span className="poption-hint">rem</span>
        </div>
      </SettingsField>
    </SettingsCard>
  );
}

export function SettingsDisplayCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();
  const densityOptions: { value: InterfaceDensity; label: string }[] = [
    { value: 'compact', label: t('settings.cards.display.densityCompact') },
    { value: 'default', label: t('settings.cards.display.densityDefault') },
    { value: 'comfortable', label: t('settings.cards.display.densityComfortable') },
  ];

  const kbPosOptions: { value: KeyboardPosition; label: string }[] = [
    { value: 'bottom', label: t('settings.cards.display.keyboardPositionBottom') },
    { value: 'below-text', label: t('settings.cards.display.keyboardPositionBelowText') },
  ];

  return (
    <SettingsCard title={t('settings.cards.display.title')}>
      <SettingsToggle
        checked={settings.focusMode}
        onChange={checked => saveSetting('focusMode', checked)}
        label={t('settings.cards.display.focusMode')}
      />
      <p className="card-desc settings-card-description-spaced">
        {t('settings.cards.display.focusModeHint')}
      </p>
      <SettingsField label={t('settings.cards.display.density')}>
        <SegmentedControl
          ariaLabel={t('settings.cards.display.density')}
          className="settings-seg-row"
          value={settings.interfaceDensity}
          onChange={value => saveSetting('interfaceDensity', value)}
          options={densityOptions}
        />
      </SettingsField>

      <div className="settings-display-toggle-stack">
        <SettingsToggle
          checked={settings.showStats}
          onChange={checked => saveSetting('showStats', checked)}
          label={t('settings.cards.display.showStats')}
        />
        <SettingsToggle
          checked={settings.showTextPanel}
          onChange={checked => saveSetting('showTextPanel', checked)}
          label={t('settings.cards.display.showTextPanel')}
        />
      </div>

      <SettingsField className="settings-card-field-spaced" label={t('settings.cards.display.keyboardPosition')}>
        <SegmentedControl
          ariaLabel={t('settings.cards.display.keyboardPosition')}
          className="settings-seg-row"
          value={settings.keyboardPosition}
          onChange={value => saveSetting('keyboardPosition', value)}
          options={kbPosOptions}
        />
      </SettingsField>
    </SettingsCard>
  );
}

export function SettingsAccessibilityCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const { t } = useI18n();
  return (
    <SettingsCard title={t('settings.cards.accessibility.title')}>
      <SettingsToggle
        checked={settings.largeText}
        onChange={checked => saveSetting('largeText', checked)}
        label={t('settings.cards.accessibility.largeText')}
      />
      <p className="card-desc settings-accessibility-description">
        {t('settings.cards.accessibility.largeTextHint')}
      </p>
      <SettingsToggle
        checked={settings.reducedMotion}
        onChange={checked => saveSetting('reducedMotion', checked)}
        label={t('settings.cards.accessibility.reducedMotion')}
      />
      <p className="card-desc settings-accessibility-description">
        {t('settings.cards.accessibility.reducedMotionHint')}
      </p>
      <SettingsToggle
        checked={settings.highContrast}
        onChange={checked => saveSetting('highContrast', checked)}
        label={t('settings.cards.accessibility.highContrast')}
      />
      <p className="card-desc settings-accessibility-description">
        {t('settings.cards.accessibility.highContrastHint')}
      </p>

      <SettingsField className="settings-accessibility-select-field" label={t('settings.cards.accessibility.colorVisionMode')}>
        <SelectInput className="settings-accessibility-select"
          value={settings.colorVisionMode}
          onChange={e => saveSetting('colorVisionMode', e.target.value)}>
          <option value="normal">{t('settings.cards.accessibility.colorVisionNormal')}</option>
          <option value="protanopia">{t('settings.cards.accessibility.colorVisionProtanopia')}</option>
          <option value="deuteranopia">{t('settings.cards.accessibility.colorVisionDeuteranopia')}</option>
          <option value="tritanopia">{t('settings.cards.accessibility.colorVisionTritanopia')}</option>
        </SelectInput>
      </SettingsField>
    </SettingsCard>
  );
}

export function SettingsModeProfilesCard({
  currentMode,
  modeProfiles,
  saveModeProfile,
  clearModeProfile,
}: {
  currentMode: string;
  modeProfiles: Partial<Record<string, unknown>>;
  saveModeProfile: (mode: string) => void;
  clearModeProfile: (mode: string) => void;
}) {
  const { t } = useI18n();
  const modes = [
    { id: 'practice', label: t('settings.modes.practice') },
    { id: 'test', label: t('settings.modes.test') },
    { id: 'survival', label: t('settings.modes.survival') },
    { id: 'lessons', label: t('settings.modes.lessons') },
    { id: 'game', label: t('settings.modes.game') },
  ];

  return (
    <SettingsCard
      headerClassName="settings-mode-profile-description"
      title={t('settings.cards.modeProfiles.title')}
      description={t('settings.cards.modeProfiles.description')}
    >
      <SettingsActionList>
        {modes.map(m => {
          const hasProfile = !!modeProfiles[m.id];
          return (
            <SettingsActionRow
              key={m.id}
              actions={(
                <>
                  <Button size="sm" onClick={() => saveModeProfile(m.id)}
                    title={t('settings.cards.modeProfiles.saveForModeTitle', { mode: m.label })}>
                    {currentMode === m.id ? t('settings.cards.modeProfiles.saveCurrent') : t('settings.cards.modeProfiles.write')}
                  </Button>
                  {hasProfile && (
                    <Button variant="ghost" size="sm" className="preset-delete-btn" onClick={() => clearModeProfile(m.id)}
                      title={t('settings.cards.modeProfiles.clear')}>✕</Button>
                  )}
                </>
              )}
            >
              <span className="settings-mode-profile-title">
                {m.label}
                {hasProfile && <span className="settings-mode-profile-configured">● {t('settings.cards.modeProfiles.configured')}</span>}
              </span>
            </SettingsActionRow>
          );
        })}
      </SettingsActionList>
    </SettingsCard>
  );
}
