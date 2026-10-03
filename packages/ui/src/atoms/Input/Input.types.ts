import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as invalid (sets aria-invalid and the error border). */
  invalid?: boolean;
}
