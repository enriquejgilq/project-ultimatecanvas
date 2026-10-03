import { Navigate, Route, Routes } from 'react-router-dom';
import { UsersPage } from '@/pages/UsersPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AccountSecurityPage } from '@/pages/AccountSecurityPage';
import { ROUTES } from '@/lib/router';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public: access screens */}
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.register} element={<RegisterPage />} />
      <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />

      {/* Private: everything else lives inside ProtectedRoute */}
      <Route
        path={ROUTES.home}
        element={
          <ProtectedRoute>
            <Navigate to={ROUTES.users} replace />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.users}
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.accountSecurity}
        element={
          <ProtectedRoute>
            <AccountSecurityPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
