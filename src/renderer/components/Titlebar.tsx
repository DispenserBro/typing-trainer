export function Titlebar() {
  return (
    <header id="titlebar">
      <div className="titlebar-drag" />
      <span className="titlebar-title">
        <svg className="titlebar-icon" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01" />
          <path d="M2 12h20" /><path d="M6 16h12" />
        </svg>
        Typing Trainer
      </span>
      <div className="titlebar-controls">
        <button className="tb-btn" title="Свернуть"
          onClick={() => window.api.winMinimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="1.5" fill="currentColor" />
          </svg>
        </button>
        <button className="tb-btn" title="Развернуть"
          onClick={() => window.api.winMaximize()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" rx="1"
              stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button className="tb-btn tb-close" title="Закрыть"
          onClick={() => window.api.winClose()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
