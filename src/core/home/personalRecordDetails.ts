import type { TranslationParams } from '../../shared/types';
import {
  describeHomeRecord,
  type HomePersonalRecordCard,
} from '../motivation/records';

type TranslateFn = (key: string, params?: TranslationParams) => string;

export type HomePersonalRecordDetailCardModel = {
  id: string;
  label: string;
  value: string;
  description: string;
  hasRecord: boolean;
};

export function buildHomePersonalRecordDetailCards({
  formatSpeed,
  personalRecordCards,
  speedLabel,
  translate,
}: {
  formatSpeed: (wpm: number) => string;
  personalRecordCards: HomePersonalRecordCard[];
  speedLabel: string;
  translate: TranslateFn;
}): HomePersonalRecordDetailCardModel[] {
  return personalRecordCards.map(card => ({
    id: card.id,
    label: card.title,
    value: card.record
      ? `${formatSpeed(card.record.entry.wpm)} ${speedLabel}`
      : translate('home.common.noData'),
    description: card.record
      ? `${Math.round(card.record.entry.acc)}% · ${describeHomeRecord(card.record, translate)}`
      : card.subtitle,
    hasRecord: Boolean(card.record),
  }));
}
