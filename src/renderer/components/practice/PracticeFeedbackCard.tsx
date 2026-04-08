import type { PracticeFeedback } from '../../../core/practice/feedback';

type PracticeFeedbackCardProps = {
  feedback: PracticeFeedback;
};

export function PracticeFeedbackCard({ feedback }: PracticeFeedbackCardProps) {
  return (
    <div className="card practice-feedback-card">
      <div className="practice-feedback-head">
        <div>
          <h4>Разбор практики</h4>
          <p className="card-desc">
            Система отметила текущие слабые места по накопленной аналитике.
          </p>
        </div>
        <span className="practice-feedback-prompt">Нажмите любую клавишу для новой попытки</span>
      </div>
      <div className="practice-feedback-grid">
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">Худшая буква</span>
          <strong className="practice-feedback-value mono">
            {feedback.weakestChar?.toUpperCase() ?? '—'}
          </strong>
          <span className="practice-feedback-note">
            Ее стоит чаще закреплять в обычных подходах.
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">Худшее сочетание</span>
          <strong className="practice-feedback-value mono">
            {feedback.weakestBigram?.toUpperCase() ?? '—'}
          </strong>
          <span className="practice-feedback-note">
            Здесь чаще всего теряется темп при переходе между буквами.
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">Проблемный палец</span>
          <strong className="practice-feedback-value">
            {feedback.weakestFinger ?? 'Пока не определен'}
          </strong>
          <span className="practice-feedback-note">
            Полезно следить за расслаблением и точной посадкой руки.
          </span>
        </div>
        <div className="practice-feedback-item">
          <span className="practice-feedback-label">Оценка ритма</span>
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

