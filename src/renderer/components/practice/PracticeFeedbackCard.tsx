import type { PracticeFeedback } from '../../../core/practice/feedback';
import { useI18n } from '../../contexts/I18nContext';
import { SectionHeader } from '../ui/SectionHeader';

type PracticeFeedbackCardProps = {
  feedback: PracticeFeedback;
};

export function PracticeFeedbackCard({ feedback }: PracticeFeedbackCardProps) {
  const { t } = useI18n();

  return (
    <div className="card practice-feedback-card">
      <div className="practice-feedback-head">
        <SectionHeader
          titleTag="h4"
          title={t('practice.feedback.title')}
          description={t('practice.feedback.description')}
        />
        <span className="practice-feedback-prompt">{t('practice.feedback.prompt')}</span>
      </div>
      <div className="practice-feedback-grid">
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">{t('practice.feedback.weakestChar.label')}</span>
          <strong className="practice-feedback-value mono">
            {feedback.weakestChar?.toUpperCase() ?? '—'}
          </strong>
          <span className="practice-feedback-note">
            {t('practice.feedback.weakestChar.note')}
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">{t('practice.feedback.weakestBigram.label')}</span>
          <strong className="practice-feedback-value mono">
            {feedback.weakestBigram?.toUpperCase() ?? '—'}
          </strong>
          <span className="practice-feedback-note">
            {t('practice.feedback.weakestBigram.note')}
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">{t('practice.feedback.weakestFinger.label')}</span>
          <strong className="practice-feedback-value">
            {feedback.weakestFinger ?? t('practice.feedback.weakestFinger.empty')}
          </strong>
          <span className="practice-feedback-note">
            {t('practice.feedback.weakestFinger.note')}
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">{t('practice.feedback.rhythm.label')}</span>
          <strong className="practice-feedback-value">
            {Math.round(feedback.rhythmScore)}%
          </strong>
          <span className="practice-feedback-note">
            {feedback.rhythmLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

