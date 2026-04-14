import { useState } from 'react';
import { useApp, BUILT_IN_THEMES } from '../contexts/AppContext';
import type { CustomThemeColors } from '../../shared/types';

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { customThemes, saveCustomThemes, applyTheme, saveSetting, exportTheme } = useApp();
  const [name, setName] = useState('');
  const [colors, setColors] = useState<CustomThemeColors>({
    bg: '#181818', surface: '#1f1f1f', surface2: '#2a2a2a',
    text: '#e8e8e8', subtext: '#666666', accent: '#e8751a',
    green: '#4caf50', red: '#f44336', yellow: '#ff9800',
  });

  const setColor = (key: keyof CustomThemeColors, val: string) =>
    setColors(prev => ({ ...prev, [key]: val }));

  const save = () => {
    if (!name.trim()) { alert('Введите название'); return; }
    const ct = { ...customThemes, [name.trim()]: colors };
    saveCustomThemes(ct);
    applyTheme(name.trim());
    saveSetting('theme', name.trim());
    onClose();
  };

  const del = () => {
    const target = name.trim();
    if (BUILT_IN_THEMES.includes(target)) { alert('Встроенные темы нельзя удалить'); return; }
    const ct = { ...customThemes };
    delete ct[target];
    saveCustomThemes(ct);
    applyTheme('dark-orange');
    saveSetting('theme', 'dark-orange');
    onClose();
  };

  const loadExisting = (themeName: string) => {
    const t = customThemes[themeName];
    if (t) { setName(themeName); setColors(t); }
  };

  const colorFields: { key: keyof CustomThemeColors; label: string }[] = [
    { key: 'bg', label: 'Фон' },
    { key: 'surface', label: 'Поверхность' },
    { key: 'surface2', label: 'Поверхность 2' },
    { key: 'text', label: 'Текст' },
    { key: 'subtext', label: 'Подтекст' },
    { key: 'accent', label: 'Акцент' },
    { key: 'green', label: 'Правильно' },
    { key: 'red', label: 'Ошибка' },
    { key: 'yellow', label: 'Предупр.' },
  ];

  const customThemeNames = Object.keys(customThemes);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Редактор темы</h3>

        {customThemeNames.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span className="card-desc">Загрузить существующую:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {customThemeNames.map(n => (
                <button key={n} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '3px 8px' }}
                  onClick={() => loadExisting(n)}>{n}</button>
              ))}
            </div>
          </div>
        )}

        <label className="modal-label">
          Название:
          <input className="input-minimal" value={name} onChange={e => setName(e.target.value)}
            placeholder="Моя тема" />
        </label>
        <div className="color-grid">
          {colorFields.map(f => (
            <label key={f.key}>
              {f.label}
              <input type="color" value={colors[f.key] as string}
                onChange={e => setColor(f.key, e.target.value)} />
            </label>
          ))}
        </div>

        <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: '0.95rem' }}>Типографика и форма</h4>
        <div className="theme-ext-grid">
          <label className="theme-ext-field">
            <span>Шрифт UI</span>
            <input className="input-minimal" value={colors.fontSans ?? ''}
              onChange={e => setColor('fontSans', e.target.value || '')}
              placeholder="Inter, Segoe UI, sans-serif" />
          </label>
          <label className="theme-ext-field">
            <span>Моно-шрифт</span>
            <input className="input-minimal" value={colors.fontMono ?? ''}
              onChange={e => setColor('fontMono', e.target.value || '')}
              placeholder="JetBrains Mono, Consolas" />
          </label>
          <label className="theme-ext-field">
            <span>Радиус</span>
            <input className="input-minimal" value={colors.radius ?? ''}
              onChange={e => setColor('radius', e.target.value || '')}
              placeholder="10px" />
          </label>
          <label className="theme-ext-field">
            <span>Радиус (малый)</span>
            <input className="input-minimal" value={colors.radiusSm ?? ''}
              onChange={e => setColor('radiusSm', e.target.value || '')}
              placeholder="6px" />
          </label>
          <label className="theme-ext-field">
            <span>Скорость анимации</span>
            <input className="input-minimal" value={colors.transitionSpeed ?? ''}
              onChange={e => setColor('transitionSpeed', e.target.value || '')}
              placeholder="0.2s" />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn-accent" onClick={save}>Сохранить</button>
          <button className="btn-secondary" onClick={() => name.trim() && exportTheme(name.trim())}
            disabled={!name.trim()}>Экспорт</button>
          <button className="btn-secondary" onClick={del}>Удалить</button>
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
