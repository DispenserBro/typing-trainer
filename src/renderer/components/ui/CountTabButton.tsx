import type { ButtonHTMLAttributes, ReactNode } from 'react';

type CountTabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  activeClassName?: string;
  children: ReactNode;
  count?: number | null;
  countClassName?: string;
  icon?: ReactNode;
};

export function CountTabButton({
  active = false,
  activeClassName,
  children,
  className,
  count,
  countClassName,
  icon,
  type = 'button',
  ...props
}: CountTabButtonProps) {
  const rootClassName = [
    className,
    active ? activeClassName : null,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={rootClassName} {...props}>
      {icon}
      <span>{children}</span>
      {count && count > 0 ? <span className={countClassName}>{count}</span> : null}
    </button>
  );
}
