import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleTag?: 'h3' | 'h4' | 'h5';
};

export function SectionHeader({
  className,
  description,
  title,
  titleTag = 'h3',
}: SectionHeaderProps) {
  const TitleTag = titleTag;

  return (
    <div className={['ui-section-header', className].filter(Boolean).join(' ')}>
      <TitleTag>{title}</TitleTag>
      {description ? <p className="card-desc">{description}</p> : null}
    </div>
  );
}
