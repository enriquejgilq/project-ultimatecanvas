import { forwardRef } from 'react';
import type { InputProps } from './Input.types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className = '', type = 'text', ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={`block h-11 w-full rounded-[var(--radius-control)] border px-4 text-sm
        bg-[var(--color-input-bg)] text-[var(--color-on-glass)] placeholder:text-[var(--color-on-glass-subtle)]
        transition duration-200 ease-out hover:bg-[var(--color-input-bg-hover)]
        focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-[var(--color-focus-ring)]
        disabled:cursor-not-allowed disabled:opacity-50
        ${invalid ? 'border-[var(--color-danger-border)]' : 'border-[var(--color-input-border)] focus:border-[var(--color-input-border-focus)]'}
        ${className}`}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
