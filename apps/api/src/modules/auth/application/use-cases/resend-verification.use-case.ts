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
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';
import { AUTH_LINKS, AuthLinks } from '../services/auth-links';
import { EmailRateLimiter } from '../services/email-rate-limiter';

/** FR-005. Only pending accounts get a new link; every case resolves identically. */
@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_TOKENS_REPOSITORY) private readonly emailTokens: EmailTokensRepositoryPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
    private readonly rateLimiter: EmailRateLimiter,
  ) {}

  async execute(rawEmail: string, ctx: RequestContext = {}): Promise<void> {
    const email = Account.normalizeEmail(rawEmail);
    const account = await this.accounts.findByEmail(email);
    if (!account || account.isVerified()) return;

    const now = this.clock.now();
    // Respect the limit before invalidating, so a blocked resend never kills the previous link.
    if (!(await this.rateLimiter.canSend(email, 'EMAIL_VERIFICATION', now))) {
      await this.rateLimiter.recordLimited('EMAIL_VERIFICATION', email, ctx, account.id);
      return;
    }

    await this.emailTokens.invalidateActive(account.id, 'EMAIL_VERIFICATION', now);
    const { raw, hash } = this.tokens.generate();
    await this.emailTokens.create(
      EmailToken.issue({
        id: randomUUID(),
        userId: account.id,
        type: 'EMAIL_VERIFICATION',
        tokenHash: hash,
        now,
      }),
    );
    await this.rateLimiter.send(
      'EMAIL_VERIFICATION',
      { to: email, ...mailTemplates.emailVerification(this.links.verifyEmail(raw)) },
      ctx,
      account.id,
    );
  }
}
