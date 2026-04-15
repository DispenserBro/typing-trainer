import { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Target, Clock, BookOpen, BarChart3, Settings, Keyboard, Gamepad2, Puzzle, Box, Shield, AlertTriangle } from 'lucide-react';
import type { ReactElement } from 'react';

interface SidebarMode {
  id: string;
  label: string;
  group: 'top' | 'bottom';
  icon: ReactElement;
}

const MODES: SidebarMode[] = [
  {
    id: 'practice', label: 'Практика', group: 'top',
    icon: <Target size={20} />,
  },
  {
    id: 'test', label: 'Спринт', group: 'top',
    icon: <Clock size={20} />,
  },
  {
    id: 'survival', label: 'Выживание', group: 'top',
    icon: <Shield size={20} />,
  },
  {
    id: 'flawless', label: 'Без ошибок', group: 'top',
    icon: <AlertTriangle size={20} />,
  },
  {
    id: 'lessons', label: 'Уроки', group: 'top',
    icon: <BookOpen size={20} />,
  },
  {
    id: 'game', label: 'Игра', group: 'top',
    icon: <Gamepad2 size={20} />,
  },
  {
    id: 'stats', label: 'Статистика', group: 'bottom',
    icon: <BarChart3 size={20} />,
  },
  {
    id: 'addons', label: 'Аддоны', group: 'bottom',
    icon: <Puzzle size={20} />,
  },
  {
    id: 'settings', label: 'Настройки', group: 'bottom',
    icon: <Settings size={20} />,
  },
];

export function Sidebar() {
  const { currentMode, switchMode, disabledSections, modModes } = useApp();

  const allModes = useMemo(() => {
    const modEntries: SidebarMode[] = modModes.map(m => ({
      id: `mod:${m.id}`,
      label: m.label,
      group: m.group,
      icon: <Box size={20} />,
    }));
    return [...MODES, ...modEntries];
  }, [modModes]);

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
          title="Главное меню"
          onClick={() => switchMode('home')}
        >
          <Keyboard size={28} />
        </button>
        <span className="sidebar-label">режим</span>
        {top.map(m => (
          <button
            key={m.id}
            className={`sidebar-btn${currentMode === m.id ? ' active' : ''}`}
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
            className={`sidebar-btn${currentMode === m.id ? ' active' : ''}`}
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
