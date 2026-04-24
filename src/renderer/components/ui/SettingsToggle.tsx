import type { ReactNode } from 'react';

type SettingsToggleProps = {
  checked: boolean;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
  onChange: (checked: boolean) => void;
  title?: string;
};

export function SettingsToggle({
  checked,
  children,
  className,
  disabled,
  hint,
  label,
  onChange,
  title,
}: SettingsToggleProps) {
  const rootClassName = ['poption-toggle', className].filter(Boolean).join(' ');

  return (
    <label className={rootClassName} title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="toggle-switch" />
      {children ?? (
        <span className="poption-toggle-text">
          {label}
          {hint ? <span className="poption-hint">{hint}</span> : null}
        </span>
      )}
    </label>
  );
}
