export const SECURITY_EVENTS = Symbol('SECURITY_EVENTS');

export type SecurityEventType =
  | 'REGISTERED'
  | 'REGISTRATION_REPLACED'
  | 'REGISTRATION_ATTEMPT_EXISTING'
  | 'EMAIL_VERIFIED'
  | 'LOGIN_SUCCEEDED'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED_UNVERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILED'
  | 'LOGOUT'
  | 'EMAIL_RATE_LIMITED';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string | null;
  email?: string | null;
  ip?: string;
  userAgent?: string;
  /** Never passwords, tokens or links (FR-029, SC-009). */
  metadata?: Record<string, string | number | boolean>;
}

export interface SecurityEventsPort {
  /** Best effort: implementations must never throw. */
  record(event: SecurityEvent): Promise<void>;
}
