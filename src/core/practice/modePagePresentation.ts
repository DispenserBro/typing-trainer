import type { TranslationParams } from '../../shared/types';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type PracticeFamilyModeId =
  | 'flawless'
  | 'practice'
  | 'sprint'
  | 'survival';

export type PracticeFamilyModeHeaderViewModel = {
  achievementsLabel: string;
  bestLabel: string | null;
  description: string | null;
  extraDescription: string | null;
  settingsLabel: string | null;
  startLabel: string | null;
  title: string;
};

export function buildPracticeFamilyModeHeaderViewModel(
  mode: PracticeFamilyModeId,
  translate: TranslateFn,
): PracticeFamilyModeHeaderViewModel {
  if (mode === 'practice') {
    return {
      achievementsLabel: translate('practice.achievements'),
      bestLabel: null,
      description: null,
      extraDescription: null,
      settingsLabel: translate('practice.settings.title'),
      startLabel: null,
      title: translate('practice.title'),
    };
  }

  if (mode === 'sprint') {
    return {
      achievementsLabel: translate('sprint.achievements'),
      bestLabel: translate('sprint.best'),
      description: translate('sprint.description'),
      extraDescription: null,
      settingsLabel: null,
      startLabel: translate('sprint.start'),
      title: translate('sprint.title'),
    };
  }

  const isFlawless = mode === 'flawless';

  return {
    achievementsLabel: translate('survival.achievements'),
    bestLabel: translate('survival.best'),
    description: isFlawless
      ? translate('survival.flawlessDescription')
      : translate('survival.description'),
    extraDescription: isFlawless
      ? translate('survival.flawlessToggleDescription')
      : translate('survival.toggleDescription'),
    settingsLabel: null,
    startLabel: translate('survival.start'),
    title: translate('survival.title'),
  };
}
