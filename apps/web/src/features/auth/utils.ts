import { PASSWORD_RULE_MESSAGES, type PasswordRuleCode } from '@ucanvas/shared';
import { ApiError } from '@/lib/apiClient';

export const GENERIC_ERROR =
  'No hemos podido completar la acción. Inténtalo de nuevo en unos minutos.';

export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

/** Translates the API's PASSWORD_POLICY rule codes into messages. */
export function passwordRuleMessages(error: unknown): string[] | undefined {
  if (!(error instanceof ApiError) || !error.rules?.length) return undefined;
  return error.rules.map((rule) => PASSWORD_RULE_MESSAGES[rule as PasswordRuleCode] ?? rule);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Has hecho demasiadas peticiones. Espera un minuto e inténtalo de nuevo.';
  }
  if (error instanceof ApiError && error.code) return error.message;
  return GENERIC_ERROR;
}

export const PASSWORD_TOGGLE_LABELS = { showLabel: 'Mostrar', hideLabel: 'Ocultar' } as const;
