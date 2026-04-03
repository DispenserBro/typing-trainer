import {
  buildNgramModel,
  filterYoKeys,
  filterYoWords,
  generatePracticeText,
  type NgramModel,
} from '../renderer/engine';
import type {
  LayoutPracticeInsights,
  LayoutsData,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeTrainingMode,
} from '../shared/types';

type WordStat = { token: string; count: number; share: number };

export interface PracticeDiagnosticsScenario {
  label: string;
  layoutId: string;
  runs: number;
  trainingMode: PracticeTrainingMode;
  useYo?: boolean;
  unlockCount?: number;
  smartAdaptationEnabled?: boolean;
  smartAdaptationStrength?: PracticeAdaptationStrength;
  smartAdaptationFocus?: PracticeAdaptationFocus;
}

export interface PracticeDiagnosticsReport {
  scenario: Required<PracticeDiagnosticsScenario>;
  languageId: string;
  unlockedChars: string[];
  simulatedWeakChar: string | null;
  simulatedWeakBigram: string | null;
  totals: {
    texts: number;
    words: number;
    chars: number;
    uniqueWords: number;
    uniqueBigrams: number;
  };
  averages: {
    wordsPerText: number;
    wordLength: number;
    uniqueWordRatio: number;
    nonDictionaryRatio: number;
    repeatedWordRatio: number;
  };
  topChars: WordStat[];
  topBigrams: WordStat[];
  topWords: WordStat[];
  warnings: string[];
}

export interface PracticeDiagnosticsBundle {
  reports: PracticeDiagnosticsReport[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function createEmptyInsights(): LayoutPracticeInsights {
  return {
    chars: {},
    bigrams: {},
    fingers: {},
    rows: {
      top: { hits: 0, misses: 0, totalTime: 0, weakness: 0 },
      middle: { hits: 0, misses: 0, totalTime: 0, weakness: 0 },
      bottom: { hits: 0, misses: 0, totalTime: 0, weakness: 0 },
    },
    rhythm: {
      samples: 0,
      averageInterval: 0,
      averageDeviation: 0,
      weakness: 0,
    },
    lastUpdated: '',
  };
}

function topEntries(map: Map<string, number>, limit: number, total: number): WordStat[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token, count]) => ({
      token,
      count,
      share: total > 0 ? round((count / total) * 100, 2) : 0,
    }));
}

function createSyntheticInsights(
  unlockedChars: string[],
  focus: PracticeAdaptationFocus,
): { insights: LayoutPracticeInsights | null; weakChar: string | null; weakBigram: string | null } {
  if (unlockedChars.length < 2) {
    return { insights: null, weakChar: unlockedChars[0] ?? null, weakBigram: null };
  }

  const base = createEmptyInsights();
  const middleIndex = Math.floor(unlockedChars.length / 2);
  const weakChar = unlockedChars[clamp(middleIndex, 0, unlockedChars.length - 1)] ?? null;
  const pairStart = clamp(middleIndex - 1, 0, Math.max(0, unlockedChars.length - 2));
  const weakBigram = `${unlockedChars[pairStart] ?? ''}${unlockedChars[pairStart + 1] ?? ''}` || null;

  if (weakChar && focus !== 'bigrams' && focus !== 'rhythm') {
    base.chars[weakChar] = { hits: 14, misses: 5, totalTime: 6400, weakness: 71 };
  } else if (weakChar) {
    base.chars[weakChar] = { hits: 9, misses: 2, totalTime: 3700, weakness: 34 };
  }

  if (weakBigram && focus !== 'chars' && focus !== 'rhythm') {
    base.bigrams[weakBigram] = { hits: 10, misses: 5, totalTransitionTime: 5200, weakness: 77 };
  } else if (weakBigram) {
    base.bigrams[weakBigram] = { hits: 8, misses: 2, totalTransitionTime: 3100, weakness: 39 };
  }

  if (focus === 'rhythm') {
    base.rhythm = {
      samples: 24,
      averageInterval: 285,
      averageDeviation: 120,
      weakness: 42,
    };
  } else {
    base.rhythm = {
      samples: 18,
      averageInterval: 240,
      averageDeviation: 52,
      weakness: 21,
    };
  }

  return { insights: base, weakChar, weakBigram };
}

function createWarnings(report: Omit<PracticeDiagnosticsReport, 'warnings'>): string[] {
  const warnings: string[] = [];
  const topCharShare = report.topChars[0]?.share ?? 0;
  const topBigramShare = report.topBigrams[0]?.share ?? 0;

  if (topCharShare >= 18) {
    warnings.push(`Сильный перекос по символам: '${report.topChars[0]?.token}' встречается слишком часто (${topCharShare}%).`);
  }
  if (topBigramShare >= 12) {
    warnings.push(`Сильный перекос по биграммам: '${report.topBigrams[0]?.token}' доминирует (${topBigramShare}%).`);
  }
  if (report.averages.uniqueWordRatio <= 0.42) {
    warnings.push(`Низкое разнообразие слов: уникальных слов только ${report.averages.uniqueWordRatio * 100}%.`);
  }
  if (report.averages.repeatedWordRatio >= 0.58) {
    warnings.push(`Слишком много повторов: повторяющихся слов ${report.averages.repeatedWordRatio * 100}%.`);
  }
  if (report.averages.wordLength <= (report.scenario.trainingMode === 'rhythm' ? 2.2 : 2.8)) {
    warnings.push(`Средняя длина слов выглядит слишком низкой: ${report.averages.wordLength}.`);
  }
  if (report.averages.nonDictionaryRatio >= 0.7 && report.scenario.trainingMode === 'normal') {
    warnings.push(`Слишком много синтетических слов: ${report.averages.nonDictionaryRatio * 100}% вне словаря.`);
  }

  if (warnings.length === 0) {
    warnings.push('Явных перекосов не найдено по выбранным эвристикам.');
  }

  return warnings;
}

export function runPracticeDiagnostics(
  layoutsData: LayoutsData,
  wordsByLanguage: Record<string, string[]>,
  scenarioInput: PracticeDiagnosticsScenario,
): PracticeDiagnosticsReport {
  const scenario: Required<PracticeDiagnosticsScenario> = {
    useYo: false,
    unlockCount: 0,
    smartAdaptationEnabled: true,
    smartAdaptationStrength: 'medium',
    smartAdaptationFocus: 'balanced',
    ...scenarioInput,
  };

  const layout = layoutsData.layouts[scenario.layoutId];
  if (!layout) {
    throw new Error(`Unknown layout: ${scenario.layoutId}`);
  }

  const words = filterYoWords(wordsByLanguage[layout.lang] ?? [], scenario.useYo);
  const ngramModel: NgramModel = buildNgramModel(words);
  const unlockOrder = filterYoKeys(layout.practiceUnlockOrder ?? [], scenario.useYo);
  const unlockedChars = unlockOrder.slice(0, scenario.unlockCount > 0 ? scenario.unlockCount : unlockOrder.length);
  const dictionaryPool = new Set(words.filter((word) => [...word].every((char) => unlockedChars.includes(char))));

  const synthetic = scenario.smartAdaptationEnabled
    ? createSyntheticInsights(unlockedChars, scenario.smartAdaptationFocus)
    : { insights: null, weakChar: null, weakBigram: null };

  const charCounts = new Map<string, number>();
  const bigramCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  let totalWords = 0;
  let totalChars = 0;
  let nonDictionaryWords = 0;
  let repeatedWords = 0;
  let totalWordLength = 0;

  for (let run = 0; run < scenario.runs; run += 1) {
    const text = generatePracticeText(
      words,
      unlockedChars,
      synthetic.weakChar,
      scenario.trainingMode === 'rhythm' ? 18 : 25,
      ngramModel,
      synthetic.insights,
      {
        trainingMode: scenario.trainingMode,
        smartAdaptationEnabled: scenario.smartAdaptationEnabled,
        smartAdaptationStrength: scenario.smartAdaptationStrength,
        smartAdaptationFocus: scenario.smartAdaptationFocus,
      },
    );

    const tokens = text.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      totalWords += 1;
      totalWordLength += token.length;
      totalChars += token.length;

      const previousCount = wordCounts.get(token) ?? 0;
      if (previousCount > 0) repeatedWords += 1;
      wordCounts.set(token, previousCount + 1);

      if (!dictionaryPool.has(token)) {
        nonDictionaryWords += 1;
      }

      for (const char of token) {
        charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
      }

      for (let index = 0; index < token.length - 1; index += 1) {
        const bigram = token.slice(index, index + 2);
        bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
      }
    }
  }

  const baseReport = {
    scenario,
    languageId: layout.lang,
    unlockedChars,
    simulatedWeakChar: synthetic.weakChar,
    simulatedWeakBigram: synthetic.weakBigram,
    totals: {
      texts: scenario.runs,
      words: totalWords,
      chars: totalChars,
      uniqueWords: wordCounts.size,
      uniqueBigrams: bigramCounts.size,
    },
    averages: {
      wordsPerText: round(totalWords / Math.max(1, scenario.runs), 2),
      wordLength: round(totalWordLength / Math.max(1, totalWords), 2),
      uniqueWordRatio: round(wordCounts.size / Math.max(1, totalWords), 4),
      nonDictionaryRatio: round(nonDictionaryWords / Math.max(1, totalWords), 4),
      repeatedWordRatio: round(repeatedWords / Math.max(1, totalWords), 4),
    },
    topChars: topEntries(charCounts, 8, totalChars),
    topBigrams: topEntries(bigramCounts, 8, Math.max(1, totalChars - totalWords)),
    topWords: topEntries(wordCounts, 8, totalWords),
  };

  return {
    ...baseReport,
    warnings: createWarnings(baseReport),
  };
}

export function formatPracticeDiagnosticsReport(report: PracticeDiagnosticsReport): string {
  const lines: string[] = [];
  lines.push(`=== ${report.scenario.label} ===`);
  lines.push(`Layout: ${report.scenario.layoutId} (${report.languageId})`);
  lines.push(`Mode: ${report.scenario.trainingMode} | Runs: ${report.scenario.runs} | Unlocked: ${report.unlockedChars.length}`);
  lines.push(`Smart adaptation: ${report.scenario.smartAdaptationEnabled ? 'on' : 'off'} | strength=${report.scenario.smartAdaptationStrength} | focus=${report.scenario.smartAdaptationFocus}`);
  if (report.simulatedWeakChar || report.simulatedWeakBigram) {
    lines.push(`Synthetic weak spots: char=${report.simulatedWeakChar ?? '—'}, bigram=${report.simulatedWeakBigram ?? '—'}`);
  }
  lines.push(`Words/text: ${report.averages.wordsPerText} | Avg word length: ${report.averages.wordLength}`);
  lines.push(`Unique ratio: ${(report.averages.uniqueWordRatio * 100).toFixed(1)}% | Non-dictionary: ${(report.averages.nonDictionaryRatio * 100).toFixed(1)}% | Repeats: ${(report.averages.repeatedWordRatio * 100).toFixed(1)}%`);
  lines.push(`Top chars: ${report.topChars.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push(`Top bigrams: ${report.topBigrams.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push(`Top words: ${report.topWords.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push('Warnings:');
  report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  lines.push('');
  return lines.join('\n');
}
