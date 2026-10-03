import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthSession, AuthUser, LoginDto } from '@ucanvas/shared';
import { setUnauthorizedHandler } from '@/lib/apiClient';
import { clearAccessToken, setAccessToken } from '@/lib/authToken';
import { useSessionKeepAlive } from '../hooks/useSessionKeepAlive';
import { authService } from '../services/auth.service';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';

const CHANNEL_NAME = 'ucanvas-auth';
type TabMessage = 'login' | 'logout' | 'session-ended';

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
}

/**
 * Session state for the whole app (contracts/web-routes.md). The access token lives in memory
 * (lib/authToken); the session itself is the HttpOnly cookie, so a reload recovers it via refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();
  const channel = useRef<BroadcastChannel | null>(null);
  const inFlightRenewal = useRef<Promise<boolean> | null>(null);
  const statusRef = useRef<AuthStatus>(status);
  statusRef.current = status;

  const applySession = useCallback((session: AuthSession) => {
    setAccessToken(session.accessToken, session.expiresIn);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(
    (broadcast?: TabMessage) => {
      clearAccessToken();
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
      if (broadcast) channel.current?.postMessage(broadcast);
    },
    [queryClient],
  );

  /** Single shared refresh: concurrent 401s wait for the same request. */
  const renewSession = useCallback((): Promise<boolean> => {
    if (!inFlightRenewal.current) {
      inFlightRenewal.current = authService
        .refresh()
        .then((session) => {
          applySession(session);
          return true;
        })
        .catch(() => {
          // Only tell other tabs when an actual session ended (not on an anonymous bootstrap).
          endSession(statusRef.current === 'authenticated' ? 'session-ended' : undefined);
          return false;
        })
        .finally(() => {
          inFlightRenewal.current = null;
        });
    }
    return inFlightRenewal.current;
  }, [applySession, endSession]);

  const login = useCallback(
    async (dto: LoginDto) => {
      applySession(await authService.login(dto));
      channel.current?.postMessage('login' satisfies TabMessage);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      endSession('logout');
    }
  }, [endSession]);

  // Bootstrap: an existing cookie (reload, "remember me") restores the session.
  useEffect(() => {
    void renewSession();
  }, [renewSession]);

  useEffect(() => {
    setUnauthorizedHandler(renewSession);
    return () => setUnauthorizedHandler(null);
  }, [renewSession]);

  // Keep every open tab in sync.
  useEffect(() => {
    const bc = openChannel();
    channel.current = bc;
    if (!bc) return undefined;
    bc.onmessage = (event: MessageEvent<TabMessage>) => {
      if (event.data === 'logout' || event.data === 'session-ended') endSession();
      if (event.data === 'login') void renewSession();
    };
    return () => {
      bc.close();
      channel.current = null;
    };
  }, [endSession, renewSession]);

  useSessionKeepAlive(status === 'authenticated', renewSession);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, renewSession }),
    [status, user, login, logout, renewSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
