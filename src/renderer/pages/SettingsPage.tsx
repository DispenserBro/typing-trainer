import { useState } from 'react';
import { useApp, BUILT_IN_THEMES } from '../contexts/AppContext';
import { ThemeModal } from '../components/ThemeModal';
import type { SpeedUnit } from '../../shared/types';
import { Pencil, Trash2, Minus, Square, Tally1 } from 'lucide-react';

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
          <div className="seg-group">
            {(['wpm', 'cpm', 'cps'] as SpeedUnit[]).map(u => (
              <button key={u}
                className={`seg-btn${settings.speedUnit === u ? ' active' : ''}`}
                onClick={() => saveSetting('speedUnit', u)}>
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Cursor */}
        <div className="card settings-card">
          <h4>Курсор</h4>
          <div className="poption-row">
            <div className="seg-group">
              {([['underline', Minus, 'Подчёркивание'], ['block', Square, 'Блок'], ['line', Tally1, 'Линия']] as const).map(([val, Icon, title]) => (
                <button key={val} title={title}
                  className={`seg-btn${settings.cursorStyle === val ? ' active' : ''}`}
                  onClick={() => saveSetting('cursorStyle', val)}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
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
              <Pencil size={14} style={{ verticalAlign: 'middle' }} /> Редактор
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

        {/* End with space */}
        <div className="card settings-card">
          <h4>Ввод</h4>
          <label className="poption-toggle" title="При включении для завершения ввода в тренировке, тесте и уроках нужно нажать пробел">
            <input type="checkbox" checked={settings.endWithSpace}
              onChange={e => saveSetting('endWithSpace', e.target.checked)} />
            <span className="toggle-switch" />
            <span className="poption-toggle-text">Заканчивать пробелом</span>
          </label>
        </div>

        {/* Reset */}
        <div className="card settings-card">
          <h4>Прогресс</h4>
          <button className="btn-danger" onClick={handleReset}>
            <Trash2 size={14} style={{ verticalAlign: 'middle' }} /> Сбросить прогресс
          </button>
        </div>
      </div>

      {showThemeModal && <ThemeModal onClose={() => setShowThemeModal(false)} />}
    </section>
  );
}
