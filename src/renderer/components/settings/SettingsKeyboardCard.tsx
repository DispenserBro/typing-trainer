import { NumberInput } from '../NumberInput';
import type { UserSettings } from '../../../shared/types';

export function SettingsKeyboardCard({
  settings,
  keyboardPreviewActive,
  setKeyboardPreviewActive,
  saveSetting,
}: {
  settings: UserSettings;
  keyboardPreviewActive: boolean;
  setKeyboardPreviewActive: (active: boolean) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
}) {
  return (
    <div className="card settings-card">
      <h4>Клавиатура</h4>
      <label className="poption-toggle">
        <input
          type="checkbox"
          checked={settings.showKeyboard}
          onChange={e => {
            saveSetting('showKeyboard', e.target.checked);
            if (!e.target.checked) setKeyboardPreviewActive(false);
          }}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Показывать клавиатуру</span>
      </label>
      {settings.showKeyboard && (
        <>
          <label className="poption-toggle" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={settings.showHands}
              onChange={e => saveSetting('showHands', e.target.checked)}
            />
            <span className="toggle-switch" />
            <span className="settings-beta-row">
              <span className="poption-toggle-text">Показывать пальцы</span>
              <span className="settings-beta-tag">Beta</span>
            </span>
          </label>

          <div className="poption" style={{ marginTop: 14 }}>
            <span className="poption-label">Смещение по вертикали</span>
            <div className="poption-row">
              <NumberInput
                value={settings.keyboardPanelOffset}
                min={-100}
                max={100}
                step={1}
                emptyValue={0}
                className="w96"
                ariaLabel="Смещение клавиатуры по вертикали"
                onChange={(next) => saveSetting('keyboardPanelOffset', Math.round(next))}
              />
              <span className="poption-hint">%</span>
            </div>
            <span className="poption-hint">0 — по центру, отрицательное вниз, положительное вверх.</span>
          </div>

          <div className="poption" style={{ marginTop: 14 }}>
            <span className="poption-label">Масштаб блока</span>
            <div className="poption-row">
              <NumberInput
                value={settings.keyboardPanelZoom}
                min={10}
                max={300}
                step={1}
                emptyValue={100}
                className="w96"
                ariaLabel="Масштаб блока клавиатуры и рук"
                onChange={(next) => saveSetting('keyboardPanelZoom', Math.round(next))}
              />
              <span className="poption-hint">%</span>
            </div>
            <span className="poption-hint">100% — стандартный размер, от 10% до 300%.</span>
          </div>

          <div className="settings-keyboard-actions">
            <button
              className={`btn-secondary btn-sm${keyboardPreviewActive ? ' active' : ''}`}
              onClick={() => setKeyboardPreviewActive(!keyboardPreviewActive)}
            >
              {keyboardPreviewActive ? 'Скрыть предпросмотр' : 'Предпросмотр клавиатуры'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
