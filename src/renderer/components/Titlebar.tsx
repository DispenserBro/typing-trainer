import { Keyboard, Minus, Square, X } from 'lucide-react';

export function Titlebar() {
  return (
    <header id="titlebar">
      <div className="titlebar-drag" />
      <span className="titlebar-title">
        <Keyboard size={16} className="titlebar-icon" />
        Typing <span className="titlebar-highlight">Trainer</span>
      </span>
      <div className="titlebar-controls">
        <button className="tb-btn" title="Свернуть"
          onClick={() => window.api.winMinimize()}>
          <Minus size={12} />
        </button>
        <button className="tb-btn" title="Развернуть"
          onClick={() => window.api.winMaximize()}>
          <Square size={12} />
        </button>
        <button className="tb-btn tb-close" title="Закрыть"
          onClick={() => window.api.winClose()}>
          <X size={12} />
        </button>
      </div>
    </header>
  );
}
