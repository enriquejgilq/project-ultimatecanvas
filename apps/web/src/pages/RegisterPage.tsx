import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@ucanvas/ui';
import { CheckEmailNotice, RegisterForm } from '@/features/auth';
import { ROUTES } from '@/lib/router';

export function RegisterPage() {
  const [done, setDone] = useState(false);

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle={done ? undefined : 'Solo necesitas tu correo y una contraseña.'}
      footer={
        <span>
          ¿Ya tienes cuenta?{' '}
          <Link className="auth-link" to={ROUTES.login}>
            Inicia sesión
          </Link>
        </span>
      }
    >
      {done ? <CheckEmailNotice /> : <RegisterForm onSuccess={() => setDone(true)} />}
    </AuthLayout>
  );
}
