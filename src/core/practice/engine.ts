import type { CharStat, LayoutPracticeInsights } from '../../shared/types';
import {
  adaptWord,
  buildNgramModel,
  buildPracticeAdaptiveProfile,
  clamp,
  filterByChars,
  generateNgramWord,
  generateSeededNgramWord,
  pick,
  type NgramModel,
  type PracticeBuildOptions,
} from '../text/ngramUtils';

function countRecentCharMatches(words: string[], target: string | null | undefined) {
  if (!target) return 0;
  return words.filter(word => word.includes(target)).length;
}

function countRecentBigramMatches(words: string[], target: string | null | undefined) {
  if (!target) return 0;
  return words.filter(word => word.includes(target)).length;
}

function hasRecentWordDuplicate(words: string[], candidate: string | null) {
  return candidate ? words.includes(candidate) : false;
}

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
  const exactPool = filterByChars(allWords, chars);
  const exactMulti = exactPool.filter(w => w.length >= 2);
  const localNgram = exactMulti.length >= 10 ? buildNgramModel(exactMulti) : (model ?? buildNgramModel(allWords));

  const adaptiveProfile = buildPracticeAdaptiveProfile(insights, charArr, count, options);
  count = adaptiveProfile.wordCount;
  if (trainingMode === 'rhythm') {
    count = clamp(Math.round(count * 0.78), 10, 20);
  }

  const { rankedChars, rankedBigrams, focusStrength, charPriority, bigramPriority, exactnessBias } = adaptiveProfile;
  const hasAdaptiveSignals = rankedChars.length > 0 || rankedBigrams.length > 0;
  const longWords = allWords.filter(w => w.length >= 5);
  const adaptedPool: string[] = [];
  const adaptedAttempts = Math.min(longWords.length, 800);
  for (let i = 0; i < adaptedAttempts; i++) {
    const src = longWords[Math.floor(Math.random() * longWords.length)];
    const adapted = adaptWord(src, charSet, charArr, localNgram);
    if (adapted && !exactMulti.includes(adapted)) adaptedPool.push(adapted);
  }

  let preferExact: string[] = [];
  let preferAdapted: string[] = [];
  if (preferChars) {
    preferExact = exactMulti.filter(w => w.toLowerCase().includes(preferChars));
    preferAdapted = adaptedPool.filter(w => w.includes(preferChars));
  }

  const charTargetedExact = rankedChars.length ? exactMulti.filter(word => rankedChars.some(char => word.includes(char))) : [];
  const charTargetedAdapted = rankedChars.length ? adaptedPool.filter(word => rankedChars.some(char => word.includes(char))) : [];
  const bigramTargetedExact = rankedBigrams.length ? exactMulti.filter(word => rankedBigrams.some(bigram => word.includes(bigram))) : [];
  const bigramTargetedAdapted = rankedBigrams.length ? adaptedPool.filter(word => rankedBigrams.some(bigram => word.includes(bigram))) : [];

  const result: string[] = [];
  const maxSingleChar = Math.max(1, Math.floor(count * 0.1));
  let singleCharCount = 0;
  const hasGoodExact = exactMulti.length >= 15;

  for (let i = 0; i < count; i++) {
    let word: string | null = null;
    const recentWords = result.slice(-4);

    if (preferChars && Math.random() < 0.18) {
      if (preferExact.length > 0 && Math.random() < 0.6) {
        word = pick(preferExact);
      } else if (preferAdapted.length > 0) {
        word = pick(preferAdapted);
      }
      if (countRecentCharMatches(recentWords, preferChars) >= 3) {
        word = null;
      }
    }

    if (!word) {
      const r = Math.random();
      if (hasAdaptiveSignals) {
        const bigramThreshold = rankedBigrams.length > 0
          ? clamp((0.1 + focusStrength * 0.16) * bigramPriority, 0, 0.38)
          : 0;
        const charThreshold = rankedChars.length > 0
          ? clamp(bigramThreshold + (0.1 + focusStrength * 0.14) * charPriority, bigramThreshold, 0.66)
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
          if (countRecentBigramMatches(recentWords, targetBigram) >= 2) {
            word = null;
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
          if (countRecentCharMatches(recentWords, targetChar) >= 3) {
            word = null;
          }
        }
      }

      if (!word && hasGoodExact) {
        const exactShare = clamp((trainingMode === 'rhythm' ? 0.82 : 0.68) + exactnessBias, 0.55, 0.94);
        if (r < exactShare || adaptedPool.length === 0) {
          word = exactMulti.length > 0 ? pick(exactMulti) : null;
        } else {
          word = pick(adaptedPool);
        }
      } else if (!word) {
        const exactThreshold = clamp((trainingMode === 'rhythm' ? 0.52 : 0.38) + exactnessBias, 0.28, 0.72);
        const adaptedThreshold = clamp((trainingMode === 'rhythm' ? 0.74 : 0.78) + exactnessBias * 0.35, exactThreshold + 0.1, 0.92);
        if (r < exactThreshold && exactMulti.length > 0) {
          word = pick(exactMulti);
        } else if (r < adaptedThreshold && adaptedPool.length > 0) {
          word = pick(adaptedPool);
        }
      }
    }

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

    if (hasRecentWordDuplicate(recentWords, word) && charArr.length >= 2) {
      const cleanerWords = trainingMode === 'rhythm' || (options?.smartAdaptationFocus ?? 'balanced') === 'rhythm';
      const minLen = cleanerWords ? 2 : 3;
      const maxLen = cleanerWords ? Math.min(5, charArr.length + 1) : Math.min(7, charArr.length + 2);
      word = generateNgramWord(localNgram, charArr, minLen, maxLen);
    }

    if (word && word.length === 1) {
      if (singleCharCount >= maxSingleChar && charArr.length >= 2) {
        word = generateNgramWord(localNgram, charArr, 2, 4);
      } else {
        singleCharCount++;
      }
    }

    result.push(word || charArr.slice(0, 2).join(''));
  }

  return result;
}

export function generateText(allWords: string[], chars: string[], wordCount = 30, model?: NgramModel): string {
  if (!chars.length) return 'the quick brown fox';
  return buildPool(allWords, chars, wordCount, null, model).join(' ');
}

export function generatePracticeText(
  allWords: string[],
  unlocked: string[],
  weakChar: string | null,
  count = 25,
  model?: NgramModel,
  insights?: LayoutPracticeInsights | null,
  options?: PracticeBuildOptions,
): string {
  return buildPool(allWords, unlocked, count, weakChar, model, insights, options).join(' ');
}

export function getWorstChar(
  keyStats: Record<string, CharStat> | undefined,
  allowedChars?: string[],
): string | null {
  if (!keyStats) return null;
  const allowed = allowedChars ? new Set(allowedChars.map(c => c.toLowerCase())) : null;
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

