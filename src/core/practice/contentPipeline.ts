import type {
  CustomPracticePackKind,
  LayoutPracticeInsights,
  PracticeContentMode,
  PracticeContentPack,
  PracticeContentPackPreflightSummary,
  PracticeContentPackQualitySummary,
  PracticeContentPackQuickAction,
  PracticeContentScenario,
  PracticeContentScenarioId,
  PracticeModeRoute,
  PracticeTrainingMode,
} from '../../shared/types';
import type { NgramModel, PracticeBuildOptions } from '../text/ngramUtils';
import { generatePracticeText } from './engine';
import {
  getPracticeContentPackQualityMetrics,
  generateContentPackText,
  generatePseudoWordText,
  generateSentenceText,
  generateSyllableText,
} from './content';

const CONTENT_SCENARIOS: Record<PracticeContentScenarioId, PracticeContentScenario> = {
  'practice-normal': {
    id: 'practice-normal',
    label: 'Обычная практика',
    description: 'Средняя дистанция для регулярной тренировки скорости, точности и спокойной устойчивости.',
    trainingMode: 'normal',
    targetWordCount: 25,
    targetWordCountByContentMode: {
      'adaptive-words': 25,
      syllables: 25,
      'pseudo-words': 24,
      sentences: 26,
      custom: 25,
    },
    targetWordCountByCustomKind: {
      words: 25,
      mixed: 24,
      sentences: 26,
    },
    sentenceLengthRange: {
      min: 4,
      max: 6,
    },
  },
  'practice-rhythm': {
    id: 'practice-rhythm',
    label: 'Ритм-практика',
    description: 'Укороченные серии для ровного темпа и аккуратного контроля ритма.',
    trainingMode: 'rhythm',
    targetWordCount: 18,
    targetWordCountByContentMode: {
      'adaptive-words': 18,
      syllables: 18,
      'pseudo-words': 18,
      sentences: 19,
      custom: 18,
    },
    targetWordCountByCustomKind: {
      words: 18,
      mixed: 18,
      sentences: 19,
    },
    sentenceLengthRange: {
      min: 3,
      max: 5,
    },
  },
  sprint: {
    id: 'sprint',
    label: 'Спринт',
    description: 'Самые короткие и плотные тексты для быстрых таймерных забегов.',
    trainingMode: 'normal',
    targetWordCount: 16,
    targetWordCountByContentMode: {
      'adaptive-words': 16,
      syllables: 16,
      'pseudo-words': 16,
      sentences: 14,
      custom: 16,
    },
    targetWordCountByCustomKind: {
      words: 16,
      mixed: 14,
      sentences: 13,
    },
    sentenceLengthRange: {
      min: 3,
      max: 4,
    },
  },
  survival: {
    id: 'survival',
    label: 'Выживание',
    description: 'Удлинённая дистанция с более длинными сериями для удержания стабильности под нагрузкой.',
    trainingMode: 'normal',
    targetWordCount: 24,
    targetWordCountByContentMode: {
      'adaptive-words': 32,
      syllables: 30,
      'pseudo-words': 30,
      sentences: 34,
      custom: 32,
    },
    targetWordCountByCustomKind: {
      words: 30,
      mixed: 32,
      sentences: 36,
    },
    sentenceLengthRange: {
      min: 5,
      max: 8,
    },
  },
  flawless: {
    id: 'flawless',
    label: 'Безошибочный режим',
    description: 'Более компактные и чистые серии, где важнее точность, чем дистанция.',
    trainingMode: 'normal',
    targetWordCount: 18,
    targetWordCountByContentMode: {
      'adaptive-words': 14,
      syllables: 16,
      'pseudo-words': 15,
      sentences: 15,
      custom: 15,
    },
    targetWordCountByCustomKind: {
      words: 15,
      mixed: 15,
      sentences: 14,
    },
    sentenceLengthRange: {
      min: 3,
      max: 5,
    },
  },
};

type PackModeRecommendation = {
  targetMode: PracticeModeRoute;
  trainingMode?: PracticeTrainingMode;
  sprintDurationSeconds?: number;
  label: string;
  reason: string;
};

export interface BuildPracticeContentTextInput {
  allWords: string[];
  unlockedChars: string[];
  weakChar: string | null;
  contentMode: PracticeContentMode;
  contentPack?: PracticeContentPack | null;
  scenarioId?: PracticeContentScenarioId;
  wordCountOverride?: number;
  ngramModel?: NgramModel;
  insights?: LayoutPracticeInsights | null;
  buildOptions?: PracticeBuildOptions;
}

export function getPracticeContentScenario(id: PracticeContentScenarioId): PracticeContentScenario {
  return CONTENT_SCENARIOS[id];
}

export function getPracticeContentScenarioForTrainingMode(
  trainingMode: PracticeTrainingMode,
): PracticeContentScenario {
  return trainingMode === 'rhythm'
    ? CONTENT_SCENARIOS['practice-rhythm']
    : CONTENT_SCENARIOS['practice-normal'];
}

function resolveScenarioCustomPackKind(contentMode: PracticeContentMode, contentPack?: PracticeContentPack | null) {
  if (contentMode !== 'custom' || !contentPack) return null;
  return contentPack.kind as CustomPracticePackKind;
}

function createSwitchModeAction(
  id: string,
  label: string,
  description: string,
  targetMode: PracticeModeRoute,
  options: {
    trainingMode?: PracticeTrainingMode;
    sprintDurationSeconds?: number;
  } = {},
): PracticeContentPackQuickAction {
  return {
    id,
    label,
    description,
    action: {
      kind: 'switch-mode',
      targetMode,
      trainingMode: options.trainingMode,
      sprintDurationSeconds: options.sprintDurationSeconds,
    },
  };
}

function createUseBaseMaterialAction(
  id: string,
  label: string,
  description: string,
  targetMode: PracticeModeRoute,
  options: {
    trainingMode?: PracticeTrainingMode;
    sprintDurationSeconds?: number;
  } = {},
): PracticeContentPackQuickAction {
  return {
    id,
    label,
    description,
    action: {
      kind: 'use-base-material',
      targetMode,
      trainingMode: options.trainingMode,
      sprintDurationSeconds: options.sprintDurationSeconds,
    },
  };
}

function isScenarioAlignedWithRecommendation(
  scenarioId: PracticeContentScenarioId,
  recommendation: PackModeRecommendation,
) {
  if (recommendation.targetMode === 'practice') {
    return scenarioId === (recommendation.trainingMode === 'rhythm' ? 'practice-rhythm' : 'practice-normal');
  }
  if (recommendation.targetMode === 'test') return scenarioId === 'sprint';
  if (recommendation.targetMode === 'survival') return scenarioId === 'survival';
  return scenarioId === 'flawless';
}

function resolvePackModeRecommendation(
  pack: PracticeContentPack,
  summary: Pick<PracticeContentPackQualitySummary, 'averageWordsPerItem' | 'repetitionRisk'>,
  itemCount: number,
): PackModeRecommendation {
  if (pack.kind === 'sentences') {
    if (itemCount <= 6 || summary.repetitionRisk === 'high') {
      return {
        targetMode: 'practice',
        trainingMode: 'rhythm',
        label: 'Ритм-практика',
        reason: 'Короткий набор предложений безопаснее запускать в укороченной спокойной сессии, чем растягивать в длинный сценарий.',
      };
    }
    if (summary.averageWordsPerItem >= 5.5) {
      return {
        targetMode: 'survival',
        label: 'Выживание',
        reason: 'Длинные фразы и большой объём текста лучше раскрываются на длинной устойчивой дистанции.',
      };
    }
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      label: 'Обычная практика',
      reason: 'Связный текст без экстремальной длины удобнее всего держать в средней регулярной тренировке.',
    };
  }

  if (pack.kind === 'words') {
    if (itemCount >= 18) {
      return {
        targetMode: 'test',
        sprintDurationSeconds: 30,
        label: 'Спринт',
        reason: 'Плотный словарь хорошо работает в коротком таймерном режиме, где важен чистый темповый срез.',
      };
    }
    if (itemCount <= 10) {
      return {
        targetMode: 'flawless',
        label: 'Безошибочный режим',
        reason: 'Небольшой словарь лучше проявляет себя в компактном режиме на контроль точности без длинной дистанции.',
      };
    }
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      label: 'Обычная практика',
      reason: 'Средний словарь лучше всего работает как универсальная регулярная тренировка.',
    };
  }

  if (summary.repetitionRisk === 'high') {
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      label: 'Обычная практика',
      reason: 'Короткий mixed-пул не стоит тянуть в жёсткие или длинные сценарии; ему нужна спокойная средняя дистанция.',
    };
  }

  if (summary.averageWordsPerItem >= 4.5) {
    return {
      targetMode: 'survival',
      label: 'Выживание',
      reason: 'Mixed-контент с длинными фрагментами лучше раскрывается в длинном устойчивом проходе.',
    };
  }

  return {
    targetMode: 'practice',
    trainingMode: 'normal',
    label: 'Обычная практика',
    reason: 'Смешанный набор без сильного перекоса удобнее всего держать в обычной практике.',
  };
}

export function resolvePracticeContentTargetWordCount(
  scenario: PracticeContentScenario,
  contentMode: PracticeContentMode,
  contentPack?: PracticeContentPack | null,
): number {
  const customPackKind = resolveScenarioCustomPackKind(contentMode, contentPack);
  const customKindTarget = customPackKind
    ? scenario.targetWordCountByCustomKind?.[customPackKind]
    : undefined;
  const contentModeTarget = scenario.targetWordCountByContentMode?.[contentMode];
  return Math.max(1, Math.round(customKindTarget ?? contentModeTarget ?? scenario.targetWordCount));
}

export function buildPracticeContentPackQualitySummary(
  pack: PracticeContentPack,
  scenarioId: PracticeContentScenarioId,
): PracticeContentPackQualitySummary {
  const scenario = getPracticeContentScenario(scenarioId);
  const targetWordCount = resolvePracticeContentTargetWordCount(scenario, 'custom', pack);
  const metrics = getPracticeContentPackQualityMetrics(pack, targetWordCount);
  const repetitionRisk = metrics.itemCount <= 5 || metrics.repetitionPressure >= 1.75
    ? 'high'
    : metrics.itemCount <= 10 || metrics.repetitionPressure >= 0.95
      ? 'medium'
      : 'low';
  const repetitionRiskLabel = repetitionRisk === 'high'
    ? 'Высокий'
    : repetitionRisk === 'medium'
      ? 'Средний'
      : 'Низкий';

  const recommendation = resolvePackModeRecommendation(pack, {
    averageWordsPerItem: metrics.averageWordsPerItem,
    repetitionRisk,
  }, metrics.itemCount);

  const notes: string[] = [];
  if (metrics.itemCount <= 8) {
    notes.push(`Короткий пул: всего ${metrics.itemCount} элементов, поэтому длинные сценарии быстрее упрутся в повторы.`);
  }
  if (pack.kind === 'sentences' && metrics.averageWordsPerItem >= 6) {
    notes.push('Фразы сами по себе длинные, поэтому даже короткий сценарий будет ощущаться объёмнее обычного.');
  }
  if (pack.kind !== 'sentences' && metrics.averageWordsPerItem <= 1.6) {
    notes.push('Элементы очень короткие, поэтому набор особенно хорошо подходит для разогрева и контроля точности.');
  }

  const fitMessage = repetitionRisk === 'high' && (scenarioId === 'survival' || scenarioId === 'practice-normal')
    ? `Для ${scenario.label.toLowerCase()} этот набор уже на старте выглядит тесным по пулу.`
    : repetitionRisk === 'low'
      ? `Для ${scenario.label.toLowerCase()} набор выглядит комфортным по объёму и риску повторов.`
      : `Для ${scenario.label.toLowerCase()} набор рабочий, но в длинных проходах повторы будут заметнее.`;

  return {
    itemCount: metrics.itemCount,
    averageWordsPerItem: Math.round(metrics.averageWordsPerItem * 10) / 10,
    estimatedItemsPerText: metrics.estimatedItemsPerText,
    estimatedWordsPerText: metrics.estimatedWordsPerText,
    repetitionRisk,
    repetitionRiskLabel,
    recommendedModeLabel: recommendation.label,
    recommendationReason: recommendation.reason,
    fitMessage,
    notes,
  };
}

export function buildPracticeContentPackPreflightSummary(
  pack: PracticeContentPack,
  scenarioId: PracticeContentScenarioId,
): PracticeContentPackPreflightSummary | null {
  const summary = buildPracticeContentPackQualitySummary(pack, scenarioId);
  const recommendation = resolvePackModeRecommendation(pack, {
    averageWordsPerItem: summary.averageWordsPerItem,
    repetitionRisk: summary.repetitionRisk,
  }, summary.itemCount);

  if (scenarioId === 'survival' && summary.repetitionRisk !== 'low') {
    return {
      severity: 'warning',
      title: 'Этот набор коротковат для выживания',
      detail: 'Длинная дистанция быстро упрётся в повторы или тяжёлые фразы. Лучше сократить сценарий или вернуть базовый материал для чистого survival-забега.',
      actions: [
        createSwitchModeAction(
          'survival-practice',
          'Перейти в практику',
          'Оставить текущий набор, но вернуться в более спокойную среднюю дистанцию.',
          'practice',
          { trainingMode: 'normal' },
        ),
        createSwitchModeAction(
          'survival-recommended',
          `Открыть ${recommendation.label}`,
          recommendation.reason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'survival-base',
          'Вернуть базовый материал',
          'Оставить режим выживания, но убрать короткий pack и вернуться к обычному адаптивному материалу.',
          'survival',
        ),
      ],
    };
  }

  if (scenarioId === 'practice-normal' && summary.repetitionRisk === 'high') {
    return {
      severity: 'warning',
      title: 'Для обычной практики набор тесноват',
      detail: 'Средняя дистанция быстро начнёт повторять элементы. Полезнее сократить сессию или перевести pack в более подходящий режим одним кликом.',
      actions: [
        {
          id: 'practice-shorten',
          label: 'Сократить дистанцию',
          description: 'Переключить практику на ритм-режим и оставить текущий набор.',
          action: { kind: 'shorten-distance' },
        },
        createSwitchModeAction(
          'practice-recommended',
          `Открыть ${recommendation.label}`,
          recommendation.reason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'practice-base',
          'Вернуть базовый материал',
          'Снять кастомный pack и вернуться к стандартной адаптивной практике.',
          'practice',
          { trainingMode: 'normal' },
        ),
      ],
    };
  }

  if (scenarioId === 'sprint' && pack.kind === 'sentences' && (summary.averageWordsPerItem >= 5 || summary.repetitionRisk !== 'low')) {
    return {
      severity: 'warning',
      title: 'Спринт получается слишком тяжёлым для фраз',
      detail: 'Длинные предложения под таймером создают лишнюю нагрузку и ломают чистый темповый сигнал. Либо укоротите забег, либо уйдите в более подходящий сценарий.',
      actions: [
        {
          id: 'sprint-shorten',
          label: 'Сделать спринт короче',
          description: 'Оставить pack, но быстро сбросить таймер к самой короткой дистанции.',
          action: { kind: 'shorten-distance' },
        },
        createSwitchModeAction(
          'sprint-practice',
          'Перейти в ритм-практику',
          'Для фраз такой набор лучше раскрывается в укороченной спокойной практике без жёсткого таймера.',
          'practice',
          { trainingMode: 'rhythm' },
        ),
        createUseBaseMaterialAction(
          'sprint-base',
          'Оставить спринт, но взять базу',
          'Сохранить таймерный режим и вернуть стандартный материал вместо тяжёлого sentence-pack.',
          'test',
          { sprintDurationSeconds: 15 },
        ),
      ],
    };
  }

  if (scenarioId === 'flawless' && pack.kind === 'mixed' && summary.repetitionRisk !== 'low') {
    return {
      severity: 'warning',
      title: 'Mixed-набор слишком шумный для flawless',
      detail: 'Смешанный и короткий pack делает безошибочный режим жёстче, чем нужно. Лучше сначала выровнять материал или уйти в обычную практику.',
      actions: [
        createSwitchModeAction(
          'flawless-practice',
          'Перейти в обычную практику',
          'Оставить текущий pack, но перенести его в более мягкий сценарий без мгновенного провала.',
          'practice',
          { trainingMode: 'normal' },
        ),
        createSwitchModeAction(
          'flawless-recommended',
          `Открыть ${recommendation.label}`,
          recommendation.reason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'flawless-base',
          'Оставить flawless, но взять базу',
          'Сохранить безошибочный режим и вернуть стандартный материал без смешанного короткого пула.',
          'flawless',
        ),
      ],
    };
  }

  if (!isScenarioAlignedWithRecommendation(scenarioId, recommendation)) {
    return {
      severity: 'info',
      title: `У набора есть более естественный сценарий: ${recommendation.label}`,
      detail: recommendation.reason,
      actions: [
        createSwitchModeAction(
          'info-recommended',
          `Переключить на ${recommendation.label}`,
          'Применить рекомендованный сценарий и оставить текущий pack активным.',
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
      ],
    };
  }

  return null;
}

export function resolveImportedPracticePackPreset(pack: PracticeContentPack): {
  trainingMode: PracticeTrainingMode;
  label: string;
  reason: string;
} {
  const summary = buildPracticeContentPackQualitySummary(pack, 'practice-normal');
  const recommendation = resolvePackModeRecommendation(pack, {
    averageWordsPerItem: summary.averageWordsPerItem,
    repetitionRisk: summary.repetitionRisk,
  }, summary.itemCount);

  if (recommendation.targetMode === 'practice' && recommendation.trainingMode === 'rhythm') {
    return {
      trainingMode: 'rhythm',
      label: 'Ритм-практика',
      reason: 'Набор сразу поставлен в более короткую практику, чтобы старт был рабочим даже при небольшом пуле.',
    };
  }

  if (recommendation.targetMode === 'survival') {
    return {
      trainingMode: 'normal',
      label: 'Обычная практика',
      reason: 'Импорт оставлен на средней дистанции: так набор сначала проверяется в базовом режиме, а потом уже переносится в длинный survival.',
    };
  }

  if (recommendation.targetMode === 'test' || recommendation.targetMode === 'flawless') {
    return {
      trainingMode: 'rhythm',
      label: 'Ритм-практика',
      reason: 'Для первого старта набор сокращён до спокойной короткой практики, чтобы не перегружать пользователя жёстким сценарием сразу после импорта.',
    };
  }

  return {
    trainingMode: 'normal',
    label: 'Обычная практика',
    reason: 'Набор уже выглядит достаточно устойчивым для стандартной практики, поэтому дополнительный short-preset не нужен.',
  };
}

export function buildPracticeContentText({
  allWords,
  unlockedChars,
  weakChar,
  contentMode,
  contentPack,
  scenarioId,
  wordCountOverride,
  ngramModel,
  insights,
  buildOptions,
}: BuildPracticeContentTextInput): string {
  const scenario = scenarioId
    ? getPracticeContentScenario(scenarioId)
    : getPracticeContentScenarioForTrainingMode(buildOptions?.trainingMode ?? 'normal');
  const effectiveContentMode: PracticeContentMode =
    contentMode === 'custom' && !contentPack ? 'adaptive-words' : contentMode;
  const count = Math.max(
    1,
    Math.round(
      wordCountOverride
      ?? resolvePracticeContentTargetWordCount(scenario, effectiveContentMode, contentPack),
    ),
  );
  const nextBuildOptions: PracticeBuildOptions = {
    ...buildOptions,
    trainingMode: scenario.trainingMode,
  };

  switch (effectiveContentMode) {
    case 'syllables':
      return generateSyllableText(unlockedChars, count);
    case 'pseudo-words':
      return generatePseudoWordText(unlockedChars, count, weakChar, ngramModel);
    case 'sentences':
      return generateSentenceText(
        allWords,
        unlockedChars,
        count,
        weakChar,
        ngramModel,
        insights,
        nextBuildOptions,
        scenario.sentenceLengthRange,
      );
    case 'custom':
      return contentPack
        ? generateContentPackText(contentPack, count, unlockedChars)
        : generatePracticeText(
          allWords,
          unlockedChars,
          weakChar,
          count,
          ngramModel,
          insights,
          nextBuildOptions,
        );
    case 'adaptive-words':
    default:
      return generatePracticeText(
        allWords,
        unlockedChars,
        weakChar,
        count,
        ngramModel,
        insights,
        nextBuildOptions,
      );
  }
}
