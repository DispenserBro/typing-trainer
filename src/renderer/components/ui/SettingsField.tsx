import type { ReactNode } from 'react';

type SettingsFieldProps = {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  hintClassName?: string;
  label?: ReactNode;
  labelClassName?: string;
};

export function SettingsField({
  children,
  className,
  hint,
  hintClassName,
  label,
  labelClassName,
}: SettingsFieldProps) {
  const rootClassName = ['poption', className].filter(Boolean).join(' ');
  const labelRootClassName = ['poption-label', labelClassName].filter(Boolean).join(' ');
  const hintRootClassName = ['poption-hint', hintClassName].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {label ? <span className={labelRootClassName}>{label}</span> : null}
      {children}
      {hint ? <span className={hintRootClassName}>{hint}</span> : null}
    </div>
  );
}
