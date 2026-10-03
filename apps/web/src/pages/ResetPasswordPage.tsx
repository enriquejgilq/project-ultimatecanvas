import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, AuthLayout } from '@ucanvas/ui';
import { AUTH_MESSAGES } from '@ucanvas/shared';
import { ResetPasswordForm } from '@/features/auth';
import { ROUTES } from '@/lib/router';

type State = 'form' | 'done' | 'invalid';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>(token ? 'form' : 'invalid');

  return (
    <AuthLayout title="Elige una contraseña nueva">
      {state === 'form' && (
        <ResetPasswordForm
          token={token}
          onSuccess={() => setState('done')}
          onInvalidLink={() => setState('invalid')}
        />
      )}
      {state === 'done' && (
        <div className="auth-stack">
          <Alert variant="success">{AUTH_MESSAGES.PASSWORD_RESET_DONE}</Alert>
          <Link className="auth-link" to={ROUTES.login}>
            Iniciar sesión
          </Link>
        </div>
      )}
      {state === 'invalid' && (
        <div className="auth-stack">
          <Alert variant="danger">{AUTH_MESSAGES.INVALID_LINK}</Alert>
          <Link className="auth-link" to={ROUTES.forgotPassword}>
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
