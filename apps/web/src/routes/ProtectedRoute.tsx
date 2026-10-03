import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@ucanvas/ui';
import { useAuth } from '@/features/auth';
import { ROUTES } from '@/lib/router';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Private pages render only with a session (FR-026). Without one, the user goes to login with
 * `returnTo` so they land back on the same page — query and hash included (FR-027).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (status === 'bootstrapping') {
    return (
      <main className="glass-bg home-page" aria-busy="true">
        <Spinner size="lg" />
      </main>
    );
  }

  if (status === 'anonymous') {
    const returnTo = encodeURIComponent(`${pathname}${search}${hash}`);
    return <Navigate to={`${ROUTES.login}?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
