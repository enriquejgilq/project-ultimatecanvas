import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

// TODO(auth): this guard is a no-op placeholder. Replace with a real session
// check (Navigate to ROUTES.login when unauthenticated) once the auth module
// is implemented — the API already scaffolds JwtAuthGuard for this.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
