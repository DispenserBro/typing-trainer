import { useApp } from '../contexts/AppContext';

const MODES = [
  {
    id: 'practice', label: 'Практика', group: 'top',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  {
    id: 'test', label: 'Тест', group: 'top',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: 'lessons', label: 'Уроки', group: 'top',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
  {
    id: 'stats', label: 'Статистика', group: 'bottom',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    id: 'settings', label: 'Настройки', group: 'bottom',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12"/>
          </svg>
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
