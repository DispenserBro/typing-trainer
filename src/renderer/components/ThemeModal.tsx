import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { BUILT_IN_THEMES, useAppSettings } from '../contexts/AppContext';
import type { CustomThemeColors } from '../../shared/types';
import { ActionRow } from './ui/ActionRow';
import { Button } from './ui/Button';
import { ModalLayout } from './ui/ModalLayout';
import { TextInput } from './ui/TextInput';

type RGBColor = { r: number; g: number; b: number };
type HSVColor = { h: number; s: number; v: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.split('').map(char => `${char}${char}`).join('').toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(value: string): RGBColor {
  const normalized = normalizeHexColor(value) ?? '#000000';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: RGBColor) {
  return `#${[r, g, b]
    .map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgbToHsv({ r, g, b }: RGBColor): HSVColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * (((blue - red) / delta) + 2);
    else h = 60 * (((red - green) / delta) + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hsvToRgb({ h, s, v }: HSVColor): RGBColor {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) [red, green, blue] = [chroma, x, 0];
  else if (hue < 120) [red, green, blue] = [x, chroma, 0];
  else if (hue < 180) [red, green, blue] = [0, chroma, x];
  else if (hue < 240) [red, green, blue] = [0, x, chroma];
  else if (hue < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const saturationValueRef = useRef<HTMLDivElement | null>(null);
  const hueStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftHex(value);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const rgb = useMemo(() => hexToRgb(value), [value]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const hueColor = useMemo(() => rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 })), [hsv.h]);
  const saturationColor = useMemo(() => rgbToHex(hsvToRgb({ h: hsv.h, s: 0, v: hsv.v })), [hsv.h, hsv.v]);
  const valueColor = useMemo(() => rgbToHex(hsvToRgb({ h: hsv.h, s: hsv.s, v: 100 })), [hsv.h, hsv.s]);

  const commitHex = (nextHex: string) => {
    const normalized = normalizeHexColor(nextHex);
    if (!normalized) return;
    onChange(normalized);
  };

  const updateRgbChannel = (channel: keyof RGBColor, nextValue: number) => {
    onChange(rgbToHex({
      ...rgb,
      [channel]: clamp(nextValue, 0, 255),
    }));
  };

  const updateHsv = (patch: Partial<HSVColor>) => {
    onChange(rgbToHex(hsvToRgb({
      ...hsv,
      ...patch,
    })));
  };

  const startDragging = (
    onMove: (clientX: number, clientY: number) => void,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    onMove(event.clientX, event.clientY);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const updateFromSaturationValuePlane = (clientX: number, clientY: number) => {
    const rect = saturationValueRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nextSaturation = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const nextValue = clamp((1 - ((clientY - rect.top) / rect.height)) * 100, 0, 100);
    updateHsv({ s: nextSaturation, v: nextValue });
  };

  const updateFromHueStrip = (clientX: number) => {
    const rect = hueStripRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nextHue = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    updateHsv({ h: nextHue });
  };

  const hueCursorLeft = `${(hsv.h / 360) * 100}%`;
  const saturationCursorLeft = `${hsv.s}%`;
  const valueCursorTop = `${100 - hsv.v}%`;

  return (
    <div className="theme-color-field" ref={rootRef}>
      <div className="theme-color-field__row">
        <span className="theme-color-field__label">{label}</span>
        <button
          type="button"
          className="theme-color-field__trigger"
          onClick={() => setOpen(prev => !prev)}
        >
          <span className="theme-color-field__swatch" style={{ backgroundColor: value }} />
          <span className="theme-color-field__hex">{value.toUpperCase()}</span>
        </button>
      </div>

      {open ? (
        <div className="theme-color-picker">
          <div className="theme-color-picker__hero">
            <span className="theme-color-picker__hero-kicker">{label}</span>
            <div
              className="theme-color-picker__preview-surface"
              style={{ ['--theme-preview-gradient' as string]: `linear-gradient(135deg, color-mix(in srgb, ${value} 78%, white 22%) 0%, ${value} 52%, color-mix(in srgb, ${value} 72%, black 28%) 100%)` }}
            >
              <span className="theme-color-picker__preview-title">Typing Trainer Theme</span>
              <strong className="theme-color-picker__preview-value">{value.toUpperCase()}</strong>
            </div>
          </div>

          <label className="theme-color-picker__hex-field">
            <span>HEX</span>
            <TextInput
              value={draftHex}
              onChange={event => setDraftHex(event.target.value)}
              onBlur={() => {
                commitHex(draftHex);
                setDraftHex(normalizeHexColor(draftHex) ?? value);
              }}
              placeholder="#RRGGBB"
            />
          </label>

          <div className="theme-color-picker__canvas">
            <div
              ref={saturationValueRef}
              className="theme-color-picker__sv-plane"
              style={{ ['--theme-sv-color' as string]: hueColor }}
              onMouseDown={event => startDragging(updateFromSaturationValuePlane, event)}
            >
              <span
                className="theme-color-picker__sv-cursor"
                style={{
                  left: saturationCursorLeft,
                  top: valueCursorTop,
                  backgroundColor: value,
                }}
              />
            </div>
            <div className="theme-color-picker__sv-meta">
              <span>S {Math.round(hsv.s)}</span>
              <span>V {Math.round(hsv.v)}</span>
            </div>
            <div
              ref={hueStripRef}
              className="theme-color-picker__hue-strip"
              onMouseDown={event => startDragging((clientX) => updateFromHueStrip(clientX), event)}
            >
              <span className="theme-color-picker__hue-cursor" style={{ left: hueCursorLeft }} />
            </div>
            <div className="theme-color-picker__sv-meta">
              <span>H {Math.round(hsv.h)}</span>
              <span>{`${saturationColor.toUpperCase()} -> ${valueColor.toUpperCase()}`}</span>
            </div>
          </div>

          <div className="theme-color-picker__rgb-grid">
            {(['r', 'g', 'b'] as const).map(channel => (
              <label key={channel} className="theme-color-picker__rgb-field">
                <span>{channel.toUpperCase()}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[channel]}
                  onChange={event => updateRgbChannel(channel, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { customThemes, saveCustomThemes, applyTheme, saveSetting, exportTheme } = useAppSettings();
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
    <ModalLayout
      onClose={onClose}
      scrollBody
      size="lg"
      title="Редактор темы"
      footer={(
        <ActionRow stretch className="modal-actions">
          <Button variant="accent" onClick={save}>Сохранить</Button>
          <Button onClick={() => name.trim() && exportTheme(name.trim())}
            disabled={!name.trim()}>Экспорт</Button>
          <Button onClick={del}>Удалить</Button>
          <Button onClick={onClose}>Отмена</Button>
        </ActionRow>
      )}
    >
        {customThemeNames.length > 0 && (
          <div className="theme-existing-block">
            <span className="card-desc">Загрузить существующую:</span>
            <ActionRow className="theme-existing-actions">
              {customThemeNames.map(n => (
                <Button key={n} className="theme-existing-button"
                  onClick={() => loadExisting(n)}>{n}</Button>
              ))}
            </ActionRow>
          </div>
        )}

        <label className="modal-label">
          Название:
          <TextInput value={name} onChange={e => setName(e.target.value)}
            placeholder="Моя тема" />
        </label>
        <div className="color-grid">
          {colorFields.map(f => (
            <ThemeColorField
              key={f.key}
              label={f.label}
              value={(colors[f.key] as string) ?? '#000000'}
              onChange={(nextValue) => setColor(f.key, nextValue)}
            />
          ))}
        </div>

        <h4 className="theme-section-title">Типографика и форма</h4>
        <div className="theme-ext-grid">
          <label className="theme-ext-field">
            <span>Шрифт UI</span>
            <TextInput value={colors.fontSans ?? ''}
              onChange={e => setColor('fontSans', e.target.value || '')}
              placeholder="Inter, Segoe UI, sans-serif" />
          </label>
          <label className="theme-ext-field">
            <span>Моно-шрифт</span>
            <TextInput value={colors.fontMono ?? ''}
              onChange={e => setColor('fontMono', e.target.value || '')}
              placeholder="JetBrains Mono, Consolas" />
          </label>
          <label className="theme-ext-field">
            <span>Радиус</span>
            <TextInput value={colors.radius ?? ''}
              onChange={e => setColor('radius', e.target.value || '')}
              placeholder="10px" />
          </label>
          <label className="theme-ext-field">
            <span>Радиус (малый)</span>
            <TextInput value={colors.radiusSm ?? ''}
              onChange={e => setColor('radiusSm', e.target.value || '')}
              placeholder="6px" />
          </label>
          <label className="theme-ext-field">
            <span>Скорость анимации</span>
            <TextInput value={colors.transitionSpeed ?? ''}
              onChange={e => setColor('transitionSpeed', e.target.value || '')}
              placeholder="0.2s" />
          </label>
        </div>
    </ModalLayout>
  );
}
