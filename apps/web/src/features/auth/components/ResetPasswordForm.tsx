import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, PasswordField } from '@ucanvas/ui';
import { AUTH_MESSAGES, passwordSchema } from '@ucanvas/shared';
import { useResetPassword } from '../hooks/useResetPassword';
import { errorCode, errorMessage, PASSWORD_TOGGLE_LABELS, passwordRuleMessages } from '../utils';
import { PasswordRulesHint } from './PasswordRulesHint';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
  onInvalidLink: () => void;
}

export function ResetPasswordForm({ token, onSuccess, onInvalidLink }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string[]; confirmation?: string }>({});
  const reset = useResetPassword();

  const serverRules = passwordRuleMessages(reset.error);
  const otherError =
    reset.isError && !['PASSWORD_POLICY', 'INVALID_LINK'].includes(errorCode(reset.error) ?? '')
      ? errorMessage(reset.error)
      : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    const next = {
      password: parsed.success ? undefined : parsed.error.issues.map((issue) => issue.message),
      confirmation: password === confirmation ? undefined : AUTH_MESSAGES.PASSWORDS_DO_NOT_MATCH,
    };
    setErrors(next);
    if (next.password || next.confirmation) return;

    reset.mutate(
      { token, newPassword: password },
      {
        onSuccess,
        onError: (error) => {
          if (errorCode(error) === 'INVALID_LINK') onInvalidLink();
        },
      },
    );
  }

  return (
    <form className="auth-stack" onSubmit={handleSubmit} noValidate>
      {otherError && <Alert variant="danger">{otherError}</Alert>}
      <FormField
        label="Contraseña nueva"
        htmlFor="reset-password"
        hint={<PasswordRulesHint password={password} />}
        error={errors.password ?? serverRules}
      >
        <PasswordField
          id="reset-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <FormField
        label="Repite la contraseña"
        htmlFor="reset-confirmation"
        error={errors.confirmation}
      >
        <PasswordField
          id="reset-confirmation"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          required
          {...PASSWORD_TOGGLE_LABELS}
        />
      </FormField>
      <Button type="submit" fullWidth isLoading={reset.isPending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
