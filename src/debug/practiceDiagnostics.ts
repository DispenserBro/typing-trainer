import {
  buildNgramModel,
  buildPracticeContentText,
  filterYoKeys,
  filterYoWords,
  getPracticeContentScenario,
  getPracticeContentScenarioForTrainingMode,
  resolvePracticeContentPackSelection,
  type NgramModel,
} from '../core/engine';
import type {
  LayoutPracticeInsights,
  LayoutsData,
  PracticeAdaptationFocus,
  PracticeAdaptationStrength,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentScenarioId,
  PracticeTrainingMode,
} from '../shared/types';

type WordStat = { token: string; count: number; share: number };

interface DiagnosticsPackSummary {
  id: string;
  name: string;
  kind: PracticeContentPack['kind'];
  origin: PracticeContentPack['origin'];
  itemsCount: number;
}

export interface PracticeDiagnosticsScenario {
  label: string;
  layoutId: string;
  runs: number;
  trainingMode: PracticeTrainingMode;
  contentMode?: PracticeContentMode;
  contentScenarioId?: PracticeContentScenarioId;
  contentPackId?: string;
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
  selectedContentPack: DiagnosticsPackSummary | null;
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
    immediateRepeatRatio: number;
  };
  topChars: WordStat[];
  topBigrams: WordStat[];
  topWords: WordStat[];
  warnings: string[];
}

export interface PracticeDiagnosticsBundle {
  reports: PracticeDiagnosticsReport[];
  comparisons: PracticeDiagnosticsComparison[];
}

export interface PracticeDiagnosticsComparisonRow {
  label: string;
  scenarioId: PracticeContentScenarioId;
  charsPerText: number;
  wordsPerText: number;
  uniqueWordRatio: number;
  repeatedWordRatio: number;
  topCharShare: number;
  topBigramShare: number;
}

export interface PracticeDiagnosticsComparison {
  label: string;
  layoutId: string;
  languageId: string;
  trainingMode: PracticeTrainingMode;
  contentMode: PracticeContentMode;
  contentPackId?: string;
  rows: PracticeDiagnosticsComparisonRow[];
  highlights: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeDiagnosticToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/(^[^\p{L}\p{N}]+)|([^\p{L}\p{N}]+$)/gu, '');
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

  base.rhythm = focus === 'rhythm'
    ? {
      samples: 24,
      averageInterval: 285,
      averageDeviation: 120,
      weakness: 42,
    }
    : {
      samples: 18,
      averageInterval: 240,
      averageDeviation: 52,
      weakness: 21,
    };

  return { insights: base, weakChar, weakBigram };
}

function resolveContentPack(
  packs: PracticeContentPack[],
  languageId: string,
  packId?: string,
): PracticeContentPack | null {
  return resolvePracticeContentPackSelection({
    contentMode: 'custom',
    currentLanguage: languageId,
    practiceContentPacks: packs,
    selectedContentPackId: packId,
  }).selectedContentPack;
}

function getMinimumAverageWordLength(report: Omit<PracticeDiagnosticsReport, 'warnings'>): number {
  switch (report.scenario.contentMode) {
    case 'syllables':
      return 1.9;
    case 'pseudo-words':
      return report.scenario.trainingMode === 'rhythm' ? 2.1 : 2.4;
    case 'sentences':
      return 3.2;
    case 'custom':
      return report.selectedContentPack?.kind === 'sentences' ? 3.1 : 2.3;
    case 'adaptive-words':
    default:
      return report.scenario.trainingMode === 'rhythm' ? 2.2 : 2.8;
  }
}

function createWarnings(report: Omit<PracticeDiagnosticsReport, 'warnings'>): string[] {
  const warnings: string[] = [];
  const topCharShare = report.topChars[0]?.share ?? 0;
  const topBigramShare = report.topBigrams[0]?.share ?? 0;
  const repeatedWordThreshold = 0.58;
  const uniqueWordThreshold = 0.42;
  const immediateRepeatThreshold = report.scenario.contentMode === 'syllables' ? 0.06 : 0.035;
  const skipDiversityWarnings = report.scenario.contentMode === 'custom';
  const weakCharDominanceThreshold = report.scenario.contentMode === 'pseudo-words'
    ? 24
    : report.scenario.contentMode === 'adaptive-words'
      ? 17.5
      : 19.5;

  if (report.scenario.contentMode === 'custom' && !report.selectedContentPack) {
    warnings.push('Для сценария с наборами не найден подходящий контент-пак: диагностика откатилась к адаптивным словам.');
  }
  if (
    report.simulatedWeakChar
    && report.topChars[0]?.token === report.simulatedWeakChar
    && topCharShare >= weakCharDominanceThreshold
  ) {
    warnings.push(`Слабая буква '${report.simulatedWeakChar}' перетягивает материал слишком сильно (${topCharShare}%). Стоит ослабить фокус, чтобы тренировка не превращалась в спам одного паттерна.`);
  }
  if (topCharShare >= 18) {
    warnings.push(`Сильный перекос по символам: '${report.topChars[0]?.token}' встречается слишком часто (${topCharShare}%).`);
  }
  if (topBigramShare >= 12) {
    warnings.push(`Сильный перекос по биграммам: '${report.topBigrams[0]?.token}' доминирует (${topBigramShare}%).`);
  }
  if (!skipDiversityWarnings && report.averages.uniqueWordRatio <= uniqueWordThreshold) {
    warnings.push(`Низкое разнообразие слов: уникальных слов только ${(report.averages.uniqueWordRatio * 100).toFixed(1)}%.`);
  }
  if (!skipDiversityWarnings && report.averages.repeatedWordRatio >= repeatedWordThreshold) {
    warnings.push(`Слишком много повторов: повторяющихся слов ${(report.averages.repeatedWordRatio * 100).toFixed(1)}%.`);
  }
  if (report.averages.immediateRepeatRatio >= immediateRepeatThreshold) {
    warnings.push(`Слишком много соседних повторов: ${(report.averages.immediateRepeatRatio * 100).toFixed(1)}% слов повторяют соседнее слово.`);
  }
  if (report.averages.wordLength <= getMinimumAverageWordLength(report)) {
    warnings.push(`Средняя длина слов выглядит слишком низкой: ${report.averages.wordLength}.`);
  }
  if (report.averages.nonDictionaryRatio >= 0.7 && report.scenario.contentMode === 'adaptive-words') {
    warnings.push(`Слишком много синтетических слов: ${(report.averages.nonDictionaryRatio * 100).toFixed(1)}% вне словаря.`);
  }
  if (
    report.scenario.contentMode === 'custom'
    && report.selectedContentPack
    && report.selectedContentPack.itemsCount <= 8
  ) {
    warnings.push(`У набора короткий source-пул: всего ${report.selectedContentPack.itemsCount} элементов. Даже хороший сценарий будет быстрее упираться в повторы.`);
  }

  if (warnings.length === 0) {
    warnings.push('Явных перекосов не найдено по выбранным эвристикам.');
  }

  return warnings;
}

export function runPracticeDiagnostics(
  layoutsData: LayoutsData,
  wordsByLanguage: Record<string, string[]>,
  practiceContentPacks: PracticeContentPack[],
  scenarioInput: PracticeDiagnosticsScenario,
): PracticeDiagnosticsReport {
  const resolvedScenarioId = scenarioInput.contentScenarioId
    ?? getPracticeContentScenarioForTrainingMode(scenarioInput.trainingMode).id;
  const resolvedScenario = getPracticeContentScenario(resolvedScenarioId);
  const scenario: Required<PracticeDiagnosticsScenario> = {
    contentMode: 'adaptive-words',
    contentPackId: '',
    contentScenarioId: resolvedScenario.id,
    useYo: false,
    unlockCount: 0,
    smartAdaptationEnabled: true,
    smartAdaptationStrength: 'medium',
    smartAdaptationFocus: 'balanced',
    ...scenarioInput,
    trainingMode: resolvedScenario.trainingMode,
  };

  const layout = layoutsData.layouts[scenario.layoutId];
  if (!layout) {
    throw new Error(`Unknown layout: ${scenario.layoutId}`);
  }

  const words = filterYoWords(wordsByLanguage[layout.lang] ?? [], scenario.useYo);
  const ngramModel: NgramModel = buildNgramModel(words);
  const unlockOrder = filterYoKeys(layout.practiceUnlockOrder ?? [], scenario.useYo);
  const unlockedChars = unlockOrder.slice(0, scenario.unlockCount > 0 ? scenario.unlockCount : unlockOrder.length);
  const dictionaryPool = new Set(
    words
      .filter((word) => [...word].every((char) => unlockedChars.includes(char)))
      .map((word) => word.toLowerCase()),
  );
  const selectedContentPack = scenario.contentMode === 'custom'
    ? resolveContentPack(practiceContentPacks, layout.lang, scenario.contentPackId || undefined)
    : null;

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
  let immediateRepeatedWords = 0;
  let totalWordLength = 0;

  for (let run = 0; run < scenario.runs; run += 1) {
    const text = buildPracticeContentText({
      allWords: words,
      unlockedChars,
      weakChar: synthetic.weakChar,
      contentMode: scenario.contentMode,
      contentPack: selectedContentPack,
      scenarioId: scenario.contentScenarioId,
      ngramModel,
      insights: synthetic.insights,
      buildOptions: {
        trainingMode: scenario.trainingMode,
        smartAdaptationEnabled: scenario.smartAdaptationEnabled,
        smartAdaptationStrength: scenario.smartAdaptationStrength,
        smartAdaptationFocus: scenario.smartAdaptationFocus,
      },
    });

    const tokens = text
      .split(/\s+/)
      .map(normalizeDiagnosticToken)
      .filter(Boolean);
    let previousToken: string | null = null;

    for (const token of tokens) {
      totalWords += 1;
      totalWordLength += token.length;
      totalChars += token.length;

      const previousCount = wordCounts.get(token) ?? 0;
      if (previousCount > 0) repeatedWords += 1;
      wordCounts.set(token, previousCount + 1);
      if (previousToken === token) {
        immediateRepeatedWords += 1;
      }
      previousToken = token;

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
    selectedContentPack: selectedContentPack
      ? {
        id: selectedContentPack.id,
        name: selectedContentPack.name,
        kind: selectedContentPack.kind,
        origin: selectedContentPack.origin,
        itemsCount: selectedContentPack.items.length,
      }
      : null,
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
      immediateRepeatRatio: round(immediateRepeatedWords / Math.max(1, totalWords), 4),
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
  lines.push(
    `Mode: ${report.scenario.trainingMode} | Material: ${report.scenario.contentMode} | Scenario: ${report.scenario.contentScenarioId} | Runs: ${report.scenario.runs} | Unlocked: ${report.unlockedChars.length}`,
  );
  lines.push(`Smart adaptation: ${report.scenario.smartAdaptationEnabled ? 'on' : 'off'} | strength=${report.scenario.smartAdaptationStrength} | focus=${report.scenario.smartAdaptationFocus}`);
  if (report.selectedContentPack) {
    lines.push(`Content pack: ${report.selectedContentPack.name} (${report.selectedContentPack.origin}, ${report.selectedContentPack.kind}, items=${report.selectedContentPack.itemsCount})`);
  }
  if (report.simulatedWeakChar || report.simulatedWeakBigram) {
    lines.push(`Synthetic weak spots: char=${report.simulatedWeakChar ?? '—'}, bigram=${report.simulatedWeakBigram ?? '—'}`);
  }
  lines.push(`Words/text: ${report.averages.wordsPerText} | Avg word length: ${report.averages.wordLength}`);
  lines.push(`Unique ratio: ${(report.averages.uniqueWordRatio * 100).toFixed(1)}% | Non-dictionary: ${(report.averages.nonDictionaryRatio * 100).toFixed(1)}% | Repeats: ${(report.averages.repeatedWordRatio * 100).toFixed(1)}% | Adjacent repeats: ${(report.averages.immediateRepeatRatio * 100).toFixed(1)}%`);
  lines.push(`Top chars: ${report.topChars.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push(`Top bigrams: ${report.topBigrams.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push(`Top words: ${report.topWords.map(item => `${item.token}:${item.share}%`).join(', ') || '—'}`);
  lines.push('Warnings:');
  report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  lines.push('');
  return lines.join('\n');
}

function buildComparisonHighlights(rows: PracticeDiagnosticsComparisonRow[]): string[] {
  if (rows.length <= 1) {
    return ['Недостаточно сценариев для сравнения внутри этой группы.'];
  }

  const highlights: string[] = [];
  const longest = rows.reduce((best, row) => (row.wordsPerText > best.wordsPerText ? row : best), rows[0]!);
  const shortest = rows.reduce((best, row) => (row.wordsPerText < best.wordsPerText ? row : best), rows[0]!);
  const mostDiverse = rows.reduce((best, row) => (row.uniqueWordRatio > best.uniqueWordRatio ? row : best), rows[0]!);
  const mostSkewed = rows.reduce((best, row) => (
    (row.topCharShare + row.topBigramShare) > (best.topCharShare + best.topBigramShare) ? row : best
  ), rows[0]!);

  highlights.push(`Самый длинный сценарий: ${longest.label} (${longest.wordsPerText.toFixed(1)} слов на текст).`);
  highlights.push(`Самый короткий сценарий: ${shortest.label} (${shortest.wordsPerText.toFixed(1)} слов на текст).`);
  highlights.push(`Лучшее разнообразие слов: ${mostDiverse.label} (${(mostDiverse.uniqueWordRatio * 100).toFixed(1)}% уникальных слов).`);
  highlights.push(`Самый сильный перекос: ${mostSkewed.label} (символы ${mostSkewed.topCharShare.toFixed(1)}%, биграммы ${mostSkewed.topBigramShare.toFixed(1)}%).`);

  const practiceRow = rows.find(row => row.scenarioId === 'practice-normal') ?? null;
  const sprintRow = rows.find(row => row.scenarioId === 'sprint') ?? null;
  const survivalRow = rows.find(row => row.scenarioId === 'survival') ?? null;
  const flawlessRow = rows.find(row => row.scenarioId === 'flawless') ?? null;
  const collapsedByWords = longest.wordsPerText - shortest.wordsPerText <= 1.5;
  const collapsedByChars = rows.every(row => Math.abs(row.charsPerText - rows[0]!.charsPerText) <= 8);

  if (collapsedByWords || collapsedByChars) {
    highlights.push('Сценарии почти схлопнулись по длине. Проверьте, не упирается ли материал в слишком грубое масштабирование или короткий source-пул.');
  }
  if (practiceRow && sprintRow && sprintRow.wordsPerText >= practiceRow.wordsPerText * 0.85) {
    highlights.push('Спринт почти не короче обычной практики. Возможно, таймерный режим не ощущается достаточно быстрым и плотным.');
  }
  if (practiceRow && survivalRow && survivalRow.wordsPerText <= practiceRow.wordsPerText * 1.15) {
    highlights.push('Выживание слишком близко по длине к обычной практике. Режиму может не хватать ощущения длинной дистанции.');
  }
  if (practiceRow && flawlessRow && flawlessRow.wordsPerText >= practiceRow.wordsPerText * 0.9) {
    highlights.push('Безошибочный режим почти не отличается по объёму от обычной практики. Можно следить, чтобы риск ощущался заметнее.');
  }
  if (survivalRow && flawlessRow && flawlessRow.topCharShare >= survivalRow.topCharShare + 3) {
    highlights.push('Flawless заметно более перекошен по символам, чем survival. Проверьте, не перегибает ли генерация сложность на отдельных паттернах.');
  }

  return highlights;
}

export function buildPracticeDiagnosticsBundle(reports: PracticeDiagnosticsReport[]): PracticeDiagnosticsBundle {
  const groups = new Map<string, PracticeDiagnosticsReport[]>();

  reports.forEach((report) => {
    const key = [
      report.scenario.layoutId,
      report.languageId,
      report.scenario.trainingMode,
      report.scenario.contentMode,
      report.scenario.contentPackId || 'no-pack',
    ].join('|');
    const existing = groups.get(key) ?? [];
    existing.push(report);
    groups.set(key, existing);
  });

  const comparisons = [...groups.values()].map((groupReports) => {
    const first = groupReports[0]!;
    const rows = groupReports
      .map<PracticeDiagnosticsComparisonRow>((report) => ({
        label: getPracticeContentScenario(report.scenario.contentScenarioId).label,
        scenarioId: report.scenario.contentScenarioId,
        charsPerText: round(report.totals.chars / Math.max(1, report.totals.texts), 1),
        wordsPerText: report.averages.wordsPerText,
        uniqueWordRatio: report.averages.uniqueWordRatio,
        repeatedWordRatio: report.averages.repeatedWordRatio,
        topCharShare: report.topChars[0]?.share ?? 0,
        topBigramShare: report.topBigrams[0]?.share ?? 0,
      }))
      .sort((left, right) => left.wordsPerText - right.wordsPerText);

    return {
      label: `${first.scenario.layoutId} / ${first.scenario.trainingMode} / ${first.scenario.contentMode}${first.scenario.contentPackId ? ` / ${first.scenario.contentPackId}` : ''}`,
      layoutId: first.scenario.layoutId,
      languageId: first.languageId,
      trainingMode: first.scenario.trainingMode,
      contentMode: first.scenario.contentMode,
      contentPackId: first.scenario.contentPackId || undefined,
      rows,
      highlights: buildComparisonHighlights(rows),
    };
  });

  return {
    reports,
    comparisons,
  };
}

export function formatPracticeDiagnosticsBundle(bundle: PracticeDiagnosticsBundle): string {
  const lines: string[] = [];

  bundle.comparisons.forEach((comparison) => {
    lines.push(`=== Сравнение сценариев: ${comparison.label} ===`);
    comparison.rows.forEach((row) => {
      lines.push(
        `${row.label}: words/text=${row.wordsPerText.toFixed(1)} | chars/text=${row.charsPerText.toFixed(1)} | unique=${(row.uniqueWordRatio * 100).toFixed(1)}% | repeats=${(row.repeatedWordRatio * 100).toFixed(1)}% | top-char=${row.topCharShare.toFixed(1)}% | top-bigram=${row.topBigramShare.toFixed(1)}%`,
      );
    });
    lines.push('Highlights:');
    comparison.highlights.forEach((highlight) => lines.push(`- ${highlight}`));
    lines.push('');
  });

  return lines.join('\n');
}
