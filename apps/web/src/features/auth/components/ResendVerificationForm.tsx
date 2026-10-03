import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input } from '@ucanvas/ui';
import { AUTH_MESSAGES, emailOnlySchema } from '@ucanvas/shared';
import { useResendVerification } from '../hooks/useResendVerification';
import { errorMessage } from '../utils';

export function ResendVerificationForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [invalid, setInvalid] = useState<string>();
  const resend = useResendVerification();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setInvalid(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }
    setInvalid(undefined);
    resend.mutate(parsed.data.email);
  }

  if (resend.isSuccess) {
    return <Alert variant="info">{AUTH_MESSAGES.CHECK_YOUR_EMAIL}</Alert>;
  }

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {resend.isError && <Alert variant="danger">{errorMessage(resend.error)}</Alert>}
      <FormField label="Correo" htmlFor="resend-email" error={invalid}>
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <Button type="submit" variant="secondary" fullWidth isLoading={resend.isPending}>
        Enviar un enlace nuevo
      </Button>
    </form>
  );
}
