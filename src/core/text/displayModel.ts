export type TextDisplayCursorStyle = 'underline' | 'block' | 'line';
export type TextDisplayCursorSmooth = 'smooth' | 'instant';

export type TextDisplayCharViewModel = {
  ch: string;
  cls: string;
  idx: number;
};

export type TextDisplayWordViewModel = TextDisplayCharViewModel[];

export type BuildTextDisplayWordsArgs = {
  cursorSmooth: TextDisplayCursorSmooth;
  cursorStyle: TextDisplayCursorStyle;
  errPositions: Set<number>;
  highlightCurrentChar: boolean;
  pos: number;
  text: string;
  waitingForSpace?: boolean;
};

export function buildTextDisplayWords({
  cursorSmooth,
  cursorStyle,
  errPositions,
  highlightCurrentChar,
  pos,
  text,
  waitingForSpace = false,
}: BuildTextDisplayWordsArgs): TextDisplayWordViewModel[] {
  const result: TextDisplayWordViewModel[] = [];
  let current: TextDisplayWordViewModel = [];

  const buildCursorClass = () => {
    const parts = [
      highlightCurrentChar ? 'char-current' : '',
      `cursor-${cursorStyle}`,
      cursorSmooth === 'smooth' ? 'cursor-smooth' : '',
    ].filter(Boolean);
    return parts.join(' ');
  };

  for (let index = 0; index < text.length; index += 1) {
    let cls = '';
    if (index < pos) {
      cls = errPositions.has(index) ? 'char-err' : 'char-ok';
    } else if (index === pos) {
      cls = buildCursorClass();
    }

    if (text[index] === ' ') {
      if (current.length) {
        result.push(current);
        current = [];
      }
      result.push([{ ch: '\u00A0', cls, idx: index }]);
    } else {
      current.push({ ch: text[index], cls, idx: index });
    }
  }

  if (current.length) result.push(current);

  if (waitingForSpace) {
    result.push([{ ch: '\u00A0', cls: buildCursorClass(), idx: text.length }]);
  }

  return result;
}
