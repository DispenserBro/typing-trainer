import { useMemo } from 'react';
import { useAppNavigation } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import { Target, Clock, BookOpen, BarChart3, Settings, Keyboard, Gamepad2, Puzzle, Box, Shield } from 'lucide-react';
import type { ReactElement } from 'react';

interface SidebarMode {
  id: string;
  label: string;
  group: 'top' | 'bottom';
  icon: ReactElement;
}

export function Sidebar() {
  const { currentMode, switchMode, disabledSections, modModes } = useAppNavigation();
  const { t } = useI18n();
  const isModeActive = (modeId: string) => (
    modeId === 'survival'
      ? currentMode === 'survival' || currentMode === 'flawless'
      : currentMode === modeId
  );

  const builtInModes = useMemo<SidebarMode[]>(() => [
    {
      id: 'practice', label: t('app.sidebar.modes.practice'), group: 'top',
      icon: <Target size={20} />,
    },
    {
      id: 'test', label: t('app.sidebar.modes.sprint'), group: 'top',
      icon: <Clock size={20} />,
    },
    {
      id: 'survival', label: t('app.sidebar.modes.survival'), group: 'top',
      icon: <Shield size={20} />,
    },
    {
      id: 'lessons', label: t('app.sidebar.modes.lessons'), group: 'top',
      icon: <BookOpen size={20} />,
    },
    {
      id: 'game', label: t('app.sidebar.modes.game'), group: 'top',
      icon: <Gamepad2 size={20} />,
    },
    {
      id: 'stats', label: t('app.sidebar.modes.stats'), group: 'bottom',
      icon: <BarChart3 size={20} />,
    },
    {
      id: 'addons', label: t('app.sidebar.modes.extensions'), group: 'bottom',
      icon: <Puzzle size={20} />,
    },
    {
      id: 'settings', label: t('app.sidebar.modes.settings'), group: 'bottom',
      icon: <Settings size={20} />,
    },
  ], [t]);

  const allModes = useMemo(() => {
    const modEntries: SidebarMode[] = modModes.map(m => ({
      id: `mod:${m.id}`,
      label: m.label,
      group: m.group,
      icon: <Box size={20} />,
    }));
    return [...builtInModes, ...modEntries];
  }, [builtInModes, modModes]);

  const visible = allModes.filter(m => !disabledSections.includes(m.id));
  const top = visible.filter(m => m.group === 'top');
  const bottom = visible.filter(m => m.group === 'bottom');
  const homeActive = currentMode === 'home';

  return (
    <aside id="sidebar">
      <div className="sidebar-top">
        <button
          type="button"
          className={`sidebar-logo sidebar-home-btn${homeActive ? ' active' : ''}`}
          title={t('app.sidebar.home')}
          onClick={() => switchMode('home')}
        >
          <Keyboard size={28} />
        </button>
        <span className="sidebar-label">{t('app.sidebar.section')}</span>
        {top.map(m => (
          <button
            key={m.id}
            className={`sidebar-btn${isModeActive(m.id) ? ' active' : ''}`}
            data-mode={m.id}
            title={m.label}
            onClick={() => switchMode(m.id)}
          >
            {m.icon}
            <span className="sidebar-btn-label">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        {bottom.map(m => (
          <button
            key={m.id}
            className={`sidebar-btn${isModeActive(m.id) ? ' active' : ''}`}
            data-mode={m.id}
            title={m.label}
            onClick={() => switchMode(m.id)}
          >
            {m.icon}
            <span className="sidebar-btn-label">{m.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
