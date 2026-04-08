import { AlignJustify, Minus, MoveRight, Pencil, Square, Tally1 } from 'lucide-react';
import type { CustomThemes, LanguageInfo, Layout, SpeedUnit, UserSettings } from '../../../shared/types';
import { NumberInput } from '../NumberInput';

type CommonHandlers = {
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
};

export function SettingsLanguageCard({
  currentLanguage,
  languages,
  setCurrentLanguage,
  settings,
  saveSetting,
}: {
  currentLanguage: string;
  languages: LanguageInfo[];
  setCurrentLanguage: (language: string) => void;
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Язык</h4>
      <select className="select-minimal" value={currentLanguage} onChange={e => setCurrentLanguage(e.target.value)}>
        {languages.map(l => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
      {currentLanguage === 'ru' && (
        <label className="poption-toggle" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={settings.useYo} onChange={e => saveSetting('useYo', e.target.checked)} />
          <span className="toggle-switch" />
          <span className="poption-toggle-text">Включить букву Ё</span>
        </label>
      )}
    </div>
  );
}

export function SettingsLayoutCard({
  currentLayout,
  layoutsForLanguage,
  setCurrentLayout,
}: {
  currentLayout: string;
  layoutsForLanguage: [string, Layout][];
  setCurrentLayout: (layout: string) => void;
}) {
  return (
    <div className="card settings-card">
      <h4>Раскладка</h4>
      <select className="select-minimal" value={currentLayout} onChange={e => setCurrentLayout(e.target.value)}>
        {layoutsForLanguage.map(([k, lay]) => (
          <option key={k} value={k}>{lay.label}</option>
        ))}
      </select>
    </div>
  );
}

export function SettingsSpeedUnitCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Единица скорости</h4>
      <div className="seg-group">
        {(['wpm', 'cpm', 'cps'] as SpeedUnit[]).map(u => (
          <button
            key={u}
            className={`seg-btn${settings.speedUnit === u ? ' active' : ''}`}
            onClick={() => saveSetting('speedUnit', u)}
          >
            {u.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsCursorCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Курсор</h4>
      <div className="poption-row">
        <div className="seg-group">
          {([['underline', Minus, 'Подчёркивание'], ['block', Square, 'Блок'], ['line', Tally1, 'Линия']] as const).map(([val, Icon, title]) => (
            <button
              key={val}
              title={title}
              className={`seg-btn${settings.cursorStyle === val ? ' active' : ''}`}
              onClick={() => saveSetting('cursorStyle', val)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <label className="poption-toggle">
          <input
            type="checkbox"
            checked={settings.cursorSmooth === 'smooth'}
            onChange={e => saveSetting('cursorSmooth', e.target.checked ? 'smooth' : 'instant')}
          />
          <span className="toggle-switch" />
          <span className="poption-toggle-text">Плавный</span>
        </label>
      </div>
      <label className="poption-toggle" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={settings.highlightCurrentChar}
          onChange={e => saveSetting('highlightCurrentChar', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Подсветка текущей буквы</span>
      </label>
    </div>
  );
}

export function SettingsThemeCard({
  settings,
  customThemes,
  saveSetting,
  applyTheme,
  onOpenThemeEditor,
}: {
  settings: UserSettings;
  customThemes: CustomThemes;
  applyTheme: (name: string) => void;
  onOpenThemeEditor: () => void;
} & CommonHandlers) {
  const allThemes = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light', ...Object.keys(customThemes)];

  return (
    <div className="card settings-card">
      <h4>Тема</h4>
      <div className="poption-row">
        <select
          className="select-minimal"
          value={settings.theme}
          onChange={e => {
            saveSetting('theme', e.target.value);
            applyTheme(e.target.value);
          }}
        >
          {allThemes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="btn-secondary btn-sm" onClick={onOpenThemeEditor}>
          <Pencil size={14} style={{ verticalAlign: 'middle' }} /> Редактор
        </button>
      </div>
    </div>
  );
}

export function SettingsInputCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Ввод</h4>
      <label
        className="poption-toggle"
        title="При включении для завершения ввода в тренировке, тесте и уроках нужно нажать пробел"
      >
        <input
          type="checkbox"
          checked={settings.endWithSpace}
          onChange={e => saveSetting('endWithSpace', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Заканчивать пробелом</span>
      </label>
    </div>
  );
}

export function SettingsTextCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Текст</h4>
      <div className="poption">
        <span className="poption-label">Вид текста</span>
        <div className="seg-group">
          <button
            title="Блок"
            className={`seg-btn${settings.textDisplay === 'block' ? ' active' : ''}`}
            onClick={() => saveSetting('textDisplay', 'block')}
          >
            <AlignJustify size={16} />
          </button>
          <button
            title="Бегущая строка"
            className={`seg-btn${settings.textDisplay === 'running' ? ' active' : ''}`}
            onClick={() => saveSetting('textDisplay', 'running')}
          >
            <MoveRight size={16} />
          </button>
        </div>
      </div>
      <div className="poption">
        <span className="poption-label">Размер текста для ввода</span>
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
      </div>
    </div>
  );
}
