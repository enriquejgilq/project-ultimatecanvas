import { Account } from '../../domain/account.entity';
import {
  AccountsRepositoryPort,
  FailedAttemptsResult,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
} from '../../application/ports/accounts.repository.port';

/** Test adapter. Stores snapshots so callers must `save` to persist changes, like a real DB. */
export class InMemoryAccountsRepository implements AccountsRepositoryPort {
  private readonly rows = new Map<string, ReturnType<Account['toProps']>>();

  async findByEmail(normalizedEmail: string): Promise<Account | null> {
    const row = [...this.rows.values()].find((r) => r.email === normalizedEmail);
    return row ? Account.restore(row) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const row = this.rows.get(id);
    return row ? Account.restore(row) : null;
  }

  async create(account: Account): Promise<void> {
    if ([...this.rows.values()].some((r) => r.email === account.email)) {
      throw new Error(`Unique constraint: email ${account.email}`);
    }
    this.rows.set(account.id, account.toProps());
  }

  async save(account: Account): Promise<void> {
    this.rows.set(account.id, account.toProps());
  }

  async incrementFailedAttempts(id: string, now: Date): Promise<FailedAttemptsResult | null> {
    const row = this.rows.get(id);
    if (!row) return null;
    if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) return null;

    const next = row.failedLoginCount + 1;
    if (next >= MAX_FAILED_ATTEMPTS) {
      row.failedLoginCount = 0;
      row.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    } else {
      row.failedLoginCount = next;
    }
    return { failedLoginCount: row.failedLoginCount, lockedUntil: row.lockedUntil };
  }

  seed(...accounts: Account[]): void {
    accounts.forEach((account) => this.rows.set(account.id, account.toProps()));
  }
}
