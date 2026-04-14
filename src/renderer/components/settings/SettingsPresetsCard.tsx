import { useState } from 'react';
import type { CustomPresets, UserSettings } from '../../../shared/types';

type SettingsPresetsCardProps = {
  customPresets: CustomPresets;
  settings: UserSettings;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (name: string) => string;
  deletePreset: (presetId: string) => void;
  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<string | null>;
};

export function SettingsPresetsCard({
  customPresets,
  applyPreset,
  saveCurrentAsPreset,
  deletePreset,
  exportConfig,
  importConfig,
}: SettingsPresetsCardProps) {
  const [newName, setNewName] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const entries = Object.entries(customPresets);

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    saveCurrentAsPreset(name);
    setNewName('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleImport = async () => {
    const err = await importConfig();
    if (err) { setImportMsg(err); setTimeout(() => setImportMsg(''), 3000); }
    else { setImportMsg('Импортировано ✓'); setTimeout(() => setImportMsg(''), 2000); }
  };

  return (
    <div className="card settings-card">
      <h4>Пресеты интерфейса</h4>
      <p className="card-desc">Быстро переключайте набор настроек</p>

      <div className="presets-list">
        {entries.map(([id, preset]) => (
          <div className="preset-row" key={id}>
            <button
              className="btn-secondary btn-sm preset-apply-btn"
              onClick={() => applyPreset(id)}
              title={`Применить пресет «${preset.name}»`}
            >
              {preset.name}
            </button>
            {!preset.builtIn && (
              <button
                className="btn-ghost btn-sm preset-delete-btn"
                onClick={() => deletePreset(id)}
                title="Удалить"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="preset-save-row">
        <input
          className="input-minimal"
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название нового пресета…"
          maxLength={40}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button className="btn-accent btn-sm" onClick={handleSave} disabled={!newName.trim()}>
          {justSaved ? '✓' : 'Сохранить'}
        </button>
      </div>

      <div className="preset-io-row">
        <button className="btn-secondary btn-sm" onClick={() => exportConfig()}>Экспорт конфигурации</button>
        <button className="btn-secondary btn-sm" onClick={handleImport}>Импорт</button>
        {importMsg && <span className="card-desc" style={{ marginLeft: 8 }}>{importMsg}</span>}
      </div>
    </div>
  );
}
