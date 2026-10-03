export const EMAIL_DISPATCHES_REPOSITORY = Symbol('EMAIL_DISPATCHES_REPOSITORY');

export type EmailDispatchKind =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'REGISTRATION_ATTEMPT'
  | 'LOCKOUT_ALERT'
  | 'PASSWORD_CHANGED';

export interface EmailDispatchesRepositoryPort {
  record(email: string, kind: EmailDispatchKind, now: Date): Promise<void>;
  countSince(email: string, kind: EmailDispatchKind, since: Date): Promise<number>;
  lastAt(email: string, kind: EmailDispatchKind): Promise<Date | null>;
}
