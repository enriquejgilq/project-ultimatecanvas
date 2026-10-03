import {
  AUTH_ERROR_CODES,
  AUTH_MESSAGES,
  type AuthErrorCode,
  type PasswordRuleCode,
} from '@ucanvas/shared';

/**
 * Base for every auth domain error. Deliberately not imported from modules/users:
 * the global HttpExceptionFilter recognises it by duck typing (`httpStatus`) and
 * serialises `code`/`rules` into `{ error: { code, message, rules? } }`.
 */
export class AuthDomainError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly code?: AuthErrorCode,
    public readonly rules?: PasswordRuleCode[],
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidCredentialsError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.INVALID_CREDENTIALS, 401, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }
}

export class EmailNotVerifiedError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.EMAIL_NOT_VERIFIED, 403, AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
  }
}

export class InvalidLinkError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.INVALID_LINK, 400, AUTH_ERROR_CODES.INVALID_LINK);
  }
}

export class PasswordPolicyViolationError extends AuthDomainError {
  constructor(rules: PasswordRuleCode[]) {
    super(AUTH_MESSAGES.PASSWORD_POLICY, 422, AUTH_ERROR_CODES.PASSWORD_POLICY, rules);
  }
}

export class InvalidCurrentPasswordError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.INVALID_CURRENT_PASSWORD, 400, AUTH_ERROR_CODES.INVALID_CURRENT_PASSWORD);
  }
}

export class AccountLockedError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.ACCOUNT_LOCKED, 423, AUTH_ERROR_CODES.ACCOUNT_LOCKED);
  }
}

export class SessionExpiredError extends AuthDomainError {
  constructor() {
    super(AUTH_MESSAGES.SESSION_EXPIRED, 401, AUTH_ERROR_CODES.SESSION_EXPIRED);
  }
}
