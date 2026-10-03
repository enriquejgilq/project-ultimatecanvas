import { Inject, Injectable } from '@nestjs/common';
import { InvalidLinkError } from '../../domain/auth.errors';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import {
  EMAIL_TOKENS_REPOSITORY,
  EmailTokensRepositoryPort,
} from '../ports/email-tokens.repository.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';

/** FR-003: 24 h, single use. Any unusable link gets the same InvalidLinkError. */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_TOKENS_REPOSITORY) private readonly emailTokens: EmailTokensRepositoryPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(rawToken: string, ctx: RequestContext = {}): Promise<void> {
    const now = this.clock.now();
    const token = await this.emailTokens.consume(
      this.tokens.hash(rawToken),
      'EMAIL_VERIFICATION',
      now,
    );
    if (!token) throw new InvalidLinkError();

    const account = await this.accounts.findById(token.userId);
    if (!account) throw new InvalidLinkError();

    account.verifyEmail(now);
    await this.accounts.save(account);
    await this.events.record({
      type: 'EMAIL_VERIFIED',
      userId: account.id,
      email: account.email,
      ...ctx,
    });
  }
}
