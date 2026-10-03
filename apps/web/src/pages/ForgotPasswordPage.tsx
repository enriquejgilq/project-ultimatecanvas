import { Link } from 'react-router-dom';
import { AuthLayout } from '@ucanvas/ui';
import { ForgotPasswordForm } from '@/features/auth';
import { ROUTES } from '@/lib/router';

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para elegir una contraseña nueva. Caduca en 60 minutos."
      footer={
        <Link className="auth-link" to={ROUTES.login}>
          Volver a iniciar sesión
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
