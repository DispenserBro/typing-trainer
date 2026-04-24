import type { CSSProperties, ReactNode } from 'react';

type SummaryCardProps = {
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  details?: ReactNode[];
  label: ReactNode;
  labelClassName?: string;
  note?: ReactNode;
  noteClassName?: string;
  onClick?: () => void;
  progressClassName?: string;
  progressFillClassName?: string;
  progressPercent?: number;
  value: ReactNode;
  valueClassName?: string;
};

export function SummaryCard({
  className,
  description,
  descriptionClassName,
  details,
  label,
  labelClassName,
  note,
  noteClassName,
  onClick,
  progressClassName = 'ui-summary-card-progress',
  progressFillClassName = 'ui-summary-card-progress-fill',
  progressPercent,
  value,
  valueClassName,
}: SummaryCardProps) {
  const rootClassName = ['card', 'ui-summary-card', className].filter(Boolean).join(' ');
  const content = (
    <>
      <span className={['ui-summary-card-label', labelClassName].filter(Boolean).join(' ')}>
        {label}
      </span>
      <strong className={['ui-summary-card-value', valueClassName].filter(Boolean).join(' ')}>
        {value}
      </strong>
      {typeof progressPercent === 'number' ? (
        <div className={progressClassName}>
          <span style={{ '--progress-percent': `${progressPercent}%` } as CSSProperties} className={progressFillClassName} />
        </div>
      ) : null}
      {description ? <p className={descriptionClassName}>{description}</p> : null}
      {note ? <span className={['ui-summary-card-note', noteClassName].filter(Boolean).join(' ')}>{note}</span> : null}
      {details?.map((detail, index) => (
        <p key={index}>{detail}</p>
      ))}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={rootClassName} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={rootClassName}>{content}</div>;
}
