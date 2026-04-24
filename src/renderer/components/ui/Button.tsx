import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonSize = 'default' | 'sm';
export type ButtonVariant = 'accent' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  className,
  size = 'default',
  type = 'button',
  variant = 'secondary',
  ...props
}, ref) {
  const rootClassName = [
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : null,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} type={type} className={rootClassName} {...props}>
      {children}
    </button>
  );
});
