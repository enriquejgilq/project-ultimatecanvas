import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@ucanvas/ui';
import { LoginForm, useAuth } from '@/features/auth';
import { ROUTES } from '@/lib/router';
import { safeReturnTo } from '@/utils/safeReturnTo';

export function LoginPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = safeReturnTo(params.get('returnTo'));

  if (status === 'authenticated') return <Navigate to={destination} replace />;

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Accede a tus lienzos."
      footer={
        <span>
          ¿No tienes cuenta?{' '}
          <Link className="auth-link" to={ROUTES.register}>
            Crea una
          </Link>
        </span>
      }
    >
      <LoginForm onSuccess={() => navigate(destination, { replace: true })} />
    </AuthLayout>
  );
}
