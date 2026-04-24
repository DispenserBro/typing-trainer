import type { ReactNode } from 'react';

type ActionRowAlign = 'start' | 'center';

type ActionRowProps = {
  align?: ActionRowAlign;
  children: ReactNode;
  className?: string;
  stretch?: boolean;
};

export function ActionRow({
  align = 'start',
  children,
  className,
  stretch = false,
}: ActionRowProps) {
  const rootClassName = [
    'ui-action-row',
    align === 'center' ? 'ui-action-row-center' : null,
    stretch ? 'ui-action-row-stretch' : null,
    className,
  ].filter(Boolean).join(' ');

  return <div className={rootClassName}>{children}</div>;
}
