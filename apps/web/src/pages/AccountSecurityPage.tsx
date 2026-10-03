import { Link } from 'react-router-dom';
import { AuthLayout } from '@ucanvas/ui';
import { ChangePasswordForm, useAuth } from '@/features/auth';
import { ROUTES } from '@/lib/router';

export function AccountSecurityPage() {
  const { user } = useAuth();
  return (
    <AuthLayout
      title="Seguridad de la cuenta"
      subtitle={user ? `Sesión iniciada como ${user.email}` : undefined}
      footer={
        <Link className="auth-link" to={ROUTES.home}>
          Volver
        </Link>
      }
    >
      <ChangePasswordForm />
    </AuthLayout>
  );
}
