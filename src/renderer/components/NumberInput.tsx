import { useId } from 'react';

type NumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  emptyValue?: number;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
};

function clampValue(value: number, min?: number, max?: number) {
  let next = value;
  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  return next;
}

function getStepPrecision(step: number) {
  const text = `${step}`;
  if (!text.includes('.')) return 0;
  return text.split('.')[1]?.length ?? 0;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  emptyValue,
  className = '',
  inputClassName = '',
  ariaLabel,
}: NumberInputProps) {
  const fallbackId = useId();
  const precision = getStepPrecision(step);

  const applyNext = (next: number) => {
    const normalized = clampValue(Number(next.toFixed(precision)), min, max);
    onChange(normalized);
  };

  return (
    <div className={`number-input ${className}`.trim()}>
      <input
        id={fallbackId}
        type="number"
        className={`input-minimal number-input-field ${inputClassName}`.trim()}
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(event) => {
          const next = parseFloat(event.target.value);
          if (Number.isNaN(next)) {
            applyNext(typeof emptyValue === 'number' ? emptyValue : (typeof min === 'number' ? min : 0));
            return;
          }
          applyNext(next);
        }}
      />
      <div className="number-input-steppers" aria-hidden="true">
        <button
          type="button"
          className="number-input-stepper"
          tabIndex={-1}
          onClick={() => applyNext(value + step)}
        >
          <span />
        </button>
        <button
          type="button"
          className="number-input-stepper"
          tabIndex={-1}
          onClick={() => applyNext(value - step)}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
