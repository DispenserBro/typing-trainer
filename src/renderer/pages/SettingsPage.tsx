import { useState } from 'react';
import { useApp, BUILT_IN_THEMES } from '../contexts/AppContext';
import { ThemeModal } from '../components/ThemeModal';
import type { SpeedUnit } from '../../shared/types';

export function SettingsPage() {
  const {
    layouts, currentLayout, setCurrentLayout,
    currentLanguage, setCurrentLanguage,
    languages, layoutsForLanguage,
    settings, saveSetting,
    progress, saveProgress,
    customThemes, applyTheme,
  } = useApp();

  const [showThemeModal, setShowThemeModal] = useState(false);

  const allThemes = [...BUILT_IN_THEMES, ...Object.keys(customThemes)];

  const handleReset = () => {
    if (!confirm('Сбросить весь прогресс? Это действие необратимо.')) return;
    const empty = { settings: progress.settings, practiceSettings: progress.practiceSettings };
    saveProgress(empty);
  };

  return (
    <section className="mode-panel active">
      <div className="panel-header"><h1>Настройки</h1></div>

      <div className="settings-grid">
        {/* Language */}
        <div className="card settings-card">
          <h4>Язык</h4>
          <select className="select-minimal" value={currentLanguage}
            onChange={e => setCurrentLanguage(e.target.value)}>
            {languages.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          {/* Ё toggle — only for Russian */}
          {currentLanguage === 'ru' && (
            <label className="poption-toggle" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={settings.useYo}
                onChange={e => saveSetting('useYo', e.target.checked)} />
              <span className="toggle-switch" />
              <span className="poption-toggle-text">Включить букву Ё</span>
            </label>
          )}
        </div>

        {/* Layout */}
        <div className="card settings-card">
          <h4>Раскладка</h4>
          <select className="select-minimal" value={currentLayout}
            onChange={e => setCurrentLayout(e.target.value)}>
            {layoutsForLanguage.map(([k, lay]) => (
              <option key={k} value={k}>{lay.label}</option>
            ))}
          </select>
        </div>

        {/* Speed unit */}
        <div className="card settings-card">
          <h4>Единица скорости</h4>
          <div className="radio-group">
            {(['wpm', 'cpm', 'cps'] as SpeedUnit[]).map(u => (
              <label className="radio-label" key={u}>
                <input type="radio" name="speedUnit" value={u}
                  checked={settings.speedUnit === u}
                  onChange={() => saveSetting('speedUnit', u)} />
                {u.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Cursor */}
        <div className="card settings-card">
          <h4>Курсор</h4>
          <div className="poption-row">
            <select className="select-minimal" value={settings.cursorStyle}
              onChange={e => saveSetting('cursorStyle', e.target.value as any)}>
              <option value="underline">Подчёркивание</option>
              <option value="block">Блок</option>
              <option value="line">Линия</option>
            </select>
            <label className="poption-toggle">
              <input type="checkbox" checked={settings.cursorSmooth === 'smooth'}
                onChange={e => saveSetting('cursorSmooth', e.target.checked ? 'smooth' : 'instant')} />
              <span className="toggle-switch" />
              <span className="poption-toggle-text">Плавный</span>
            </label>
          </div>
        </div>

        {/* Theme */}
        <div className="card settings-card">
          <h4>Тема</h4>
          <div className="poption-row">
            <select className="select-minimal" value={settings.theme}
              onChange={e => {
                saveSetting('theme', e.target.value);
                applyTheme(e.target.value);
              }}>
              {allThemes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button className="btn-secondary btn-sm" onClick={() => setShowThemeModal(true)}>
              ✏️ Редактор
            </button>
          </div>
        </div>

        {/* Keyboard */}
        <div className="card settings-card">
          <h4>Клавиатура</h4>
          <label className="poption-toggle">
            <input type="checkbox" checked={settings.showKeyboard}
              onChange={e => saveSetting('showKeyboard', e.target.checked)} />
            <span className="toggle-switch" />
            <span className="poption-toggle-text">Показывать клавиатуру</span>
          </label>
        </div>

        {/* Reset */}
        <div className="card settings-card">
          <h4>Прогресс</h4>
          <button className="btn-danger" onClick={handleReset}>
            🗑️ Сбросить прогресс
          </button>
        </div>
      </div>

      {showThemeModal && <ThemeModal onClose={() => setShowThemeModal(false)} />}
    </section>
  );
}
