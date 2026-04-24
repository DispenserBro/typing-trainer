import type { ReactNode } from 'react';

export type SegmentedControlOption<T extends string> = {
  disabled?: boolean;
  icon?: ReactNode;
  label?: ReactNode;
  title?: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  ariaLabel?: string;
  className?: string;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  const rootClassName = ['seg-group', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} role="group" aria-label={ariaLabel}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          disabled={option.disabled}
          className={`seg-btn${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
