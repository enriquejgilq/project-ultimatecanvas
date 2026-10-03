export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_LINK: 'INVALID_LINK',
  PASSWORD_POLICY: 'PASSWORD_POLICY',
  INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const PASSWORD_RULE_CODES = {
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
  PASSWORD_NEEDS_LETTER: 'PASSWORD_NEEDS_LETTER',
  PASSWORD_NEEDS_NUMBER: 'PASSWORD_NEEDS_NUMBER',
  PASSWORD_TOO_COMMON: 'PASSWORD_TOO_COMMON',
} as const;

export type PasswordRuleCode = (typeof PASSWORD_RULE_CODES)[keyof typeof PASSWORD_RULE_CODES];

/** User-facing copy shared by the API (error bodies) and the web (UI). Never reveal whether an email exists. */
export const AUTH_MESSAGES = {
  CHECK_YOUR_EMAIL: 'Si los datos son correctos, recibirás un correo en unos minutos.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  INVALID_LINK: 'El enlace no es válido o ha caducado. Puedes pedir uno nuevo.',
  EMAIL_NOT_VERIFIED: 'Verifica tu correo para entrar. Te podemos reenviar el enlace.',
  EMAIL_VERIFIED: 'Tu correo está verificado. Ya puedes iniciar sesión.',
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  ACCOUNT_LOCKED: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.',
  SESSION_EXPIRED: 'Tu sesión ha terminado. Inicia sesión de nuevo.',
  PASSWORD_POLICY: 'La contraseña no cumple los requisitos.',
  PASSWORD_RESET_DONE: 'Contraseña cambiada. Hemos cerrado todas tus sesiones.',
  PASSWORD_CHANGED: 'Contraseña cambiada. Hemos cerrado tu sesión en los demás dispositivos.',
  PASSWORDS_DO_NOT_MATCH: 'Las contraseñas no coinciden.',
  INVALID_EMAIL: 'Introduce un correo válido.',
} as const;

export const PASSWORD_RULE_MESSAGES: Record<PasswordRuleCode, string> = {
  PASSWORD_TOO_SHORT: `Al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  PASSWORD_TOO_LONG: `Como máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  PASSWORD_NEEDS_LETTER: 'Al menos una letra.',
  PASSWORD_NEEDS_NUMBER: 'Al menos un número.',
  PASSWORD_TOO_COMMON: 'No puede ser una contraseña común.',
};
