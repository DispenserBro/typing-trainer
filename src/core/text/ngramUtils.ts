import type {
  LayoutPracticeInsights,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeTrainingMode,
} from '../../shared/types';

export interface NgramModel {
  start: Record<string, number>;
  bi: Record<string, Record<string, number>>;
  end: Record<string, number>;
}

export interface PracticeBuildOptions {
  trainingMode?: PracticeTrainingMode;
  smartAdaptationEnabled?: boolean;
  smartAdaptationStrength?: PracticeAdaptationStrength;
  smartAdaptationFocus?: PracticeAdaptationFocus;
}

export interface PracticeAdaptiveProfile {
  wordCount: number;
  focusStrength: number;
  rankedChars: string[];
  rankedBigrams: string[];
  charPriority: number;
  bigramPriority: number;
  exactnessBias: number;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildNgramModel(words: string[]): NgramModel {
  const start: Record<string, number> = {};
  const bi: Record<string, Record<string, number>> = {};
  const end: Record<string, number> = {};

  for (const raw of words) {
    const word = raw.toLowerCase();
    if (word.length < 2) continue;
    start[word[0]] = (start[word[0]] || 0) + 1;
    end[word[word.length - 1]] = (end[word[word.length - 1]] || 0) + 1;
    for (let i = 0; i < word.length - 1; i++) {
      const a = word[i];
      const b = word[i + 1];
      if (!bi[a]) bi[a] = {};
      bi[a][b] = (bi[a][b] || 0) + 1;
    }
  }

  return { start, bi, end };
}

export function weightedPick(
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

export function generateNgramWord(
  model: NgramModel,
  allowedChars: string[],
  minLen = 3,
  maxLen = 7,
): string {
  const allowed = new Set(allowedChars);
  const targetLen = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  let ch = weightedPick(model.start, allowed) ?? pick(allowedChars);
  let word = ch;

  for (let i = 1; i < targetLen; i++) {
    const prev = word[word.length - 1];
    const transitions = model.bi[prev];

    if (i === targetLen - 1 && model.end) {
      const merged: Record<string, number> = {};
      for (const c of allowed) {
        const biWeight = transitions?.[c] || 0;
        const endWeight = model.end[c] || 0;
        merged[c] = biWeight + endWeight * 0.5;
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

export function generateSeededNgramWord(
  model: NgramModel,
  allowedChars: string[],
  seed: string,
  minLen = 3,
  maxLen = 7,
): string {
  const allowed = new Set(allowedChars);
  const normalizedSeed = [...seed.toLowerCase()].filter(ch => allowed.has(ch)).join('');
  if (!normalizedSeed) return generateNgramWord(model, allowedChars, minLen, maxLen);

  const targetLen = Math.max(normalizedSeed.length, minLen)
    + Math.floor(Math.random() * Math.max(1, maxLen - Math.max(normalizedSeed.length, minLen) + 1));
  let word = normalizedSeed;

  while (word.length < targetLen) {
    const prev = word[word.length - 1];
    const transitions = model.bi[prev];
    if (word.length === targetLen - 1 && model.end) {
      const merged: Record<string, number> = {};
      for (const c of allowed) {
        const biWeight = transitions?.[c] || 0;
        const endWeight = model.end[c] || 0;
        merged[c] = biWeight + endWeight * 0.5;
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

export function filterByChars(words: string[], chars: string[]): string[] {
  const charSet = new Set(chars.map(c => c.toLowerCase()));
  return words.filter((word) => {
    const lower = word.toLowerCase();
    return lower.length >= 2 && [...lower].every(ch => charSet.has(ch));
  });
}

export function adaptWord(
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
  if (replaced / word.length > 0.6) return null;
  return result;
}

export function buildPracticeAdaptiveProfile(
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
  const rankedChars = Object.entries(insights.chars ?? {})
    .filter(([char, aggregate]) => allowed.has(char) && aggregate.weakness > 0)
    .sort((a, b) => b[1].weakness - a[1].weakness)
    .slice(0, 4)
    .map(([char]) => char);
  const rankedBigrams = Object.entries(insights.bigrams ?? {})
    .filter(([bigram, aggregate]) => aggregate.weakness > 0 && [...bigram].every(ch => allowed.has(ch)))
    .sort((a, b) => b[1].weakness - a[1].weakness)
    .slice(0, 5)
    .map(([bigram]) => bigram);

  const topCharWeakness = rankedChars[0] ? insights.chars?.[rankedChars[0]]?.weakness ?? 0 : 0;
  const topBigramWeakness = rankedBigrams[0] ? insights.bigrams?.[rankedBigrams[0]]?.weakness ?? 0 : 0;
  const rhythmWeakness = insights.rhythm?.weakness ?? 0;
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

