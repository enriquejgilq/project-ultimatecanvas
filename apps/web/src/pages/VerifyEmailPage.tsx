import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, AuthLayout, Spinner } from '@ucanvas/ui';
import { AUTH_MESSAGES } from '@ucanvas/shared';
import { ResendVerificationForm, useVerifyEmail } from '@/features/auth';
import { ROUTES } from '@/lib/router';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const verify = useVerifyEmail();
  // StrictMode mounts effects twice in dev: the link is single-use, so call the API only once.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current || !token) return;
    requested.current = true;
    verify.mutate(token);
  }, [token, verify]);

  const failed = !token || verify.isError;

  return (
    <AuthLayout title="Verificar correo">
      {verify.isSuccess && (
        <div className="auth-stack">
          <Alert variant="success">{AUTH_MESSAGES.EMAIL_VERIFIED}</Alert>
          <Link className="auth-link" to={ROUTES.login}>
            Iniciar sesión
          </Link>
        </div>
      )}
      {failed && (
        <div className="auth-stack">
          <Alert variant="danger">{AUTH_MESSAGES.INVALID_LINK}</Alert>
          <ResendVerificationForm />
        </div>
      )}
      {!verify.isSuccess && !failed && (
        <div className="auth-center">
          <Spinner />
        </div>
      )}
    </AuthLayout>
  );
}
