import { forwardRef, useState } from 'react';
import { Input } from '../../atoms/Input';
import type { PasswordFieldProps } from './PasswordField.types';

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ showLabel, hideLabel, className = '', ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className={`relative ${className}`}>
        <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-24" {...rest} />
        <button
          type="button"
          aria-pressed={visible}
          aria-controls={rest.id}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 right-1 rounded-[var(--radius-control)] px-3 text-xs font-medium
            text-[var(--color-on-glass-muted)] transition hover:text-[var(--color-on-glass)]
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          {visible ? hideLabel : showLabel}
        </button>
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';
