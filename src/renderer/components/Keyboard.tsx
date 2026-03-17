import { useMemo } from 'react';
import type { Layout, FingerName } from '../../shared/types';
import { useApp } from '../contexts/AppContext';

const KB_ROWS: Record<string, string[][]> = {
  qwerty: [
    ['q','w','e','r','t','y','u','i','o','p','[',']'],
    ['a','s','d','f','g','h','j','k','l',';','\''],
    ['z','x','c','v','b','n','m',',','.','/'],
  ],
  dvorak: [
    ['\'',',','.','p','y','f','g','c','r','l','/','+'],
    ['a','o','e','u','i','d','h','t','n','s','-'],
    [';','q','j','k','x','b','m','w','v','z'],
  ],
  'йцукен': [
    ['й','ц','у','к','е','н','г','ш','щ','з','х','ъ'],
    ['ф','ы','в','а','п','р','о','л','д','ж','э'],
    ['я','ч','с','м','и','т','ь','б','ю','.'],
  ],
  'яверты': [
    ['я','ш','е','р','т','ы','у','и','о','п','ъ','ь'],
    ['а','с','д','ф','г','х','й','к','л','э','ю'],
    ['щ','ж','ц','в','б','н','м','ч','з','.'],
  ],
};

const FINGER_COLORS: Record<string, string> = {
  pinky_left:   'var(--red, #f44336)',
  ring_left:    'var(--yellow, #ff9800)',
  middle_left:  'var(--green, #4caf50)',
  index_left:   'var(--accent, #e8751a)',
  index_right:  'var(--accent, #e8751a)',
  middle_right: 'var(--green, #4caf50)',
  ring_right:   'var(--yellow, #ff9800)',
  pinky_right:  'var(--red, #f44336)',
};

export function Keyboard() {
  const { currentLayout, layouts, activeChar, currentMode, settings } = useApp();
  const layout = layouts.layouts[currentLayout];

  const hidden = !settings.showKeyboard
    || currentMode === 'stats' || currentMode === 'settings';

  const fingerMap = useMemo(() => {
    if (!layout) return {};
    const map: Record<string, string> = {};
    for (const [finger, keys] of Object.entries(layout.fingers)) {
      for (const k of keys) map[k.toLowerCase()] = finger;
    }
    return map;
  }, [layout]);

  const rows = KB_ROWS[currentLayout] || KB_ROWS['qwerty'];
  const target = activeChar === ' ' ? ' ' : activeChar?.toLowerCase();

  if (hidden) return null;

  return (
    <div id="keyboard-wrap">
      <div id="keyboard">
        {rows.map((row, ri) => (
          <div className="kb-row" key={ri}>
            {row.map(key => {
              const finger = fingerMap[key.toLowerCase()];
              const isActive = key === target;
              return (
                <span
                  key={key}
                  className={`kb-key${isActive ? ' active' : ''}`}
                  style={{ borderBottomColor: finger ? FINGER_COLORS[finger] : 'transparent' }}
                >
                  {key}
                </span>
              );
            })}
          </div>
        ))}
        <div className="kb-row">
          <span className={`kb-key kb-space${target === ' ' ? ' active' : ''}`}>⎵</span>
        </div>
      </div>
    </div>
  );
}
