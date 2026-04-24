import type { ReactNode } from 'react';

type SettingsActionListProps = {
  children: ReactNode;
  className?: string;
};

type SettingsActionRowProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SettingsActionList({ children, className }: SettingsActionListProps) {
  const rootClassName = ['presets-list', className].filter(Boolean).join(' ');
  return <div className={rootClassName}>{children}</div>;
}

export function SettingsActionRow({ actions, children, className }: SettingsActionRowProps) {
  const rootClassName = ['preset-row', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {children}
      {actions}
    </div>
  );
}
