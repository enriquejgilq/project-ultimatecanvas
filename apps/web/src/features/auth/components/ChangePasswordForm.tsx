import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert, Button, FormField, PasswordField } from '@ucanvas/ui';
import { AUTH_MESSAGES, passwordSchema } from '@ucanvas/shared';
import { useChangePassword } from '../hooks/useChangePassword';
import { errorCode, errorMessage, PASSWORD_TOGGLE_LABELS, passwordRuleMessages } from '../utils';
import { PasswordRulesHint } from './PasswordRulesHint';

interface FieldErrors {
  current?: string;
  password?: string[];
  confirmation?: string;
}

const EMPTY = { current: '', password: '', confirmation: '' };

export function ChangePasswordForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const change = useChangePassword();

  const code = errorCode(change.error);
  const serverRules = passwordRuleMessages(change.error);
  const currentError =
    code === 'INVALID_CURRENT_PASSWORD' ? AUTH_MESSAGES.INVALID_CURRENT_PASSWORD : undefined;
  const otherError =
    change.isError &&
    !['INVALID_CURRENT_PASSWORD', 'PASSWORD_POLICY', 'ACCOUNT_LOCKED'].includes(code ?? '')
      ? errorMessage(change.error)
      : null;

  const update = (field: keyof typeof EMPTY) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(values.password);
    const next: FieldErrors = {
      current: values.current ? undefined : 'Introduce tu contraseña actual.',
      password: parsed.success ? undefined : parsed.error.issues.map((issue) => issue.message),
      confirmation:
        values.password === values.confirmation ? undefined : AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH,
    };
    setErrors(next);
    if (next.current || next.password || next.confirmation) return;

    change.mutate(
      { currentPassword: values.current, newPassword: values.password },
      { onSuccess: () => setValues(EMPTY) },
    );
  }

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {change.isSuccess && <Alert variant="success">{AUTH_MESSAGES.PASSWORD_CHANGED}</Alert>}
      {code === 'ACCOUNT_LOCKED' && <Alert variant="warning">{AUTH_MESSAGES.ACCOUNT_LOCKED}</Alert>}
      {otherError && <Alert variant="danger">{otherError}</Alert>}
      <FormField
        label="Contraseña actual"
        htmlFor="change-current"
        error={errors.current ?? currentError}
      >
        <PasswordField
          id="change-current"
          autoComplete="current-password"
          value={values.current}
          onChange={update('current')}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <FormField
        label="Contraseña nueva"
        htmlFor="change-new"
        hint={<PasswordRulesHint password={values.password} />}
        error={errors.password ?? serverRules}
      >
        <PasswordField
          id="change-new"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <FormField
        label="Repite la contraseña nueva"
        htmlFor="change-confirmation"
        error={errors.confirmation}
      >
        <PasswordField
          id="change-confirmation"
          autoComplete="new-password"
          value={values.confirmation}
          onChange={update('confirmation')}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={change.isPending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
