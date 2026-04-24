import { useMemo } from 'react';
import type { PracticeContentMode } from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';

type UsePracticeContentModeLabelsOptions = {
  customLabel?: 'full' | 'short';
};

export function usePracticeContentModeLabels({
  customLabel = 'full',
}: UsePracticeContentModeLabelsOptions = {}) {
  const { t } = useI18n();

  return useMemo<Record<PracticeContentMode, string>>(() => ({
    'adaptive-words': t('practice.contentModes.adaptive-words'),
    syllables: t('practice.contentModes.syllables'),
    'pseudo-words': t('practice.contentModes.pseudo-words'),
    sentences: t('practice.contentModes.sentences'),
    custom: t(customLabel === 'short' ? 'practice.contentModes.customPackShort' : 'practice.contentModes.custom'),
  }), [customLabel, t]);
}
