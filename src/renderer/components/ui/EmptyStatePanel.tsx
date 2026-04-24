import type { ReactNode } from 'react';

type EmptyStatePanelProps = {
  className?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function EmptyStatePanel({
  className,
  icon,
  subtitle,
  title,
}: EmptyStatePanelProps) {
  return (
    <div className={['ui-empty-panel', className].filter(Boolean).join(' ')}>
      {icon ? <div className="ui-empty-panel-icon">{icon}</div> : null}
      <p className="ui-empty-panel-title">{title}</p>
      {subtitle ? <p className="ui-empty-panel-subtitle">{subtitle}</p> : null}
    </div>
  );
}
