import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Secondary links under the card (e.g. "¿No tienes cuenta?"). */
  footer?: ReactNode;
}
