import type { TranslationParams } from '../../../shared/types';

type TranslateFn = (key: string, options?: TranslationParams) => string;

type ModeResultSummaryLineProps = {
  accuracy: number;
  elapsed: number;
  materialLabel: string;
  materialTitle: string;
  t: TranslateFn;
};

export function ModeResultSummaryLine({
  accuracy,
  elapsed,
  materialLabel,
  materialTitle,
  t,
}: ModeResultSummaryLineProps) {
  return (
    <>
      {t('common.accuracy')}: <b>{Math.round(accuracy)}%</b> ·
      {t('common.time')}: <b>{Math.round(elapsed)} {t('common.secondsShort')}</b> ·
      {materialTitle}: <b>{materialLabel}</b>
    </>
  );
}
