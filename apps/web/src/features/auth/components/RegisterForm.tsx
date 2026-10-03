import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input, PasswordField } from '@ucanvas/ui';
import { registerSchema } from '@ucanvas/shared';
import { useRegister } from '../hooks/useRegister';
import { errorCode, errorMessage, PASSWORD_TOGGLE_LABELS, passwordRuleMessages } from '../utils';
import { PasswordRulesHint } from './PasswordRulesHint';

interface FieldErrors {
  email?: string;
  password?: string[];
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const register = useRegister();

  const serverRules = passwordRuleMessages(register.error);
  const otherError =
    register.isError && errorCode(register.error) !== 'PASSWORD_POLICY'
      ? errorMessage(register.error)
      : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      const issues = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: issues.email?.[0], password: issues.password });
      return;
    }
    setFieldErrors({});
    register.mutate(parsed.data, { onSuccess });
  }

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {otherError && <Alert variant="danger">{otherError}</Alert>}
      <FormField label="Correo" htmlFor="register-email" error={fieldErrors.email}>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </FormField>
      <FormField
        label="Contraseña"
        htmlFor="register-password"
        hint={<PasswordRulesHint password={password} />}
        error={fieldErrors.password ?? serverRules}
      >
        <PasswordField
          id="register-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={register.isPending}>
        Crear cuenta
      </Button>
    </form>
  );
}
