/* ═══════════════════════════════════════════════════════════
   Typing Engine — session management, key handling, char stats
   ═══════════════════════════════════════════════════════════ */
import type {
  Session, CharStat, Layout, SpeedUnit, UserSettings, LayoutPracticeInsights,
  PracticeTrainingMode, PracticeAdaptationStrength, PracticeAdaptationFocus,
} from '../shared/types';

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
    keypresses: [],
  };
}

/* ── Helper: pick random element ─────────────────────── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ═══════════════════════════════════════════════════════════
   N-gram (bigram) model for phonetically plausible pseudo-words
   ═══════════════════════════════════════════════════════════ */

/** Bigram frequency model built from a word list */
export interface NgramModel {
  /** start[ch] = how often ch appears as a word's first letter */
  start: Record<string, number>;
  /** bi[prev][next] = how often `next` follows `prev` */
  bi: Record<string, Record<string, number>>;
  /** end[ch] = how often ch appears as a word's last letter */
  end: Record<string, number>;
}

/** Build a bigram frequency model from a word list (lowercased) */
export function buildNgramModel(words: string[]): NgramModel {
  const start: Record<string, number> = {};
  const bi: Record<string, Record<string, number>> = {};
  const end: Record<string, number> = {};

  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w.length < 2) continue;
    // start
    start[w[0]] = (start[w[0]] || 0) + 1;
    // end
    end[w[w.length - 1]] = (end[w[w.length - 1]] || 0) + 1;
    // bigrams
    for (let i = 0; i < w.length - 1; i++) {
      const a = w[i], b = w[i + 1];
      if (!bi[a]) bi[a] = {};
      bi[a][b] = (bi[a][b] || 0) + 1;
    }
  }
  return { start, bi, end };
}

/**
 * Pick a character from a weighted distribution, restricted to `allowed`.
 * Returns null if no allowed char has any weight.
 */
function weightedPick(
  freqs: Record<string, number>,
  allowed: Set<string>,
): string | null {
  let total = 0;
  for (const ch of allowed) {
    total += freqs[ch] || 0;
  }
  if (total === 0) return null;
  let r = Math.random() * total;
  for (const ch of allowed) {
    const w = freqs[ch] || 0;
    if (w === 0) continue;
    r -= w;
    if (r <= 0) return ch;
  }
  return null;
}

/**
 * Generate a phonetically plausible pseudo-word using the bigram model.
 * Only uses characters from `allowedChars`.
 * Falls back to random pick if the model has no data for a transition.
 */
function generateNgramWord(
  model: NgramModel,
  allowedChars: string[],
  minLen = 3,
  maxLen = 7,
): string {
  const allowed = new Set(allowedChars);
  const targetLen = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));

  // Pick start character weighted by start frequencies
  let ch = weightedPick(model.start, allowed) ?? pick(allowedChars);
  let word = ch;

  for (let i = 1; i < targetLen; i++) {
    const prev = word[word.length - 1];
    const transitions = model.bi[prev];

    // On the last character, bias towards common word-endings
    if (i === targetLen - 1 && model.end) {
      // Merge end-frequencies with bigram transitions
      const merged: Record<string, number> = {};
      for (const c of allowed) {
        const biW = transitions?.[c] || 0;
        const endW = model.end[c] || 0;
        merged[c] = biW + endW * 0.5; // blend
      }
      const next = weightedPick(merged, allowed);
      word += next ?? pick(allowedChars);
    } else if (transitions) {
      const next = weightedPick(transitions, allowed);
      word += next ?? pick(allowedChars);
    } else {
      word += pick(allowedChars);
    }
  }
  return word;
}

function generateSeededNgramWord(
  model: NgramModel,
  allowedChars: string[],
  seed: string,
  minLen = 3,
  maxLen = 7,
): string {
  const allowed = new Set(allowedChars);
  const normalizedSeed = [...seed.toLowerCase()].filter(ch => allowed.has(ch)).join('');
  if (!normalizedSeed) return generateNgramWord(model, allowedChars, minLen, maxLen);

  const targetLen = Math.max(normalizedSeed.length, minLen) + Math.floor(Math.random() * Math.max(1, maxLen - Math.max(normalizedSeed.length, minLen) + 1));
  let word = normalizedSeed;

  while (word.length < targetLen) {
    const prev = word[word.length - 1];
    const transitions = model.bi[prev];
    if (word.length === targetLen - 1 && model.end) {
      const merged: Record<string, number> = {};
      for (const c of allowed) {
        const biW = transitions?.[c] || 0;
        const endW = model.end[c] || 0;
        merged[c] = biW + endW * 0.5;
      }
      word += weightedPick(merged, allowed) ?? pick(allowedChars);
    } else if (transitions) {
      word += weightedPick(transitions, allowed) ?? pick(allowedChars);
    } else {
      word += pick(allowedChars);
    }
  }

  return word;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface PracticeAdaptiveProfile {
  wordCount: number;
  focusStrength: number;
  rankedChars: string[];
  rankedBigrams: string[];
  charPriority: number;
  bigramPriority: number;
  exactnessBias: number;
}

interface PracticeBuildOptions {
  trainingMode?: PracticeTrainingMode;
  smartAdaptationEnabled?: boolean;
  smartAdaptationStrength?: PracticeAdaptationStrength;
  smartAdaptationFocus?: PracticeAdaptationFocus;
}

function buildPracticeAdaptiveProfile(
  insights: LayoutPracticeInsights | null | undefined,
  allowedChars: string[],
  baseCount: number,
  options?: PracticeBuildOptions,
): PracticeAdaptiveProfile {
  const adaptationEnabled = options?.smartAdaptationEnabled ?? true;
  const strength = options?.smartAdaptationStrength ?? 'medium';
  const focus = options?.smartAdaptationFocus ?? 'balanced';

  if (!adaptationEnabled || !insights) {
    return {
      wordCount: baseCount,
      focusStrength: 0,
      rankedChars: [],
      rankedBigrams: [],
      charPriority: 1,
      bigramPriority: 1,
      exactnessBias: 0,
    };
  }

  const strengthFactorMap: Record<PracticeAdaptationStrength, number> = {
    low: 0.7,
    medium: 1,
    high: 1.35,
  };
  const focusProfileMap: Record<PracticeAdaptationFocus, {
    charWeight: number;
    bigramWeight: number;
    rhythmWeight: number;
    exactnessBias: number;
  }> = {
    balanced: { charWeight: 1, bigramWeight: 1, rhythmWeight: 1, exactnessBias: 0.08 },
    chars: { charWeight: 1.45, bigramWeight: 0.65, rhythmWeight: 0.75, exactnessBias: 0.04 },
    bigrams: { charWeight: 0.7, bigramWeight: 1.5, rhythmWeight: 0.8, exactnessBias: 0.06 },
    rhythm: { charWeight: 0.5, bigramWeight: 0.8, rhythmWeight: 1.45, exactnessBias: 0.16 },
  };
  const strengthFactor = strengthFactorMap[strength];
  const focusProfile = focusProfileMap[focus];
  const allowed = new Set(allowedChars.map(ch => ch.toLowerCase()));
  const rankedChars = Object.entries(insights?.chars ?? {})
    .filter(([char, aggregate]) => allowed.has(char) && aggregate.weakness > 0)
    .sort((a, b) => b[1].weakness - a[1].weakness)
    .slice(0, 4)
    .map(([char]) => char);
  const rankedBigrams = Object.entries(insights?.bigrams ?? {})
    .filter(([bigram, aggregate]) => aggregate.weakness > 0 && [...bigram].every(ch => allowed.has(ch)))
    .sort((a, b) => b[1].weakness - a[1].weakness)
    .slice(0, 5)
    .map(([bigram]) => bigram);

  const topCharWeakness = rankedChars[0] ? insights?.chars?.[rankedChars[0]]?.weakness ?? 0 : 0;
  const topBigramWeakness = rankedBigrams[0] ? insights?.bigrams?.[rankedBigrams[0]]?.weakness ?? 0 : 0;
  const rhythmWeakness = insights?.rhythm?.weakness ?? 0;
  const instability = Math.min(100, Math.max(
    topCharWeakness * focusProfile.charWeight,
    topBigramWeakness * focusProfile.bigramWeight,
    rhythmWeakness * focusProfile.rhythmWeight,
  ) * strengthFactor);

  let wordCount = baseCount;
  if (instability >= 60) {
    wordCount = Math.round(baseCount * 0.64);
  } else if (instability >= 42) {
    wordCount = Math.round(baseCount * 0.8);
  } else if (instability <= 16 && (rankedChars.length > 0 || rankedBigrams.length > 0)) {
    wordCount = Math.round(baseCount * 1.24);
  } else if (instability <= 24 && (rankedChars.length > 0 || rankedBigrams.length > 0)) {
    wordCount = Math.round(baseCount * 1.08);
  }

  return {
    wordCount: clamp(wordCount, 12, 36),
    focusStrength: clamp(instability / 100, 0, 1),
    rankedChars,
    rankedBigrams,
    charPriority: focusProfile.charWeight * strengthFactor,
    bigramPriority: focusProfile.bigramWeight * strengthFactor,
    exactnessBias: focusProfile.exactnessBias + (strength === 'high' ? 0.04 : strength === 'low' ? -0.02 : 0),
  };
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
 * Adapt a word: replace chars not in allowed set with context-aware substitution.
 * Uses bigram model to pick a replacement that sounds natural in context.
 * Returns null if the word is too short or >60% of chars need replacing.
 */
function adaptWord(
  word: string,
  charSet: Set<string>,
  charArr: string[],
  model?: NgramModel,
): string | null {
  if (word.length < 4 || charArr.length < 2) return null;
  const lower = word.toLowerCase();
  const allowed = new Set(charArr);
  let replaced = 0;
  let result = '';
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (charSet.has(ch)) {
      result += ch;
    } else {
      // Context-aware replacement using bigram model
      let sub: string | null = null;
      if (model && result.length > 0) {
        const prev = result[result.length - 1];
        const transitions = model.bi[prev];
        if (transitions) {
          sub = weightedPick(transitions, allowed);
        }
      }
      result += sub ?? charArr[Math.floor(Math.random() * charArr.length)];
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
  model?: NgramModel,
  insights?: LayoutPracticeInsights | null,
  options?: PracticeBuildOptions,
): string[] {
  const charSet = new Set(chars.map(c => c.toLowerCase()));
  const charArr = chars.filter(c => c.length === 1 && c !== ' ').map(c => c.toLowerCase());
  const trainingMode = options?.trainingMode ?? 'normal';

  // Step 1: exact-match dictionary words
  const exactPool = filterByChars(allWords, chars);
  const exactMulti = exactPool.filter(w => w.length >= 2);

  // Build a *local* n-gram model from exact-match words so that
  // transitions are realistic for the allowed character set.
  // Fall back to the global model only when we have very few matches.
  const localNgram = exactMulti.length >= 10
    ? buildNgramModel(exactMulti)
    : (model ?? buildNgramModel(allWords));

  const adaptiveProfile = buildPracticeAdaptiveProfile(insights, charArr, count, options);
  count = adaptiveProfile.wordCount;
  if (trainingMode === 'rhythm') {
    count = clamp(Math.round(count * 0.78), 10, 20);
  }
  const rankedChars = adaptiveProfile.rankedChars;
  const rankedBigrams = adaptiveProfile.rankedBigrams;
  const focusStrength = adaptiveProfile.focusStrength;
  const charPriority = adaptiveProfile.charPriority;
  const bigramPriority = adaptiveProfile.bigramPriority;
  const exactnessBias = adaptiveProfile.exactnessBias;
  const hasAdaptiveSignals = rankedChars.length > 0 || rankedBigrams.length > 0;

  // Step 2: adapted words — longer words with some chars replaced
  // Only words 5+ chars where ≤60% chars need replacing
  const longWords = allWords.filter(w => w.length >= 5);
  const adaptedPool: string[] = [];
  // Pre-generate a pool of adapted words (up to 200 candidates)
  const adaptedAttempts = Math.min(longWords.length, 800);
  for (let i = 0; i < adaptedAttempts; i++) {
    const src = longWords[Math.floor(Math.random() * longWords.length)];
    const adapted = adaptWord(src, charSet, charArr, localNgram);
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

  const charTargetedExact = rankedChars.length > 0
    ? exactMulti.filter(word => rankedChars.some(char => word.includes(char)))
    : [];
  const charTargetedAdapted = rankedChars.length > 0
    ? adaptedPool.filter(word => rankedChars.some(char => word.includes(char)))
    : [];
  const bigramTargetedExact = rankedBigrams.length > 0
    ? exactMulti.filter(word => rankedBigrams.some(bigram => word.includes(bigram)))
    : [];
  const bigramTargetedAdapted = rankedBigrams.length > 0
    ? adaptedPool.filter(word => rankedBigrams.some(bigram => word.includes(bigram)))
    : [];

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
      if (hasAdaptiveSignals) {
        const bigramThreshold = rankedBigrams.length > 0
          ? clamp((0.12 + focusStrength * 0.18) * bigramPriority, 0, 0.45)
          : 0;
        const charThreshold = rankedChars.length > 0
          ? clamp(bigramThreshold + (0.14 + focusStrength * 0.18) * charPriority, bigramThreshold, 0.82)
          : bigramThreshold;

        if (r < bigramThreshold && rankedBigrams.length > 0) {
          const targetBigram = pick(rankedBigrams);
          if (bigramTargetedExact.length > 0 && Math.random() < 0.65) {
            word = pick(bigramTargetedExact);
          } else if (bigramTargetedAdapted.length > 0) {
            word = pick(bigramTargetedAdapted);
          } else if (charArr.length >= 2) {
            word = generateSeededNgramWord(localNgram, charArr, targetBigram, 3, Math.min(7, charArr.length + 2));
          }
        } else if (r < charThreshold && rankedChars.length > 0) {
          const targetChar = pick(rankedChars);
          if (charTargetedExact.length > 0 && Math.random() < 0.65) {
            word = pick(charTargetedExact);
          } else if (charTargetedAdapted.length > 0) {
            word = pick(charTargetedAdapted);
          } else if (charArr.length >= 2) {
            word = generateSeededNgramWord(localNgram, charArr, targetChar, 3, Math.min(7, charArr.length + 2));
          }
        }
      }

      if (!word && hasGoodExact) {
        // plenty of exact words: 70% exact, 30% adapted
        const exactShare = clamp((trainingMode === 'rhythm' ? 0.82 : 0.68) + exactnessBias, 0.55, 0.94);
        if (r < exactShare || adaptedPool.length === 0) {
          word = exactMulti.length > 0 ? pick(exactMulti) : null;
        } else {
          word = pick(adaptedPool);
        }
      } else {
        // few exact words: 40% exact, 40% adapted, 20% pseudo
        const exactThreshold = clamp((trainingMode === 'rhythm' ? 0.52 : 0.38) + exactnessBias, 0.28, 0.72);
        const adaptedThreshold = clamp((trainingMode === 'rhythm' ? 0.74 : 0.78) + exactnessBias * 0.35, exactThreshold + 0.1, 0.92);
        if (r < exactThreshold && exactMulti.length > 0) {
          word = pick(exactMulti);
        } else if (r < adaptedThreshold && adaptedPool.length > 0) {
          word = pick(adaptedPool);
        }
        // else fall through to pseudo-word
      }
    }

    // Fallback: n-gram pseudo-words from allowed chars
    if (!word) {
      if (charArr.length >= 2) {
        const cleanerWords = trainingMode === 'rhythm' || (options?.smartAdaptationFocus ?? 'balanced') === 'rhythm';
        const minLen = cleanerWords ? 2 : 3;
        const maxLen = cleanerWords ? Math.min(5, charArr.length + 1) : Math.min(7, charArr.length + 2);
        word = generateNgramWord(localNgram, charArr, minLen, maxLen);
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
          word = generateNgramWord(localNgram, charArr, 2, 4);
        }
      } else {
        singleCharCount++;
      }
    }

    result.push(word || charArr.slice(0, 2).join(''));
  }
  return result;
}

export function generateText(
  allWords: string[],
  chars: string[],
  wordCount = 30,
  model?: NgramModel,
): string {
  if (!chars.length) return 'the quick brown fox';
  const pool = buildPool(allWords, chars, wordCount, null, model);
  return pool.join(' ');
}

export function generateLessonText(
  keys: string[],
  count = 50,
  model?: NgramModel,
): string {
  if (model && keys.length >= 2) {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(generateNgramWord(model, keys, 2, Math.min(5, keys.length + 1)));
    }
    return words.join(' ');
  }
  // Fallback: random combos
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
  model?: NgramModel,
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
      // Combos of 2-3 chars — use n-gram model if available
      if (model && keys.length >= 2) {
        for (let i = 0; i < wordCount; i++) {
          words.push(generateNgramWord(model, keys, 2, 3));
        }
      } else {
        for (let i = 0; i < wordCount; i++) {
          const len = 2 + Math.floor(Math.random() * 2);
          let w = '';
          for (let j = 0; j < len; j++) w += keys[Math.floor(Math.random() * keys.length)];
          words.push(w);
        }
      }
      break;
    }
    case 4: {
      // Combos of 2-4 chars — use n-gram model if available
      if (model && keys.length >= 2) {
        for (let i = 0; i < wordCount; i++) {
          words.push(generateNgramWord(model, keys, 2, 4));
        }
      } else {
        for (let i = 0; i < wordCount; i++) {
          const len = 2 + Math.floor(Math.random() * 3);
          let w = '';
          for (let j = 0; j < len; j++) w += keys[Math.floor(Math.random() * keys.length)];
          words.push(w);
        }
      }
      break;
    }
    default:
      return generateLessonText(keys, wordCount, model);
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
  model?: NgramModel,
  insights?: LayoutPracticeInsights | null,
  options?: PracticeBuildOptions,
): string {
  const pool = buildPool(allWords, unlocked, count, weakChar, model, insights, options);
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
