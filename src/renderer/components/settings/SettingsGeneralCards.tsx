import { AlignJustify, Minus, MoveRight, Pencil, Square, Tally1 } from 'lucide-react';
import type { CustomThemes, InterfaceDensity, KeyboardPosition, LanguageInfo, Layout, SpeedUnit, UserSettings } from '../../../shared/types';
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

export function SettingsDisplayCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  const densityOptions: { value: InterfaceDensity; label: string }[] = [
    { value: 'compact', label: 'Компактный' },
    { value: 'default', label: 'Стандарт' },
    { value: 'comfortable', label: 'Просторный' },
  ];

  const kbPosOptions: { value: KeyboardPosition; label: string }[] = [
    { value: 'bottom', label: 'Снизу' },
    { value: 'below-text', label: 'Под текстом' },
  ];

  return (
    <div className="card settings-card">
      <h4>Интерфейс</h4>
      <label className="poption-toggle">
        <input
          type="checkbox"
          checked={settings.focusMode}
          onChange={e => saveSetting('focusMode', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Фокус-режим</span>
      </label>
      <p className="card-desc" style={{ marginTop: 6, marginBottom: 14 }}>
        Скрывает панели во время активной печати
      </p>
      <div className="poption">
        <span className="poption-label">Плотность интерфейса</span>
        <div className="seg-group" style={{ marginTop: 6 }}>
          {densityOptions.map(opt => (
            <button
              key={opt.value}
              className={`seg-btn${settings.interfaceDensity === opt.value ? ' active' : ''}`}
              onClick={() => saveSetting('interfaceDensity', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="poption-toggle">
          <input type="checkbox" checked={settings.showStats}
            onChange={e => saveSetting('showStats', e.target.checked)} />
          <span className="toggle-switch" />
          <span className="poption-toggle-text">Показывать статистику</span>
        </label>
        <label className="poption-toggle">
          <input type="checkbox" checked={settings.showTextPanel}
            onChange={e => saveSetting('showTextPanel', e.target.checked)} />
          <span className="toggle-switch" />
          <span className="poption-toggle-text">Показывать панель текста</span>
        </label>
      </div>

      <div className="poption" style={{ marginTop: 14 }}>
        <span className="poption-label">Позиция клавиатуры</span>
        <div className="seg-group" style={{ marginTop: 6 }}>
          {kbPosOptions.map(opt => (
            <button
              key={opt.value}
              className={`seg-btn${settings.keyboardPosition === opt.value ? ' active' : ''}`}
              onClick={() => saveSetting('keyboardPosition', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsAccessibilityCard({
  settings,
  saveSetting,
}: {
  settings: UserSettings;
} & CommonHandlers) {
  return (
    <div className="card settings-card">
      <h4>Доступность</h4>
      <label className="poption-toggle">
        <input
          type="checkbox"
          checked={settings.largeText}
          onChange={e => saveSetting('largeText', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Крупный текст</span>
      </label>
      <p className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
        Увеличивает размер шрифтов по всему интерфейсу
      </p>
      <label className="poption-toggle">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={e => saveSetting('reducedMotion', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Без анимаций</span>
      </label>
      <p className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
        Отключает все анимации и переходы
      </p>
      <label className="poption-toggle">
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={e => saveSetting('highContrast', e.target.checked)}
        />
        <span className="toggle-switch" />
        <span className="poption-toggle-text">Высокий контраст</span>
      </label>
      <p className="card-desc" style={{ marginTop: 4, marginBottom: 12 }}>
        Повышает контрастность границ и текста
      </p>

      <div className="poption" style={{ marginTop: 4 }}>
        <span className="poption-label">Режим цветовосприятия</span>
        <select className="select-minimal" style={{ marginTop: 6 }}
          value={settings.colorVisionMode}
          onChange={e => saveSetting('colorVisionMode', e.target.value)}>
          <option value="normal">Обычный</option>
          <option value="protanopia">Протанопия (красный)</option>
          <option value="deuteranopia">Дейтеранопия (зелёный)</option>
          <option value="tritanopia">Тританопия (синий)</option>
        </select>
      </div>
    </div>
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
  const modes = [
    { id: 'practice', label: 'Практика' },
    { id: 'test', label: 'Тест' },
    { id: 'lessons', label: 'Уроки' },
    { id: 'game', label: 'Игра' },
  ];

  return (
    <div className="card settings-card">
      <h4>Профили по режимам</h4>
      <p className="card-desc" style={{ marginBottom: 10 }}>
        Сохраните текущие настройки как профиль для конкретного режима.
        При переключении в режим настройки применятся автоматически.
      </p>
      <div className="presets-list">
        {modes.map(m => {
          const hasProfile = !!modeProfiles[m.id];
          return (
            <div className="preset-row" key={m.id}>
              <span style={{ flex: 1, fontSize: '0.88rem' }}>
                {m.label}
                {hasProfile && <span style={{ color: 'var(--green)', marginLeft: 6, fontSize: '0.78rem' }}>● настроен</span>}
              </span>
              <button className="btn-secondary btn-sm" onClick={() => saveModeProfile(m.id)}
                title={`Сохранить текущие настройки для режима «${m.label}»`}>
                {currentMode === m.id ? 'Сохранить текущие' : 'Записать'}
              </button>
              {hasProfile && (
                <button className="btn-ghost btn-sm preset-delete-btn" onClick={() => clearModeProfile(m.id)}
                  title="Сбросить профиль">✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
