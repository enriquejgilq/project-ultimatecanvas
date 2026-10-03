import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Checkbox, FormField, Input, PasswordField } from '@ucanvas/ui';
import { AUTH_MESSAGES, emailSchema } from '@ucanvas/shared';
import { ROUTES } from '@/lib/router';
import { useLogin } from '../hooks/useLogin';
import { useResendVerification } from '../hooks/useResendVerification';
import { errorCode, errorMessage, PASSWORD_TOGGLE_LABELS } from '../utils';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const login = useLogin();
  const resend = useResendVerification();

  const code = errorCode(login.error);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setEmailError(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }
    setEmailError(undefined);
    resend.reset();
    login.mutate({ email: parsedEmail.data, password, rememberMe }, { onSuccess });
  }

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {login.isError && code === 'EMAIL_NOT_VERIFIED' && (
        <Alert variant="warning">
          <p>{AUTH_MESSAGES.EMAIL_NOT_VERIFIED}</p>
          {resend.isSuccess ? (
            <p>{AUTH_MESSAGES.CHECK_YOUR_EMAIL}</p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={resend.isPending}
              onClick={() => resend.mutate(email)}
            >
              Reenviar enlace
            </Button>
          )}
        </Alert>
      )}
      {login.isError && code !== 'EMAIL_NOT_VERIFIED' && (
        <Alert variant="danger">
          {code === 'INVALID_CREDENTIALS'
            ? AUTH_MESSAGES.INVALID_CREDENTIALS
            : errorMessage(login.error)}
        </Alert>
      )}
      <FormField label="Correo" htmlFor="login-email" error={emailError}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Contraseña" htmlFor="login-password">
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <div className="auth-row">
        <Checkbox
          label="Mantener sesión iniciada"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <Link className="auth-link" to={ROUTES.forgotPassword}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <Button type="submit" fullWidth isLoading={login.isPending}>
        Entrar
      </Button>
    </form>
  );
}
