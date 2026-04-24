import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput({
  children,
  className,
  ...props
}, ref) {
  const rootClassName = ['select-minimal', className].filter(Boolean).join(' ');

  return (
    <select ref={ref} className={rootClassName} {...props}>
      {children}
    </select>
  );
});
