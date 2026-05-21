import { Keyboard, Minus, Square, X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

export function Titlebar() {
  const { t } = useI18n();

  return (
    <header id="titlebar">
      <div className="titlebar-drag" />
      <span className="titlebar-title">
        <Keyboard size={16} className="titlebar-icon" />
        Typing <span className="titlebar-highlight">Trainer</span>
      </span>
      <div className="titlebar-controls">
        <button className="tb-btn" title={t('titlebar.minimize')}
          onClick={() => window.api.winMinimize()}>
          <Minus size={12} />
        </button>
        <button className="tb-btn" title={t('titlebar.maximize')}
          onClick={() => window.api.winMaximize()}>
          <Square size={12} />
        </button>
        <button className="tb-btn tb-close" title={t('titlebar.close')}
          onClick={() => window.api.winClose()}>
          <X size={12} />
        </button>
      </div>
    </header>
  );
}
