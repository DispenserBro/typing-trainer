import { useApp } from '../contexts/AppContext';
import { Target, Clock, BookOpen, BarChart3, Settings, Keyboard, Gamepad2 } from 'lucide-react';

const MODES = [
  {
    id: 'practice', label: 'Практика', group: 'top',
    icon: <Target size={20} />,
  },
  {
    id: 'test', label: 'Тест', group: 'top',
    icon: <Clock size={20} />,
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
    id: 'settings', label: 'Настройки', group: 'bottom',
    icon: <Settings size={20} />,
  },
];

export function Sidebar() {
  const { currentMode, switchMode } = useApp();
  const top = MODES.filter(m => m.group === 'top');
  const bottom = MODES.filter(m => m.group === 'bottom');

  return (
    <aside id="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <Keyboard size={28} />
        </div>
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
