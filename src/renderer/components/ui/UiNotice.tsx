import type { ReactNode } from 'react';

export type UiNoticeTone = 'info' | 'warning' | 'danger' | 'success';

type UiNoticeProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  detail?: ReactNode;
  title?: ReactNode;
  tone?: UiNoticeTone;
};

export function UiNotice({
  actions,
  children,
  className,
  detail,
  title,
  tone = 'info',
}: UiNoticeProps) {
  return (
    <div className={['ui-notice', `ui-notice-${tone}`, className].filter(Boolean).join(' ')}>
      <div className="ui-notice-body">
        {title ? <strong className="ui-notice-title">{title}</strong> : null}
        {detail ? <p className="ui-notice-detail">{detail}</p> : null}
        {children}
        {actions ? <div className="ui-notice-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
