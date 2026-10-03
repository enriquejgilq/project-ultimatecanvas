import { forwardRef, useId } from 'react';
import type { CheckboxProps } from './Checkbox.types';

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer select-none items-center gap-3 text-sm text-[var(--color-on-glass-muted)] ${className}`}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="h-4 w-4 cursor-pointer rounded border border-[var(--color-input-border)]
            bg-[var(--color-input-bg)] accent-[var(--color-control-checked)]
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
          {...rest}
        />
        <span>{label}</span>
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
