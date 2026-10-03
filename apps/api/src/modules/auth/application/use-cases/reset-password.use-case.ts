import { Inject, Injectable } from '@nestjs/common';
import { InvalidLinkError } from '../../domain/auth.errors';
import { mailTemplates } from '../mail-templates';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import {
  EMAIL_DISPATCHES_REPOSITORY,
  EmailDispatchesRepositoryPort,
} from '../ports/email-dispatches.repository.port';
import { EMAIL_QUEUE, EmailQueuePort } from '../ports/email-queue.port';
import {
  EMAIL_TOKENS_REPOSITORY,
  EmailTokensRepositoryPort,
} from '../ports/email-tokens.repository.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../ports/password-hasher.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { SESSIONS_REPOSITORY, SessionsRepositoryPort } from '../ports/sessions.repository.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';
import { AUTH_LINKS, AuthLinks } from '../services/auth-links';
import { PasswordPolicyService } from '../services/password-policy.service';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/** FR-014..FR-017, FR-035: 60 min single-use link; closes every session and lifts any lockout. */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_TOKENS_REPOSITORY) private readonly emailTokens: EmailTokensRepositoryPort,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(EMAIL_DISPATCHES_REPOSITORY) private readonly dispatches: EmailDispatchesRepositoryPort,
    @Inject(EMAIL_QUEUE) private readonly queue: EmailQueuePort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  async execute(input: ResetPasswordInput, ctx: RequestContext = {}): Promise<void> {
    // Policy before touching the token: an invalid password must not burn the link (US4-5).
    this.passwordPolicy.assertValid(input.newPassword);

    const tokenHash = this.tokens.hash(input.token);
    const now = this.clock.now();
    if (!(await this.emailTokens.findValid(tokenHash, 'PASSWORD_RESET', now))) {
      throw new InvalidLinkError();
    }

    const passwordHash = await this.hasher.hash(input.newPassword);
    const token = await this.emailTokens.consume(tokenHash, 'PASSWORD_RESET', now);
    if (!token) throw new InvalidLinkError(); // lost a race with a concurrent use

    const account = await this.accounts.findById(token.userId);
    if (!account) throw new InvalidLinkError();

    account.changePassword(passwordHash, now);
    account.unlock(); // FR-017
    account.verifyEmail(now); // reaching the mailbox proves ownership
    await this.accounts.save(account);
    await this.sessions.revokeAllForUser(account.id, 'PASSWORD_RESET', now); // FR-016

    await this.dispatches.record(account.email, 'PASSWORD_CHANGED', now);
    this.queue.enqueue('PASSWORD_CHANGED', {
      to: account.email,
      ...mailTemplates.passwordChanged(now, this.links.forgotPassword()),
    });
    await this.events.record({
      type: 'PASSWORD_RESET_COMPLETED',
      userId: account.id,
      email: account.email,
      ...ctx,
    });
  }
}
