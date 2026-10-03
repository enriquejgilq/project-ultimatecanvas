import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Account } from '../../domain/account.entity';
import { EmailToken } from '../../domain/email-token.entity';
import { mailTemplates } from '../mail-templates';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import {
  EMAIL_TOKENS_REPOSITORY,
  EmailTokensRepositoryPort,
} from '../ports/email-tokens.repository.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';
import { AUTH_LINKS, AuthLinks } from '../services/auth-links';
import { EmailRateLimiter } from '../services/email-rate-limiter';

/**
 * FR-014/FR-015. Pending accounts may also recover (proving mailbox access verifies them).
 * Always resolves the same way, whether or not the account exists.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_TOKENS_REPOSITORY) private readonly emailTokens: EmailTokensRepositoryPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
    private readonly rateLimiter: EmailRateLimiter,
  ) {}

  async execute(rawEmail: string, ctx: RequestContext = {}): Promise<void> {
    const email = Account.normalizeEmail(rawEmail);
    const account = await this.accounts.findByEmail(email);
    if (!account) return;

    const now = this.clock.now();
    // Over the limit: keep the previous link valid and send nothing.
    if (!(await this.rateLimiter.canSend(email, 'PASSWORD_RESET', now))) {
      await this.rateLimiter.recordLimited('PASSWORD_RESET', email, ctx, account.id);
      return;
    }

    await this.emailTokens.invalidateActive(account.id, 'PASSWORD_RESET', now);
    const { raw, hash } = this.tokens.generate();
    await this.emailTokens.create(
      EmailToken.issue({
        id: randomUUID(),
        userId: account.id,
        type: 'PASSWORD_RESET',
        tokenHash: hash,
        now,
      }),
    );
    await this.rateLimiter.send(
      'PASSWORD_RESET',
      { to: email, ...mailTemplates.passwordReset(this.links.resetPassword(raw)) },
      ctx,
      account.id,
    );
    await this.events.record({
      type: 'PASSWORD_RESET_REQUESTED',
      userId: account.id,
      email,
      ...ctx,
    });
  }
}
