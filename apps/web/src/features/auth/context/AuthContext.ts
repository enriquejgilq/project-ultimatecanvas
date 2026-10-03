import { createContext } from 'react';
import type { AuthUser, LoginDto } from '@ucanvas/shared';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login(dto: LoginDto): Promise<void>;
  logout(): Promise<void>;
  /** Renews the access token from the session cookie. Resolves false when the session is gone. */
  renewSession(): Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
