import type { TranslationParams } from '../../shared/types';
import { formatLocaleDate } from '../i18n';
import type { ModeFocusSnapshot } from '../motivation/records';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type HomeModeFocusDetailCardModel = {
  id: ModeFocusSnapshot['id'];
  label: string;
  value: string;
  description: string;
  details: string[];
  actionMode: string;
};

function formatModeFocusLastDate(
  value: string | undefined,
  locale: string,
  t: TranslateFn,
) {
  if (!value) return t('home.common.noDate');
  return formatLocaleDate(value, locale, {
    day: '2-digit',
    month: '2-digit',
  }, t('home.common.noDate'));
}

export function buildHomeModeFocusDetailCards({
  formatSpeed,
  locale,
  modeFocusSnapshots,
  speedLabel,
  translate,
}: {
  formatSpeed: (wpm: number) => string;
  locale: string;
  modeFocusSnapshots: ModeFocusSnapshot[];
  speedLabel: string;
  translate: TranslateFn;
}): HomeModeFocusDetailCardModel[] {
  return modeFocusSnapshots.map(snapshot => ({
    id: snapshot.id,
    label: snapshot.title,
    value: snapshot.bestEntry
      ? `${formatSpeed(snapshot.bestEntry.wpm)} ${speedLabel}`
      : translate('home.common.noAttempts'),
    description: snapshot.attempts > 0
      ? translate('home.detail.modeFocus.attempts', {
          count: snapshot.attempts,
          date: formatModeFocusLastDate(snapshot.lastEntry?.date, locale, translate),
        })
      : snapshot.description,
    details: [snapshot.recommendation],
    actionMode: snapshot.actionMode,
  }));
}
