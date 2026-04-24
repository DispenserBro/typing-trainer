import type { ReactNode } from 'react';

type ResultCardLayoutProps = {
  children?: ReactNode;
  className?: string;
  headline?: ReactNode;
  headlineClassName?: string;
  summary?: ReactNode;
  summaryAs?: 'div' | 'p';
  summaryClassName?: string;
  title: ReactNode;
};

export function ResultCardLayout({
  children,
  className,
  headline,
  headlineClassName,
  summary,
  summaryAs = 'p',
  summaryClassName,
  title,
}: ResultCardLayoutProps) {
  const rootClassName = ['result-card', className].filter(Boolean).join(' ');
  const resolvedHeadlineClassName = ['result-big', headlineClassName].filter(Boolean).join(' ');
  const SummaryTag = summaryAs;

  return (
    <div className={rootClassName}>
      <h3>{title}</h3>
      {headline ? <div className={resolvedHeadlineClassName}>{headline}</div> : null}
      {summary ? <SummaryTag className={summaryClassName}>{summary}</SummaryTag> : null}
      {children}
    </div>
  );
}
