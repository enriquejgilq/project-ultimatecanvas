import { cloneElement } from 'react';
import type { FormFieldProps } from './FormField.types';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: FormFieldProps) {
  const errors = (Array.isArray(error) ? error : error ? [error] : []).filter(Boolean);
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = errors.length ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--color-on-glass)]">
        {label}
      </label>
      {cloneElement(children, {
        'aria-describedby': describedBy,
        invalid: errors.length > 0 || undefined,
      })}
      {hint && (
        <div id={hintId} className="text-xs text-[var(--color-on-glass-muted)]">
          {hint}
        </div>
      )}
      {errorId && (
        <div id={errorId} role="alert" className="text-xs text-[var(--color-danger-fg)]">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
