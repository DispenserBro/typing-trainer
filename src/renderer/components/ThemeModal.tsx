import { useState } from 'react';
import { useApp, BUILT_IN_THEMES } from '../contexts/AppContext';
import type { CustomThemeColors } from '../../shared/types';

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { customThemes, saveCustomThemes, applyTheme, saveSetting } = useApp();
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

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Редактор темы</h3>
        <label className="modal-label">
          Название:
          <input className="input-minimal" value={name} onChange={e => setName(e.target.value)}
            placeholder="Моя тема" />
        </label>
        <div className="color-grid">
          {colorFields.map(f => (
            <label key={f.key}>
              {f.label}
              <input type="color" value={colors[f.key]}
                onChange={e => setColor(f.key, e.target.value)} />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-accent" onClick={save}>Сохранить</button>
          <button className="btn-secondary" onClick={del}>Удалить</button>
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
