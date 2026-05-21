import type {
  PracticeContentPack,
  PracticeContentPackQualitySummary,
  PracticeModeRoute,
  PracticeTrainingMode,
  TranslationParams,
} from '../../../shared/types';

type TranslateFn = (key: string, options?: TranslationParams) => string;

type RecommendedModeSnapshot = {
  mode: PracticeModeRoute;
  trainingMode?: PracticeTrainingMode;
};

function resolveRecommendedMode(
  pack: PracticeContentPack,
  summary: PracticeContentPackQualitySummary,
): RecommendedModeSnapshot {
  if (pack.kind === 'sentences') {
    if (summary.itemCount <= 6 || summary.repetitionRisk === 'high') {
      return { mode: 'practice', trainingMode: 'rhythm' };
    }
    if (summary.averageWordsPerItem >= 5.5) {
      return { mode: 'survival' };
    }
    return { mode: 'practice', trainingMode: 'normal' };
  }

  if (pack.kind === 'words') {
    if (summary.itemCount >= 18) {
      return { mode: 'test' };
    }
    if (summary.itemCount <= 10) {
      return { mode: 'flawless' };
    }
    return { mode: 'practice', trainingMode: 'normal' };
  }

  if (summary.repetitionRisk === 'high') {
    return { mode: 'practice', trainingMode: 'normal' };
  }

  if (summary.averageWordsPerItem >= 4.5) {
    return { mode: 'survival' };
  }

  return { mode: 'practice', trainingMode: 'normal' };
}

function getPackRecommendationReasonKey(
  pack: PracticeContentPack,
  summary: PracticeContentPackQualitySummary,
) {
  if (pack.kind === 'sentences') {
    if (summary.itemCount <= 6 || summary.repetitionRisk === 'high') {
      return 'practice.packSummary.reasons.sentencesShortRhythm';
    }
    if (summary.averageWordsPerItem >= 5.5) {
      return 'practice.packSummary.reasons.sentencesLongSurvival';
    }
    return 'practice.packSummary.reasons.sentencesNormalPractice';
  }

  if (pack.kind === 'words') {
    if (summary.itemCount >= 18) {
      return 'practice.packSummary.reasons.wordsSprint';
    }
    if (summary.itemCount <= 10) {
      return 'practice.packSummary.reasons.wordsFlawless';
    }
    return 'practice.packSummary.reasons.wordsNormalPractice';
  }

  if (summary.repetitionRisk === 'high') {
    return 'practice.packSummary.reasons.mixedTightPractice';
  }

  if (summary.averageWordsPerItem >= 4.5) {
    return 'practice.packSummary.reasons.mixedLongSurvival';
  }

  return 'practice.packSummary.reasons.mixedNormalPractice';
}

function getPackFitKey(summary: PracticeContentPackQualitySummary) {
  if (summary.repetitionRisk === 'high') {
    return 'practice.packSummary.fit.tight';
  }
  if (summary.repetitionRisk === 'low') {
    return 'practice.packSummary.fit.comfortable';
  }
  return 'practice.packSummary.fit.workable';
}

export function getPackRepetitionRiskLabel(
  t: TranslateFn,
  repetitionRisk: PracticeContentPackQualitySummary['repetitionRisk'],
) {
  return t(`practice.packSummary.risks.${repetitionRisk}`);
}

export function getPackRecommendedModeLabel(
  t: TranslateFn,
  pack: PracticeContentPack,
  summary: PracticeContentPackQualitySummary,
) {
  const recommended = resolveRecommendedMode(pack, summary);
  if (recommended.mode === 'practice' && recommended.trainingMode === 'rhythm') {
    return t('practice.packSummary.recommended.practiceRhythm');
  }
  if (recommended.mode === 'practice') {
    return t('practice.packSummary.recommended.practiceNormal');
  }
  if (recommended.mode === 'test') {
    return t('practice.packSummary.recommended.sprint');
  }
  if (recommended.mode === 'survival') {
    return t('practice.packSummary.recommended.survival');
  }
  return t('practice.packSummary.recommended.flawless');
}

export function getPackRecommendationReason(
  t: TranslateFn,
  pack: PracticeContentPack,
  summary: PracticeContentPackQualitySummary,
) {
  return t(getPackRecommendationReasonKey(pack, summary));
}

export function getPackFitMessage(
  t: TranslateFn,
  summary: PracticeContentPackQualitySummary,
) {
  return t(getPackFitKey(summary));
}

export function getPackNotes(
  t: TranslateFn,
  pack: PracticeContentPack,
  summary: PracticeContentPackQualitySummary,
) {
  const notes: string[] = [];
  if (summary.itemCount <= 8) {
    notes.push(t('practice.packSummary.notes.shortPool', { count: summary.itemCount }));
  }
  if (pack.kind === 'sentences' && summary.averageWordsPerItem >= 6) {
    notes.push(t('practice.packSummary.notes.longSentences'));
  }
  if (pack.kind !== 'sentences' && summary.averageWordsPerItem <= 1.6) {
    notes.push(t('practice.packSummary.notes.shortItems'));
  }
  return notes;
}

export function getImportedPackPresetLabel(
  t: TranslateFn,
  trainingMode: PracticeTrainingMode,
) {
  return trainingMode === 'rhythm'
    ? t('practice.packSummary.recommended.practiceRhythm')
    : t('practice.packSummary.recommended.practiceNormal');
}

export function localizePackImportError(t: TranslateFn, message: string) {
  const knownErrorKeys = [
    'practice.importErrors.noExercises',
    'practice.importErrors.emptyText',
    'practice.importErrors.noTexts',
  ];
  const knownErrorKey = knownErrorKeys.find(errorKey => message === t(errorKey));
  if (knownErrorKey) return t(knownErrorKey);
  return message;
}
