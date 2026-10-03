import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input } from '@ucanvas/ui';
import { AUTH_MESSAGES, emailOnlySchema } from '@ucanvas/shared';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { errorMessage } from '../utils';
import { CheckEmailNotice } from './CheckEmailNotice';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState<string>();
  const forgot = useForgotPassword();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setInvalid(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }
    setInvalid(undefined);
    forgot.mutate(parsed.data.email);
  }

  // Same screen whether or not the email has an account (FR-022).
  if (forgot.isSuccess) return <CheckEmailNotice />;

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {forgot.isError && <Alert variant="danger">{errorMessage(forgot.error)}</Alert>}
      <FormField label="Correo" htmlFor="forgot-email" error={invalid}>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={forgot.isPending}>
        Enviar enlace
      </Button>
    </form>
  );
}
