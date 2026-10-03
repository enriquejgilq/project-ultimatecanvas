import type { InputProps } from '../../atoms/Input';

export interface PasswordFieldProps extends Omit<InputProps, 'type'> {
  /** Accessible labels for the toggle — passed in so the package holds no product copy. */
  showLabel: string;
  hideLabel: string;
  /** `current-password` for login, `new-password` when creating/changing one. */
  autoComplete: 'current-password' | 'new-password';
}
