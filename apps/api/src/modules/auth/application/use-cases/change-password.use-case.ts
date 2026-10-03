import { Inject, Injectable } from '@nestjs/common';
import {
  AccountLockedError,
  InvalidCurrentPasswordError,
  SessionExpiredError,
} from '../../domain/auth.errors';
import { mailTemplates } from '../mail-templates';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import {
  EMAIL_DISPATCHES_REPOSITORY,
  EmailDispatchesRepositoryPort,
} from '../ports/email-dispatches.repository.port';
import { EMAIL_QUEUE, EmailQueuePort } from '../ports/email-queue.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../ports/password-hasher.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { SESSIONS_REPOSITORY, SessionsRepositoryPort } from '../ports/sessions.repository.port';
import { AUTH_LINKS, AuthLinks } from '../services/auth-links';
import { LoginAttemptsService } from '../services/login-attempts.service';
import { PasswordPolicyService } from '../services/password-policy.service';

export interface ChangePasswordInput {
  userId: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * FR-033..FR-036. Keeps the current session, closes every other one, warns the owner.
 * A wrong current password counts towards the same lockout as login.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(EMAIL_DISPATCHES_REPOSITORY) private readonly dispatches: EmailDispatchesRepositoryPort,
    @Inject(EMAIL_QUEUE) private readonly queue: EmailQueuePort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly attempts: LoginAttemptsService,
  ) {}

  async execute(input: ChangePasswordInput, ctx: RequestContext = {}): Promise<void> {
    const account = await this.accounts.findById(input.userId);
    if (!account || !account.passwordHash) throw new SessionExpiredError();

    const now = this.clock.now();
    // The caller is already authenticated, so revealing the lock is not an enumeration risk.
    if (account.isLocked(now)) throw new AccountLockedError();

    this.passwordPolicy.assertValid(input.newPassword);

    if (!(await this.hasher.verify(account.passwordHash, input.currentPassword))) {
      await this.attempts.recordFailure(account, now, ctx);
      await this.events.record({
        type: 'PASSWORD_CHANGE_FAILED',
        userId: account.id,
        email: account.email,
        ...ctx,
      });
      throw new InvalidCurrentPasswordError();
    }

    account.changePassword(await this.hasher.hash(input.newPassword), now);
    account.resetFailedAttempts();
    await this.accounts.save(account);
    await this.sessions.revokeAllForUserExcept(
      account.id,
      input.sessionId,
      'PASSWORD_CHANGED',
      now,
    );

    await this.dispatches.record(account.email, 'PASSWORD_CHANGED', now);
    this.queue.enqueue('PASSWORD_CHANGED', {
      to: account.email,
      ...mailTemplates.passwordChanged(now, this.links.forgotPassword()),
    });
    await this.events.record({
      type: 'PASSWORD_CHANGED',
      userId: account.id,
      email: account.email,
      ...ctx,
    });
  }
}
