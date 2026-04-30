import { useMemo } from 'react';
import { useAppNavigation } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import * as LucideIcons from 'lucide-react';
import { Target, Clock, BookOpen, BarChart3, Settings, Keyboard, Gamepad2, Puzzle, Box, Shield } from 'lucide-react';
import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  buildSidebarViewModel,
  getSidebarModeActive,
  type SidebarModeDescriptor,
} from '../../core/navigation/sidebar';

const SIDEBAR_ICONS: Record<string, ReactElement> = {
  'bar-chart-3': <BarChart3 size={20} />,
  'book-open': <BookOpen size={20} />,
  box: <Box size={20} />,
  clock: <Clock size={20} />,
  'gamepad-2': <Gamepad2 size={20} />,
  puzzle: <Puzzle size={20} />,
  settings: <Settings size={20} />,
  shield: <Shield size={20} />,
  target: <Target size={20} />,
};

function getSidebarIcon(mode: SidebarModeDescriptor) {
  const builtInIcon = SIDEBAR_ICONS[mode.icon];
  if (builtInIcon) return builtInIcon;

  const IconComponent = resolveLucideIcon(mode.icon);
  return IconComponent ? <IconComponent size={20} /> : SIDEBAR_ICONS.box;
}

function toLucideIconKey(value: string) {
  return value
    .trim()
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function resolveLucideIcon(iconName?: string): LucideIcon | null {
  if (!iconName?.trim()) return null;

  const directMatch = (LucideIcons as Record<string, unknown>)[iconName.trim()];
  if (directMatch && (typeof directMatch === 'function' || typeof directMatch === 'object')) {
    return directMatch as LucideIcon;
  }

  const normalizedKey = toLucideIconKey(iconName);
  const normalizedMatch = (LucideIcons as Record<string, unknown>)[normalizedKey];
  if (normalizedMatch && (typeof normalizedMatch === 'function' || typeof normalizedMatch === 'object')) {
    return normalizedMatch as LucideIcon;
  }

  return null;
}

export function Sidebar() {
  const { currentMode, switchMode, disabledSections, modModes } = useAppNavigation();
  const { t } = useI18n();
  const sidebar = useMemo(() => buildSidebarViewModel({
    builtInLabels: {
      addons: t('app.sidebar.modes.extensions'),
      game: t('app.sidebar.modes.game'),
      lessons: t('app.sidebar.modes.lessons'),
      practice: t('app.sidebar.modes.practice'),
      settings: t('app.sidebar.modes.settings'),
      stats: t('app.sidebar.modes.stats'),
      survival: t('app.sidebar.modes.survival'),
      test: t('app.sidebar.modes.sprint'),
    },
    currentMode,
    disabledSections,
    modModes,
  }), [currentMode, disabledSections, modModes, t]);

  return (
    <aside id="sidebar">
      <div className="sidebar-top">
        <button
          type="button"
          className={`sidebar-logo sidebar-home-btn${sidebar.homeActive ? ' active' : ''}`}
          title={t('app.sidebar.home')}
          onClick={() => switchMode('home')}
        >
          <Keyboard size={28} />
        </button>
        <span className="sidebar-label">{t('app.sidebar.section')}</span>
        {sidebar.top.map(m => (
          <button
            key={m.id}
            className={`sidebar-btn${getSidebarModeActive(currentMode, m.id) ? ' active' : ''}`}
            data-mode={m.id}
            title={m.label}
            onClick={() => switchMode(m.id)}
          >
            {getSidebarIcon(m)}
            <span className="sidebar-btn-label">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        {sidebar.bottom.map(m => (
          <button
            key={m.id}
            className={`sidebar-btn${getSidebarModeActive(currentMode, m.id) ? ' active' : ''}`}
            data-mode={m.id}
            title={m.label}
            onClick={() => switchMode(m.id)}
          >
            {getSidebarIcon(m)}
            <span className="sidebar-btn-label">{m.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
