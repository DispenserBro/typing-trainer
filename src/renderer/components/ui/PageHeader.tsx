import type { ReactNode } from 'react';

type PageHeaderProps = {
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
  description?: ReactNode;
  extraDescription?: ReactNode;
  inlineActions?: ReactNode;
  title: ReactNode;
  titleBlockClassName?: string;
  titleRowClassName?: string;
};

export function PageHeader({
  actions,
  actionsClassName,
  className,
  description,
  extraDescription,
  inlineActions,
  title,
  titleBlockClassName,
  titleRowClassName,
}: PageHeaderProps) {
  const rootClassName = ['panel-header', className].filter(Boolean).join(' ');
  const rowClassName = titleRowClassName ?? 'game-header-title';
  const resolvedActionsClassName = actionsClassName ?? 'header-right';

  if (!description && !extraDescription && !inlineActions && !actions) {
    return (
      <div className={rootClassName}>
        <h1>{title}</h1>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      <div className={rowClassName}>
        <div className={titleBlockClassName}>
          <h1>{title}</h1>
          {description ? <p className="card-desc">{description}</p> : null}
          {extraDescription ? <p className="card-desc mode-page-extra-description">{extraDescription}</p> : null}
        </div>
        {inlineActions}
      </div>
      {actions ? <div className={resolvedActionsClassName}>{actions}</div> : null}
    </div>
  );
}
