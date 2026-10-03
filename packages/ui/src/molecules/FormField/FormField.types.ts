import type { ReactElement, ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  /** id of the control inside; the label points to it. */
  htmlFor: string;
  hint?: ReactNode;
  /** One message or several (e.g. every broken password rule). */
  error?: string | string[];
  /** A single control (Input, PasswordField…). It receives aria-describedby and invalid. */
  children: ReactElement;
  className?: string;
}
