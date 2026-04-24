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
  TranslationParams,
} from '../../shared/types';
import type { NgramModel, PracticeBuildOptions } from '../text/ngramUtils';
import { i18n } from '../i18n';
import { generatePracticeText } from './engine';
import {
  getPracticeContentPackQualityMetrics,
  generateContentPackText,
  generatePseudoWordText,
  generateSentenceText,
  generateSyllableText,
} from './content';

type TranslateFn = (key: string, params?: TranslationParams) => string;

type PracticeContentScenarioDefinition = Omit<PracticeContentScenario, 'label' | 'description'>;

const translateWithI18n: TranslateFn = (key, params) =>
  i18n.t(key, params ?? {}) as string;

const CONTENT_SCENARIOS: Record<PracticeContentScenarioId, PracticeContentScenarioDefinition> = {
  'practice-normal': {
    id: 'practice-normal',
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

const CONTENT_SCENARIO_DESCRIPTION_KEYS: Record<PracticeContentScenarioId, string> = {
  'practice-normal': 'practice.scenarios.practice-normal.description',
  'practice-rhythm': 'practice.scenarios.practice-rhythm.description',
  sprint: 'practice.scenarios.sprint.description',
  survival: 'practice.scenarios.survival.description',
  flawless: 'practice.scenarios.flawless.description',
};

type PackModeRecommendation = {
  targetMode: PracticeModeRoute;
  trainingMode?: PracticeTrainingMode;
  sprintDurationSeconds?: number;
  labelKey: string;
  reasonKey: string;
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

function getRecommendedModeLabel(t: TranslateFn, recommendation: PackModeRecommendation) {
  return t(recommendation.labelKey);
}

function getRecommendedModeReason(t: TranslateFn, recommendation: PackModeRecommendation) {
  return t(recommendation.reasonKey);
}

function getPackFitMessage(
  t: TranslateFn,
  repetitionRisk: PracticeContentPackQualitySummary['repetitionRisk'],
) {
  if (repetitionRisk === 'high') {
    return t('practice.packSummary.fit.tight');
  }
  if (repetitionRisk === 'low') {
    return t('practice.packSummary.fit.comfortable');
  }
  return t('practice.packSummary.fit.workable');
}

function localizeScenario(
  scenario: PracticeContentScenarioDefinition,
  t: TranslateFn,
): PracticeContentScenario {
  return {
    ...scenario,
    label: t(resolveScenarioModeLabelKey(scenario.id)),
    description: t(CONTENT_SCENARIO_DESCRIPTION_KEYS[scenario.id]),
  };
}

export function getPracticeContentScenario(
  id: PracticeContentScenarioId,
  t: TranslateFn = translateWithI18n,
): PracticeContentScenario {
  const scenario = CONTENT_SCENARIOS[id];
  return localizeScenario(scenario, t);
}

export function getPracticeContentScenarioForTrainingMode(
  trainingMode: PracticeTrainingMode,
  t: TranslateFn = translateWithI18n,
): PracticeContentScenario {
  return trainingMode === 'rhythm'
    ? getPracticeContentScenario('practice-rhythm', t)
    : getPracticeContentScenario('practice-normal', t);
}

function resolveScenarioModeLabelKey(id: PracticeContentScenarioId) {
  switch (id) {
    case 'practice-normal':
      return 'practice.packSummary.recommended.practiceNormal';
    case 'practice-rhythm':
      return 'practice.packSummary.recommended.practiceRhythm';
    case 'sprint':
      return 'practice.packSummary.recommended.sprint';
    case 'survival':
      return 'practice.packSummary.recommended.survival';
    case 'flawless':
    default:
      return 'practice.packSummary.recommended.flawless';
  }
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
        labelKey: 'practice.packSummary.recommended.practiceRhythm',
        reasonKey: 'practice.packSummary.reasons.sentencesShortRhythm',
      };
    }
    if (summary.averageWordsPerItem >= 5.5) {
      return {
        targetMode: 'survival',
        labelKey: 'practice.packSummary.recommended.survival',
        reasonKey: 'practice.packSummary.reasons.sentencesLongSurvival',
      };
    }
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      labelKey: 'practice.packSummary.recommended.practiceNormal',
      reasonKey: 'practice.packSummary.reasons.sentencesNormalPractice',
    };
  }

  if (pack.kind === 'words') {
    if (itemCount >= 18) {
      return {
        targetMode: 'test',
        sprintDurationSeconds: 30,
        labelKey: 'practice.packSummary.recommended.sprint',
        reasonKey: 'practice.packSummary.reasons.wordsSprint',
      };
    }
    if (itemCount <= 10) {
      return {
        targetMode: 'flawless',
        labelKey: 'practice.packSummary.recommended.flawless',
        reasonKey: 'practice.packSummary.reasons.wordsFlawless',
      };
    }
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      labelKey: 'practice.packSummary.recommended.practiceNormal',
      reasonKey: 'practice.packSummary.reasons.wordsNormalPractice',
    };
  }

  if (summary.repetitionRisk === 'high') {
    return {
      targetMode: 'practice',
      trainingMode: 'normal',
      labelKey: 'practice.packSummary.recommended.practiceNormal',
      reasonKey: 'practice.packSummary.reasons.mixedTightPractice',
    };
  }

  if (summary.averageWordsPerItem >= 4.5) {
    return {
      targetMode: 'survival',
      labelKey: 'practice.packSummary.recommended.survival',
      reasonKey: 'practice.packSummary.reasons.mixedLongSurvival',
    };
  }

  return {
    targetMode: 'practice',
    trainingMode: 'normal',
    labelKey: 'practice.packSummary.recommended.practiceNormal',
    reasonKey: 'practice.packSummary.reasons.mixedNormalPractice',
  };
}

function resolvePackModeRecommendationFromSummary(
  pack: PracticeContentPack,
  summary: Pick<PracticeContentPackQualitySummary, 'averageWordsPerItem' | 'itemCount' | 'repetitionRisk'>,
) {
  return resolvePackModeRecommendation(pack, {
    averageWordsPerItem: summary.averageWordsPerItem,
    repetitionRisk: summary.repetitionRisk,
  }, summary.itemCount);
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
  t: TranslateFn,
): PracticeContentPackQualitySummary {
  const scenario = getPracticeContentScenario(scenarioId, t);
  const targetWordCount = resolvePracticeContentTargetWordCount(scenario, 'custom', pack);
  const metrics = getPracticeContentPackQualityMetrics(pack, targetWordCount);
  const repetitionRisk = metrics.itemCount <= 5 || metrics.repetitionPressure >= 1.75
    ? 'high'
    : metrics.itemCount <= 10 || metrics.repetitionPressure >= 0.95
      ? 'medium'
      : 'low';
  const repetitionRiskLabel = t(`practice.packSummary.risks.${repetitionRisk}`);

  const recommendation = resolvePackModeRecommendation(pack, {
    averageWordsPerItem: metrics.averageWordsPerItem,
    repetitionRisk,
  }, metrics.itemCount);

  const notes: string[] = [];
  if (metrics.itemCount <= 8) {
    notes.push(t('practice.packSummary.notes.shortPool', { count: metrics.itemCount }));
  }
  if (pack.kind === 'sentences' && metrics.averageWordsPerItem >= 6) {
    notes.push(t('practice.packSummary.notes.longSentences'));
  }
  if (pack.kind !== 'sentences' && metrics.averageWordsPerItem <= 1.6) {
    notes.push(t('practice.packSummary.notes.shortItems'));
  }

  return {
    itemCount: metrics.itemCount,
    averageWordsPerItem: Math.round(metrics.averageWordsPerItem * 10) / 10,
    estimatedItemsPerText: metrics.estimatedItemsPerText,
    estimatedWordsPerText: metrics.estimatedWordsPerText,
    repetitionRisk,
    repetitionRiskLabel,
    recommendedModeLabel: getRecommendedModeLabel(t, recommendation),
    recommendationReason: getRecommendedModeReason(t, recommendation),
    fitMessage: getPackFitMessage(t, repetitionRisk),
    notes,
  };
}

export function buildPracticeContentPackPreflightSummary(
  pack: PracticeContentPack,
  scenarioId: PracticeContentScenarioId,
  t: TranslateFn,
): PracticeContentPackPreflightSummary | null {
  const summary = buildPracticeContentPackQualitySummary(pack, scenarioId, t);
  const recommendation = resolvePackModeRecommendationFromSummary(pack, summary);
  const recommendedModeLabel = getRecommendedModeLabel(t, recommendation);
  const recommendedModeReason = getRecommendedModeReason(t, recommendation);

  if (scenarioId === 'survival' && summary.repetitionRisk !== 'low') {
    return {
      severity: 'warning',
      title: t('practice.packPreflight.survival.title'),
      detail: t('practice.packPreflight.survival.detail'),
      actions: [
        createSwitchModeAction(
          'survival-practice',
          t('practice.packPreflight.survival.actions.practice.label'),
          t('practice.packPreflight.survival.actions.practice.description'),
          'practice',
          { trainingMode: 'normal' },
        ),
        createSwitchModeAction(
          'survival-recommended',
          t('practice.packPreflight.actions.openMode', { mode: recommendedModeLabel }),
          recommendedModeReason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'survival-base',
          t('practice.packPreflight.survival.actions.base.label'),
          t('practice.packPreflight.survival.actions.base.description'),
          'survival',
        ),
      ],
    };
  }

  if (scenarioId === 'practice-normal' && summary.repetitionRisk === 'high') {
    return {
      severity: 'warning',
      title: t('practice.packPreflight.practice.title'),
      detail: t('practice.packPreflight.practice.detail'),
      actions: [
        {
          id: 'practice-shorten',
          label: t('practice.packPreflight.practice.actions.shorten.label'),
          description: t('practice.packPreflight.practice.actions.shorten.description'),
          action: { kind: 'shorten-distance' },
        },
        createSwitchModeAction(
          'practice-recommended',
          t('practice.packPreflight.actions.openMode', { mode: recommendedModeLabel }),
          recommendedModeReason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'practice-base',
          t('practice.packPreflight.practice.actions.base.label'),
          t('practice.packPreflight.practice.actions.base.description'),
          'practice',
          { trainingMode: 'normal' },
        ),
      ],
    };
  }

  if (scenarioId === 'sprint' && pack.kind === 'sentences' && (summary.averageWordsPerItem >= 5 || summary.repetitionRisk !== 'low')) {
    return {
      severity: 'warning',
      title: t('practice.packPreflight.sprint.title'),
      detail: t('practice.packPreflight.sprint.detail'),
      actions: [
        {
          id: 'sprint-shorten',
          label: t('practice.packPreflight.sprint.actions.shorten.label'),
          description: t('practice.packPreflight.sprint.actions.shorten.description'),
          action: { kind: 'shorten-distance' },
        },
        createSwitchModeAction(
          'sprint-practice',
          t('practice.packPreflight.sprint.actions.rhythm.label'),
          t('practice.packPreflight.sprint.actions.rhythm.description'),
          'practice',
          { trainingMode: 'rhythm' },
        ),
        createUseBaseMaterialAction(
          'sprint-base',
          t('practice.packPreflight.sprint.actions.base.label'),
          t('practice.packPreflight.sprint.actions.base.description'),
          'test',
          { sprintDurationSeconds: 15 },
        ),
      ],
    };
  }

  if (scenarioId === 'flawless' && pack.kind === 'mixed' && summary.repetitionRisk !== 'low') {
    return {
      severity: 'warning',
      title: t('practice.packPreflight.flawless.title'),
      detail: t('practice.packPreflight.flawless.detail'),
      actions: [
        createSwitchModeAction(
          'flawless-practice',
          t('practice.packPreflight.flawless.actions.practice.label'),
          t('practice.packPreflight.flawless.actions.practice.description'),
          'practice',
          { trainingMode: 'normal' },
        ),
        createSwitchModeAction(
          'flawless-recommended',
          t('practice.packPreflight.actions.openMode', { mode: recommendedModeLabel }),
          recommendedModeReason,
          recommendation.targetMode,
          {
            trainingMode: recommendation.trainingMode,
            sprintDurationSeconds: recommendation.sprintDurationSeconds,
          },
        ),
        createUseBaseMaterialAction(
          'flawless-base',
          t('practice.packPreflight.flawless.actions.base.label'),
          t('practice.packPreflight.flawless.actions.base.description'),
          'flawless',
        ),
      ],
    };
  }

  if (!isScenarioAlignedWithRecommendation(scenarioId, recommendation)) {
    return {
      severity: 'info',
      title: t('practice.packPreflight.info.title', { mode: recommendedModeLabel }),
      detail: recommendedModeReason,
      actions: [
        createSwitchModeAction(
          'info-recommended',
          t('practice.packPreflight.info.actions.switch.label', { mode: recommendedModeLabel }),
          t('practice.packPreflight.info.actions.switch.description'),
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

export function resolveImportedPracticePackPreset(
  pack: PracticeContentPack,
  t: TranslateFn,
): {
  trainingMode: PracticeTrainingMode;
  label: string;
  reason: string;
} {
  const summary = buildPracticeContentPackQualitySummary(pack, 'practice-normal', t);
  const recommendation = resolvePackModeRecommendationFromSummary(pack, summary);

  if (recommendation.targetMode === 'practice' && recommendation.trainingMode === 'rhythm') {
    return {
      trainingMode: 'rhythm',
      label: t('practice.packSummary.recommended.practiceRhythm'),
      reason: t('practice.importPreset.reasons.rhythmShort'),
    };
  }

  if (recommendation.targetMode === 'survival') {
    return {
      trainingMode: 'normal',
      label: t('practice.packSummary.recommended.practiceNormal'),
      reason: t('practice.importPreset.reasons.normalForSurvival'),
    };
  }

  if (recommendation.targetMode === 'test' || recommendation.targetMode === 'flawless') {
    return {
      trainingMode: 'rhythm',
      label: t('practice.packSummary.recommended.practiceRhythm'),
      reason: t('practice.importPreset.reasons.rhythmAfterStrict'),
    };
  }

  return {
    trainingMode: 'normal',
    label: t('practice.packSummary.recommended.practiceNormal'),
    reason: t('practice.importPreset.reasons.normalStable'),
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
