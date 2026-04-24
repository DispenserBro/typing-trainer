import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';

type SettingsCardProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  headerClassName?: string;
  headerWrapperClassName?: string;
  title: ReactNode;
  titleTag?: 'h3' | 'h4' | 'h5';
};

export function SettingsCard({
  children,
  className,
  description,
  headerClassName,
  headerWrapperClassName,
  title,
  titleTag = 'h4',
}: SettingsCardProps) {
  const rootClassName = ['card settings-card', className].filter(Boolean).join(' ');
  const header = (
    <SectionHeader
      className={headerClassName}
      titleTag={titleTag}
      title={title}
      description={description}
    />
  );

  return (
    <div className={rootClassName}>
      {headerWrapperClassName ? <div className={headerWrapperClassName}>{header}</div> : header}
      {children}
    </div>
  );
}
