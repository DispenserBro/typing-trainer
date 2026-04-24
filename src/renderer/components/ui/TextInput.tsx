import { forwardRef, type InputHTMLAttributes } from 'react';

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({
  className,
  type = 'text',
  ...props
}, ref) {
  const rootClassName = ['input-minimal', className].filter(Boolean).join(' ');

  return (
    <input ref={ref} type={type} className={rootClassName} {...props} />
  );
});
