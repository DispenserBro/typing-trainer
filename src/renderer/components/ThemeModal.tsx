import { useState } from 'react';
import { BUILT_IN_THEMES, useAppSettings } from '../contexts/AppContext';
import type { CustomThemeColors } from '../../shared/types';
import { useI18n } from '../contexts/I18nContext';
import { ThemeModalView } from './theme/ThemeModalView';

const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
  bg: '#181818',
  surface: '#1f1f1f',
  surface2: '#2a2a2a',
  text: '#e8e8e8',
  subtext: '#666666',
  accent: '#e8751a',
  green: '#4caf50',
  red: '#f44336',
  yellow: '#ff9800',
};

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { customThemes, saveCustomThemes, applyTheme, saveSetting, exportTheme } = useAppSettings();
  const [name, setName] = useState('');
  const [colors, setColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM_THEME_COLORS);

  const setColor = (key: keyof CustomThemeColors, val: string) => {
    setColors(prev => ({ ...prev, [key]: val }));
  };

  const save = () => {
    const themeName = name.trim();
    if (!themeName) {
      alert(t('themeEditor.errors.nameRequired'));
      return;
    }

    saveCustomThemes({ ...customThemes, [themeName]: colors });
    applyTheme(themeName);
    saveSetting('theme', themeName);
    onClose();
  };

  const del = () => {
    const target = name.trim();
    if (BUILT_IN_THEMES.includes(target)) {
      alert(t('themeEditor.errors.cannotDeleteBuiltIn'));
      return;
    }

    const nextThemes = { ...customThemes };
    delete nextThemes[target];
    saveCustomThemes(nextThemes);
    applyTheme('dark-orange');
    saveSetting('theme', 'dark-orange');
    onClose();
  };

  const loadExisting = (themeName: string) => {
    const theme = customThemes[themeName];
    if (!theme) return;
    setName(themeName);
    setColors(theme);
  };

  return (
    <ThemeModalView
      colors={colors}
      customThemeNames={Object.keys(customThemes)}
      name={name}
      onClose={onClose}
      onDelete={del}
      onExport={() => name.trim() && exportTheme(name.trim())}
      onLoadExisting={loadExisting}
      onSave={save}
      setColor={setColor}
      setName={setName}
    />
  );
}
