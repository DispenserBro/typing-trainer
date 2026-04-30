import type {
  CustomPracticePack,
  CustomPracticePackKind,
  LayoutPracticeInsights,
  PracticeContentPack,
  TranslationParams,
} from '../../shared/types';
import type { NgramModel, PracticeBuildOptions } from '../text/ngramUtils';
import { i18n } from '../i18n';
import { buildNgramModel, filterByChars, generateNgramWord, generateSeededNgramWord, pick } from '../text/ngramUtils';

const EN_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
const RU_VOWELS = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я']);

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function detectVowelSet(chars: string[]) {
  const hasCyrillic = chars.some(char => /[а-яё]/i.test(char));
  return hasCyrillic ? RU_VOWELS : EN_VOWELS;
}

function splitByVowels(chars: string[]) {
  const vowels = detectVowelSet(chars);
  const normalized = unique(chars.map(char => char.toLowerCase()).filter(char => char.length === 1 && char !== ' '));
  const vowelChars = normalized.filter(char => vowels.has(char));
  const consonantChars = normalized.filter(char => !vowels.has(char));
  return { vowelChars, consonantChars };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function countWords(value: string): number {
  return normalizeWhitespace(value).split(' ').filter(Boolean).length;
}

export interface PracticeContentPackQualityMetrics {
  itemCount: number;
  averageWordsPerItem: number;
  estimatedItemsPerText: number;
  estimatedWordsPerText: number;
  repetitionPressure: number;
}

type TranslateFn = (key: string, params?: TranslationParams) => string;

const translateWithI18n: TranslateFn = (key, params) =>
  i18n.t(key, params ?? {}) as string;

function estimateItemsForWordBudget(
  targetWordCount: number,
  averageWordsPerItem: number,
  minimumItems: number,
): number {
  return Math.max(
    minimumItems,
    Math.ceil(targetWordCount / Math.max(1, averageWordsPerItem)),
  );
}

function countCharOccurrences(value: string, char: string) {
  return [...value].filter((token) => token === char).length;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b > 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function getRotationStep(length: number): number {
  if (length <= 1) return 1;
  for (const candidate of [5, 7, 3, 2, 11]) {
    if (candidate < length && greatestCommonDivisor(candidate, length) === 1) {
      return candidate;
    }
  }
  return 1;
}

function pickRotated<T>(items: T[], offset: number, step: number, index: number) {
  if (items.length === 0) return null;
  const normalizedIndex = (offset + index * step) % items.length;
  return items[normalizedIndex] ?? items[0] ?? null;
}

function hasRecentDuplicate(recentItems: string[], candidate: string) {
  return recentItems.includes(candidate);
}

function normalizePackItems(items: string[]): string[] {
  return unique(
    items
      .map(item => normalizeWhitespace(item))
      .filter(Boolean),
  ).slice(0, 500);
}

export function getPracticeContentPackQualityMetrics(
  pack: PracticeContentPack,
  targetWordCount: number,
): PracticeContentPackQualityMetrics {
  const itemCount = pack.items.length;
  const averageWordsPerItem = itemCount > 0
    ? pack.items.reduce((sum, item) => sum + countWords(item), 0) / itemCount
    : 0;

  if (pack.kind === 'sentences') {
    const minimumItems = Math.max(2, Math.ceil(targetWordCount / Math.max(averageWordsPerItem * 1.35, 6)));
    const estimatedWordsPerText = Math.max(targetWordCount, Math.round(averageWordsPerItem * minimumItems));
    return {
      itemCount,
      averageWordsPerItem,
      estimatedItemsPerText: minimumItems,
      estimatedWordsPerText,
      repetitionPressure: itemCount > 0 ? minimumItems / itemCount : 0,
    };
  }

  if (pack.kind === 'mixed') {
    const estimatedItemsPerText = estimateItemsForWordBudget(targetWordCount, averageWordsPerItem, 3);
    return {
      itemCount,
      averageWordsPerItem,
      estimatedItemsPerText,
      estimatedWordsPerText: Math.max(targetWordCount, Math.round(estimatedItemsPerText * averageWordsPerItem)),
      repetitionPressure: itemCount > 0 ? estimatedItemsPerText / itemCount : 0,
    };
  }

  const estimatedItemsPerText = Math.max(6, targetWordCount);
  return {
    itemCount,
    averageWordsPerItem,
    estimatedItemsPerText,
    estimatedWordsPerText: Math.max(1, Math.round(estimatedItemsPerText * Math.max(1, averageWordsPerItem))),
    repetitionPressure: itemCount > 0 ? estimatedItemsPerText / itemCount : 0,
  };
}

function inferPackKind(items: string[]): CustomPracticePackKind {
  if (items.length === 0) return 'mixed';
  const sentenceLike = items.filter(item => /\s/.test(item) || /[.!?;:]/.test(item)).length;
  if (sentenceLike >= Math.ceil(items.length * 0.7)) return 'sentences';
  if (sentenceLike === 0) return 'words';
  return 'mixed';
}

function titleFromFileName(name: string, t: TranslateFn = translateWithI18n) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
    || t('practice.importedPackTitle');
}

export function createCustomPracticePackFromFile(file: {
  name: string;
  content: string;
}, t: TranslateFn = translateWithI18n): CustomPracticePack {
  const fileName = file.name.toLowerCase();
  const importedAt = new Date().toISOString();

  if (fileName.endsWith('.json')) {
    const raw = JSON.parse(file.content) as {
      id?: string;
      name?: string;
      description?: string;
      language?: string;
      type?: CustomPracticePackKind;
      kind?: CustomPracticePackKind;
      items?: string[];
      entries?: string[];
      texts?: string[];
    } | string[];

    const itemsSource = Array.isArray(raw)
      ? raw
      : raw.items ?? raw.entries ?? raw.texts ?? [];
    const items = normalizePackItems(Array.isArray(itemsSource) ? itemsSource : []);
    if (items.length === 0) {
      throw new Error(t('practice.importErrors.noExercises'));
    }

    const kind = Array.isArray(raw)
      ? inferPackKind(items)
      : (raw.type ?? raw.kind ?? inferPackKind(items));

    return {
      id: `pack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: Array.isArray(raw)
        ? titleFromFileName(file.name, t)
        : normalizeWhitespace(raw.name ?? '') || titleFromFileName(file.name, t),
      description: Array.isArray(raw) ? undefined : normalizeWhitespace(raw.description ?? '') || undefined,
      kind,
      language: Array.isArray(raw) ? 'any' : normalizeWhitespace(raw.language ?? '') || 'any',
      origin: 'custom',
      source: 'json',
      items,
      importedAt,
    };
  }

  const normalizedText = file.content.replace(/\r\n/g, '\n').trim();
  if (!normalizedText) {
    throw new Error(t('practice.importErrors.emptyText'));
  }

  const lineItems = normalizedText
    .split('\n')
    .map(item => normalizeWhitespace(item))
    .filter(Boolean);
  const sentenceItems = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map(item => normalizeWhitespace(item))
    .filter(Boolean);

  const items = normalizePackItems(
    sentenceItems.length >= 3 ? sentenceItems : lineItems,
  );

  if (items.length === 0) {
    throw new Error(t('practice.importErrors.noTexts'));
  }

  return {
    id: `pack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: titleFromFileName(file.name, t),
    kind: inferPackKind(items),
    language: 'any',
    origin: 'custom',
    source: 'txt',
    items,
    importedAt,
  };
}

export function generatePseudoWordText(
  chars: string[],
  count: number,
  weakChar: string | null,
  model?: NgramModel,
): string {
  const normalizedChars = unique(chars.map(char => char.toLowerCase()).filter(Boolean));
  if (normalizedChars.length < 2) return normalizedChars.join('');

  const result: string[] = [];
  const generatedModel = model ?? buildNgramModel(normalizedChars.map(char => `${char}${pick(normalizedChars)}`));
  const normalizedWeakChar = weakChar?.toLowerCase() ?? null;
  const weakIndex = normalizedWeakChar ? Math.max(0, normalizedChars.indexOf(normalizedWeakChar)) : 0;
  const charOffset = weakIndex >= 0 ? weakIndex : 0;
  const charStep = getRotationStep(normalizedChars.length);
  for (let index = 0; index < count; index += 1) {
    const minLen = index % 4 === 0 ? 2 : 3;
    const maxLen = index % 5 === 0 ? 6 : 5;
    const recentWords = result.slice(-3);
    const weakWordShare = recentWords.length > 0 && normalizedWeakChar
      ? recentWords.filter(word => word.includes(normalizedWeakChar)).length / recentWords.length
      : 0;
    const preferWeakSeed = Boolean(normalizedWeakChar) && index % 4 === 0 && weakWordShare < 0.67;
    const alternateSeed = pickRotated(normalizedChars, charOffset + 1, charStep, index) ?? normalizedChars[0];
    const fallbackSeed = pickRotated(normalizedChars, charOffset + 2, charStep, index + 1) ?? normalizedChars[0];
    const primarySeed = preferWeakSeed && normalizedWeakChar
      ? normalizedWeakChar
      : (index % 3 === 0 ? alternateSeed : fallbackSeed);
    let candidate = generateSeededNgramWord(generatedModel, normalizedChars, primarySeed, minLen, maxLen);

    if (
      normalizedWeakChar
      && countCharOccurrences(candidate, normalizedWeakChar) >= Math.ceil(candidate.length * 0.6)
    ) {
      candidate = generateSeededNgramWord(generatedModel, normalizedChars, fallbackSeed, minLen, maxLen);
    }

    if (hasRecentDuplicate(recentWords, candidate)) {
      candidate = generateSeededNgramWord(generatedModel, normalizedChars, alternateSeed, minLen, maxLen);
    }

    if (hasRecentDuplicate(recentWords, candidate)) {
      candidate = generateNgramWord(generatedModel, normalizedChars, minLen, maxLen);
    }

    result.push(candidate);
  }
  return result.join(' ');
}

export function generateSyllableText(chars: string[], count: number): string {
  const normalizedChars = unique(chars.map(char => char.toLowerCase()).filter(Boolean));
  if (normalizedChars.length < 2) return normalizedChars.join('');

  const { vowelChars, consonantChars } = splitByVowels(normalizedChars);
  const vowels = vowelChars.length > 0 ? vowelChars : normalizedChars;
  const consonants = consonantChars.length > 0 ? consonantChars : normalizedChars;
  const patterns = ['cv', 'cvc', 'vc', 'cvv', 'ccv', 'vcc', 'cvcv'] as const;
  const result: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const recentSyllables = result.slice(-4);
    let syllable = '';
    let attempts = 0;
    while (attempts < 6) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)] ?? patterns[0];
      syllable = '';
      for (let tokenIndex = 0; tokenIndex < pattern.length; tokenIndex += 1) {
        const token = pattern[tokenIndex];
        const tokenPool = token === 'v' ? vowels : consonants;
        syllable += pick(tokenPool);
      }
      if (!hasRecentDuplicate(recentSyllables, syllable)) {
        break;
      }
      attempts += 1;
    }
    result.push(syllable);
  }

  return result.join(' ');
}

export function generateSentenceText(
  allWords: string[],
  chars: string[],
  targetWordCount: number,
  weakChar: string | null,
  model?: NgramModel,
  insights?: LayoutPracticeInsights | null,
  options?: PracticeBuildOptions,
  sentenceLengthRange?: {
    min: number;
    max: number;
  },
): string {
  const pool = filterByChars(allWords, chars).filter(word => word.length >= 2);
  const localModel = pool.length >= 10 ? buildNgramModel(pool) : model;
  const preferredPool = pool.filter(word => word.length >= 3);
  const sentencePool = preferredPool.length >= Math.max(8, Math.floor(pool.length * 0.35))
    ? preferredPool
    : pool;
  const sentenceOffset = sentencePool.length > 1
    ? Math.floor(Math.random() * sentencePool.length)
    : 0;
  const sentenceStep = getRotationStep(sentencePool.length);
  const normalizedSentenceLengthRange = {
    min: Math.max(2, Math.min(sentenceLengthRange?.min ?? 3, sentenceLengthRange?.max ?? 7)),
    max: Math.max(sentenceLengthRange?.min ?? 3, sentenceLengthRange?.max ?? 7),
  };
  const sentenceSpan = Math.max(1, normalizedSentenceLengthRange.max - normalizedSentenceLengthRange.min + 1);
  const result: string[] = [];
  let wordsUsed = 0;

  while (wordsUsed < targetWordCount) {
    const remainingWords = targetWordCount - wordsUsed;
    const desiredSentenceLength = normalizedSentenceLengthRange.min + ((wordsUsed + result.length) % sentenceSpan);
    const sentenceLength = remainingWords <= normalizedSentenceLengthRange.min
      ? remainingWords
      : Math.min(normalizedSentenceLengthRange.max, desiredSentenceLength);
    const sentenceWords: string[] = [];
    for (let index = 0; index < sentenceLength; index += 1) {
      if (sentencePool.length > 0) {
        const candidateIndex = (sentenceOffset + (wordsUsed + index) * sentenceStep) % sentencePool.length;
        const candidate = sentencePool[candidateIndex] ?? pick(sentencePool);
        sentenceWords.push(candidate);
      } else {
        sentenceWords.push(generatePseudoWordText(chars, 1, weakChar, localModel).trim());
      }
    }

    const punctuation = wordsUsed + sentenceLength >= targetWordCount ? '.' : (wordsUsed % 2 === 0 ? '.' : ',');
    const sentence = sentenceWords.join(' ');
    result.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + punctuation);
    wordsUsed += sentenceLength;
  }

  return result.join(' ');
}

export function generateCustomPackText(
  pack: PracticeContentPack,
  count: number,
  allowedChars?: string[],
): string {
  return generateContentPackText(pack, count, allowedChars);
}

export function generateContentPackText(
  pack: PracticeContentPack,
  count: number,
  allowedChars?: string[],
): string {
  if (!pack.items.length) return '';
  const normalizedAllowed = allowedChars
    ? new Set(allowedChars.map(char => char.toLowerCase()))
    : null;
  const filteredItems = normalizedAllowed
    ? pack.items.filter(item => [...item.toLowerCase()].every(char => char === ' ' || /[.,!?;:'"()-]/.test(char) || normalizedAllowed.has(char)))
    : pack.items;
  const sourceItems = filteredItems.length >= Math.max(3, Math.floor(pack.items.length * 0.25))
    ? filteredItems
    : pack.items;
  const itemOffset = sourceItems.length > 1
    ? Math.floor(Math.random() * sourceItems.length)
    : 0;
  const itemStep = getRotationStep(sourceItems.length);

  if (pack.kind === 'sentences') {
    const averageWordsPerItem = sourceItems.reduce((sum, item) => sum + countWords(item), 0) / Math.max(1, sourceItems.length);
    const minimumItems = Math.max(2, Math.ceil(count / Math.max(averageWordsPerItem * 1.35, 6)));
    const targetWordBudget = Math.max(count, Math.round(averageWordsPerItem * minimumItems));
    const maxItems = Math.max(
      sourceItems.length * 4,
      Math.ceil(targetWordBudget / Math.max(1, averageWordsPerItem)) + 3,
    );
    const result: string[] = [];
    let wordsUsed = 0;
    let index = 0;

    while ((wordsUsed < targetWordBudget || result.length < minimumItems) && result.length < maxItems) {
      const itemIndex = (itemOffset + index * itemStep) % sourceItems.length;
      const item = sourceItems[itemIndex] ?? sourceItems[0];
      result.push(item);
      wordsUsed += countWords(item);
      index += 1;
    }

    return result.join(' ');
  }

  if (pack.kind === 'mixed') {
    const averageWordsPerItem = sourceItems.reduce((sum, item) => sum + countWords(item), 0) / Math.max(1, sourceItems.length);
    const minimumItems = estimateItemsForWordBudget(count, averageWordsPerItem, 3);
    const maxItems = Math.max(
      sourceItems.length * 4,
      minimumItems + sourceItems.length,
    );
    const result: string[] = [];
    const recentWindowSize = sourceItems.length <= 8 ? 3 : 1;
    let wordsUsed = 0;
    let cursor = 0;

    while ((wordsUsed < count || result.length < minimumItems) && result.length < maxItems) {
      let candidate = pickRotated(sourceItems, itemOffset, itemStep, cursor) ?? sourceItems[0];
      let safety = 0;
      while (candidate && hasRecentDuplicate(result.slice(-recentWindowSize), candidate) && safety < sourceItems.length) {
        cursor += 1;
        candidate = pickRotated(sourceItems, itemOffset, itemStep, cursor) ?? sourceItems[0];
        safety += 1;
      }
      const selected = candidate ?? sourceItems[0];
      result.push(selected);
      wordsUsed += countWords(selected);
      cursor += 1;
    }

    return result.join(' ');
  }

  const targetItems = Math.max(6, count);
  const result: string[] = [];
  const recentWindowSize = sourceItems.length <= 8 ? 3 : 1;
  let cursor = 0;
  for (let index = 0; index < targetItems; index += 1) {
    let candidate = pickRotated(sourceItems, itemOffset, itemStep, cursor) ?? sourceItems[0];
    let safety = 0;
    while (candidate && hasRecentDuplicate(result.slice(-recentWindowSize), candidate) && safety < sourceItems.length) {
      cursor += 1;
      candidate = pickRotated(sourceItems, itemOffset, itemStep, cursor) ?? sourceItems[0];
      safety += 1;
    }
    result.push(candidate ?? sourceItems[0]);
    cursor += 1;
  }
  return result.join(' ');
}
