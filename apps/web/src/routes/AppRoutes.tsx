import { Navigate, Route, Routes } from 'react-router-dom';
import { UsersPage } from '@/pages/UsersPage';
import { ROUTES } from '@/lib/router';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<Navigate to={ROUTES.users} replace />} />
      <Route path={ROUTES.login} element={<p>Login placeholder</p>} />
      <Route
        path={ROUTES.users}
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
