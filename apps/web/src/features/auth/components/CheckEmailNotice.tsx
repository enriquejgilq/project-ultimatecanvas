import { Alert } from '@ucanvas/ui';
import { AUTH_MESSAGES } from '@ucanvas/shared';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/router';

export function CheckEmailNotice({ title = 'Revisa tu correo' }: { title?: string }) {
  return (
    <div className="auth-stack">
      <Alert variant="info" title={title}>
        <p>{AUTH_MESSAGES.CHECK_YOUR_EMAIL}</p>
        <p>Si no lo ves, mira en la carpeta de correo no deseado.</p>
      </Alert>
      <Link className="auth-link" to={ROUTES.login}>
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
