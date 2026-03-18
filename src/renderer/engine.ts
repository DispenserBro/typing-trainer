/* ═══════════════════════════════════════════════════════════
   Typing Engine — session management, key handling, char stats
   ═══════════════════════════════════════════════════════════ */
import type { Session, CharStat, Layout, SpeedUnit, UserSettings } from '../shared/types';

/* ── Ё helper: replace ё→е in words when useYo=false ─── */
export function stripYo(text: string): string {
  return text.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
}

/** Remove ё from a word list (replace ё→е), dedup results */
export function filterYoWords(words: string[], useYo: boolean): string[] {
  if (useYo) return words;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of words) {
    const clean = stripYo(w);
    if (!seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

/** Remove ё from keys list when useYo=false */
export function filterYoKeys(keys: string[], useYo: boolean): string[] {
  if (useYo) return keys;
  return keys.filter(k => k !== 'ё' && k !== 'Ё');
}

export function createSession(text: string, mode: Session['mode'], prevLessonIdx: number): Session {
  return {
    active: true,
    text,
    pos: 0,
    errors: 0,
    totalChars: 0,
    startTime: performance.now(),
    charStats: {},
    lastKeyTime: 0,
    timer: null,
    timerValue: 0,
    mode,
    lessonIdx: prevLessonIdx,
    errPositions: new Set(),
  };
}

/* ── Helper: pick random element ─────────────────────── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Helper: generate a pseudo-word from allowed chars ── */
function makePseudoWord(chars: string[], minLen = 2, maxLen = 5): string {
  const len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  let w = '';
  for (let i = 0; i < len; i++) w += pick(chars);
  return w;
}

/* ── Filter words: ONLY those composed of allowed chars ── */
function filterByChars(words: string[], chars: string[]): string[] {
  const charSet = new Set(chars.map(c => c.toLowerCase()));
  return words.filter((w) => {
    const wl = w.toLowerCase();
    return wl.length >= 2 && [...wl].every((ch) => charSet.has(ch));
  });
}

/**
 * Adapt a word: replace chars not in allowed set with random allowed chars.
 * Returns null if the word is too short or >60% of chars need replacing.
 */
function adaptWord(word: string, charSet: Set<string>, charArr: string[]): string | null {
  if (word.length < 4 || charArr.length < 2) return null;
  const lower = word.toLowerCase();
  let replaced = 0;
  let result = '';
  for (const ch of lower) {
    if (charSet.has(ch)) {
      result += ch;
    } else {
      result += charArr[Math.floor(Math.random() * charArr.length)];
      replaced++;
    }
  }
  // reject if more than 60% of the word was replaced — too synthetic
  if (replaced / word.length > 0.6) return null;
  return result;
}

/**
 * Build a word pool ensuring:
 *  - Real dictionary words are preferred
 *  - Adapted long words (with some chars swapped) for variety
 *  - Pseudo-words as fallback (2-5 chars)
 *  - Single-char "words" capped at ~10%
 */
function buildPool(
  allWords: string[],
  chars: string[],
  count: number,
  preferChars?: string | null,
): string[] {
  const charSet = new Set(chars.map(c => c.toLowerCase()));
  const charArr = chars.filter(c => c.length === 1 && c !== ' ').map(c => c.toLowerCase());

  // Step 1: exact-match dictionary words
  const exactPool = filterByChars(allWords, chars);
  const exactMulti = exactPool.filter(w => w.length >= 2);

  // Step 2: adapted words — longer words with some chars replaced
  // Only words 5+ chars where ≤60% chars need replacing
  const longWords = allWords.filter(w => w.length >= 5);
  const adaptedPool: string[] = [];
  // Pre-generate a pool of adapted words (up to 200 candidates)
  const adaptedAttempts = Math.min(longWords.length, 800);
  for (let i = 0; i < adaptedAttempts; i++) {
    const src = longWords[Math.floor(Math.random() * longWords.length)];
    const adapted = adaptWord(src, charSet, charArr);
    if (adapted && !exactMulti.includes(adapted)) {
      adaptedPool.push(adapted);
    }
  }

  // If there is a preferred char (weak char), boost words containing it
  let preferExact: string[] = [];
  let preferAdapted: string[] = [];
  if (preferChars) {
    preferExact = exactMulti.filter(w => w.toLowerCase().includes(preferChars));
    preferAdapted = adaptedPool.filter(w => w.includes(preferChars));
  }

  const result: string[] = [];
  const maxSingleChar = Math.max(1, Math.floor(count * 0.1));
  let singleCharCount = 0;

  // Decide mix: if few exact words, lean heavier on adapted
  const hasGoodExact = exactMulti.length >= 15;

  for (let i = 0; i < count; i++) {
    let word: string | null = null;

    // 30% chance to use preferred word
    if (preferChars && Math.random() < 0.3) {
      if (preferExact.length > 0 && Math.random() < 0.6) {
        word = pick(preferExact);
      } else if (preferAdapted.length > 0) {
        word = pick(preferAdapted);
      }
    }

    // Main selection
    if (!word) {
      const r = Math.random();
      if (hasGoodExact) {
        // plenty of exact words: 70% exact, 30% adapted
        if (r < 0.7 || adaptedPool.length === 0) {
          word = exactMulti.length > 0 ? pick(exactMulti) : null;
        } else {
          word = pick(adaptedPool);
        }
      } else {
        // few exact words: 40% exact, 40% adapted, 20% pseudo
        if (r < 0.4 && exactMulti.length > 0) {
          word = pick(exactMulti);
        } else if (r < 0.8 && adaptedPool.length > 0) {
          word = pick(adaptedPool);
        }
        // else fall through to pseudo-word
      }
    }

    // Fallback: pseudo-words from allowed chars
    if (!word) {
      if (charArr.length >= 2) {
        word = makePseudoWord(charArr, 3, Math.min(6, charArr.length + 1));
      } else if (charArr.length === 1) {
        if (singleCharCount < maxSingleChar) {
          word = charArr[0].repeat(2 + Math.floor(Math.random() * 3));
          singleCharCount++;
        } else {
          word = charArr[0].repeat(3);
        }
      }
    }

    // Reject single-char results above quota
    if (word && word.length === 1) {
      if (singleCharCount >= maxSingleChar) {
        if (charArr.length >= 2) {
          word = makePseudoWord(charArr, 2, 4);
        }
      } else {
        singleCharCount++;
      }
    }

    result.push(word || charArr.slice(0, 2).join(''));
  }
  return result;
}

export function generateText(allWords: string[], chars: string[], wordCount = 30): string {
  if (!chars.length) return 'the quick brown fox';
  const pool = buildPool(allWords, chars, wordCount);
  return pool.join(' ');
}

export function generateLessonText(keys: string[], count = 50): string {
  const combs: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + Math.floor(Math.random() * 4);
    let w = '';
    for (let j = 0; j < len; j++) w += keys[Math.floor(Math.random() * keys.length)];
    combs.push(w);
  }
  return combs.join(' ');
}

/**
 * Generate exercise text for the new 5-step lesson system.
 * exerciseIdx: 0..4
 *   0 = repeats of each letter (e.g. "ааа оооо ппп рррр аааа")
 *   1 = single letters shuffled  (e.g. "а п р о а п р")
 *   2 = combos of 2 chars        (e.g. "аа ар ро па ра оп")
 *   3 = combos of 2-3 chars      (e.g. "ар про оап рпа")
 *   4 = combos of 2-4 chars      (e.g. "арпо паро оарп рпао")
 */
export function generateExerciseText(
  keys: string[],
  exerciseIdx: number,
  wordCount = 20,
): string {
  if (!keys.length) return '';

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const words: string[] = [];

  switch (exerciseIdx) {
    case 0: {
      // Repeats of each letter: 3-5 chars per word
      for (let i = 0; i < wordCount; i++) {
        const ch = keys[i % keys.length];
        const len = 3 + Math.floor(Math.random() * 3); // 3..5
        words.push(ch.repeat(len));
      }
      break;
    }
    case 1: {
      // Single letters shuffled
      for (let i = 0; i < wordCount; i++) {
        words.push(keys[Math.floor(Math.random() * keys.length)]);
      }
      break;
    }
    case 2: {
      // Combos of exactly 2 chars
      for (let i = 0; i < wordCount; i++) {
        const shuffled = shuffle(keys);
        words.push(shuffled.slice(0, 2).join(''));
      }
      break;
    }
    case 3: {
      // Combos of 2-3 chars
      for (let i = 0; i < wordCount; i++) {
        const len = 2 + Math.floor(Math.random() * 2); // 2 or 3
        let w = '';
        for (let j = 0; j < len; j++) w += keys[Math.floor(Math.random() * keys.length)];
        words.push(w);
      }
      break;
    }
    case 4: {
      // Combos of 2-4 chars
      for (let i = 0; i < wordCount; i++) {
        const len = 2 + Math.floor(Math.random() * 3); // 2, 3 or 4
        let w = '';
        for (let j = 0; j < len; j++) w += keys[Math.floor(Math.random() * keys.length)];
        words.push(w);
      }
      break;
    }
    default:
      return generateLessonText(keys, wordCount);
  }

  return words.join(' ');
}

export const EXERCISE_NAMES = [
  'Повторения букв',
  'Одиночные буквы',
  'Сочетания по 2',
  'Сочетания по 2–3',
  'Сочетания по 2–4',
] as const;

export const EXERCISE_COUNT = 5;

export function generatePracticeText(
  allWords: string[],
  unlocked: string[],
  weakChar: string | null,
  count = 25,
): string {
  const pool = buildPool(allWords, unlocked, count, weakChar);
  return pool.join(' ');
}

export function formatSpeed(wpm: number, unit: SpeedUnit): string {
  if (unit === 'cpm') return String(Math.round(wpm * 5));
  if (unit === 'cps') return (wpm * 5 / 60).toFixed(1);
  return String(Math.round(wpm));
}

export function speedLabel(unit: SpeedUnit): string {
  if (unit === 'cpm') return 'CPM';
  if (unit === 'cps') return 'CPS';
  return 'WPM';
}

export function getWorstChar(
  keyStats: Record<string, CharStat> | undefined,
  allowedChars?: string[],
): string | null {
  if (!keyStats) return null;
  const allowed = allowedChars
    ? new Set(allowedChars.map(c => c.toLowerCase()))
    : null;
  let worst: string | null = null;
  let worstScore = -1;
  for (const [ch, data] of Object.entries(keyStats)) {
    if (ch === ' ' || data.hits + data.misses < 3) continue;
    if (allowed && !allowed.has(ch.toLowerCase())) continue;
    const errRate = data.misses / (data.hits + data.misses);
    const avgTime = data.hits > 0 ? data.totalTime / data.hits : 9999;
    const score = errRate * 100 + avgTime / 10;
    if (score > worstScore) {
      worstScore = score;
      worst = ch;
    }
  }
  return worst;
}
