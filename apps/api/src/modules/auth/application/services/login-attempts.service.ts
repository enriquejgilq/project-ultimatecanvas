import { Inject, Injectable } from '@nestjs/common';
import { Account } from '../../domain/account.entity';
import { mailTemplates } from '../mail-templates';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import {
  EMAIL_DISPATCHES_REPOSITORY,
  EmailDispatchesRepositoryPort,
} from '../ports/email-dispatches.repository.port';
import { EMAIL_QUEUE, EmailQueuePort } from '../ports/email-queue.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { AUTH_LINKS, AuthLinks } from './auth-links';

/**
 * Failed-attempt counter and lockout shared by login and change-password (FR-018..FR-021, FR-036).
 * The counter itself is updated atomically by the repository.
 */
@Injectable()
export class LoginAttemptsService {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_DISPATCHES_REPOSITORY) private readonly dispatches: EmailDispatchesRepositoryPort,
    @Inject(EMAIL_QUEUE) private readonly queue: EmailQueuePort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
  ) {}

  /** Records one failure. If it causes the lockout, sends the single owner alert. Returns whether it locked. */
  async recordFailure(account: Account, now: Date, ctx: RequestContext = {}): Promise<boolean> {
    if (account.isLocked(now)) return false;

    const result = await this.accounts.incrementFailedAttempts(account.id, now);
    if (!result) return false;
    account.applyFailedAttempts(result.failedLoginCount, result.lockedUntil);

    const lockedNow = result.lockedUntil !== null && result.lockedUntil.getTime() > now.getTime();
    if (!lockedNow) return false;

    // System notification: not subject to the per-address limit, sent once per lockout.
    await this.dispatches.record(account.email, 'LOCKOUT_ALERT', now);
    this.queue.enqueue('LOCKOUT_ALERT', {
      to: account.email,
      ...mailTemplates.lockoutAlert(now, this.links.forgotPassword()),
    });
    await this.events.record({
      type: 'ACCOUNT_LOCKED',
      userId: account.id,
      email: account.email,
      ...ctx,
      metadata: { lockedUntil: result.lockedUntil!.toISOString() },
    });
    return true;
  }

  /** A successful login/change resets the counter (FR-019). */
  async recordSuccess(account: Account): Promise<void> {
    if (account.failedLoginCount === 0) return;
    account.resetFailedAttempts();
    await this.accounts.save(account);
  }
}
