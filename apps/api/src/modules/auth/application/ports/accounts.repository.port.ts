import { Account } from '../../domain/account.entity';

export const ACCOUNTS_REPOSITORY = Symbol('ACCOUNTS_REPOSITORY');

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface FailedAttemptsResult {
  failedLoginCount: number;
  lockedUntil: Date | null;
}

export interface AccountsRepositoryPort {
  findByEmail(normalizedEmail: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  create(account: Account): Promise<void>;
  save(account: Account): Promise<void>;
  /**
   * Atomically adds one failed attempt unless the account is currently locked. On the
   * MAX_FAILED_ATTEMPTS-th failure it locks the account until `now + LOCKOUT_DURATION_MS`
   * and resets the counter (FR-018/FR-019). Returns the stored state, or null when the
   * account was already locked (nothing changed).
   */
  incrementFailedAttempts(id: string, now: Date): Promise<FailedAttemptsResult | null>;
}
