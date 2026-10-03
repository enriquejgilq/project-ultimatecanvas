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
import { PASSWORD_HASHER, PasswordHasherPort } from '../ports/password-hasher.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';
import { AUTH_LINKS, AuthLinks } from '../services/auth-links';
import { EmailRateLimiter } from '../services/email-rate-limiter';
import { PasswordPolicyService } from '../services/password-policy.service';

export interface RegisterInput {
  email: string;
  password: string;
}

/**
 * FR-001..FR-003, FR-025, FR-032. Always resolves the same way whatever the email's state,
 * so the response never reveals whether an account exists (FR-022).
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(EMAIL_TOKENS_REPOSITORY) private readonly emailTokens: EmailTokensRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUTH_LINKS) private readonly links: AuthLinks,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly rateLimiter: EmailRateLimiter,
  ) {}

  async execute(input: RegisterInput, ctx: RequestContext = {}): Promise<void> {
    const email = Account.normalizeEmail(input.email);
    // Policy first: its answer depends only on the password, never on the email.
    this.passwordPolicy.assertValid(input.password);
    // Always pay the hashing cost so every branch takes about the same time (FR-024).
    const passwordHash = await this.hasher.hash(input.password);
    const now = this.clock.now();

    const existing = await this.accounts.findByEmail(email);

    if (!existing) {
      const account = Account.register({ id: randomUUID(), email, passwordHash, now });
      await this.accounts.create(account);
      await this.sendVerification(account, now, ctx);
      await this.events.record({ type: 'REGISTERED', userId: account.id, email, ...ctx });
      return;
    }

    if (!existing.isVerified()) {
      // Over the email limit: change nothing, so the link already sent keeps working.
      if (!(await this.rateLimiter.canSend(email, 'EMAIL_VERIFICATION', now))) {
        await this.rateLimiter.recordLimited('EMAIL_VERIFICATION', email, ctx, existing.id);
        return;
      }
      existing.replacePendingPassword(passwordHash, now);
      await this.accounts.save(existing);
      await this.emailTokens.invalidateActive(existing.id, 'EMAIL_VERIFICATION', now);
      await this.sendVerification(existing, now, ctx);
      await this.events.record({
        type: 'REGISTRATION_REPLACED',
        userId: existing.id,
        email,
        ...ctx,
      });
      return;
    }

    await this.rateLimiter.send(
      'REGISTRATION_ATTEMPT',
      {
        to: email,
        ...mailTemplates.registrationAttempt(this.links.login(), this.links.forgotPassword()),
      },
      ctx,
      existing.id,
    );
    await this.events.record({
      type: 'REGISTRATION_ATTEMPT_EXISTING',
      userId: existing.id,
      email,
      ...ctx,
    });
  }

  private async sendVerification(account: Account, now: Date, ctx: RequestContext): Promise<void> {
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
      { to: account.email, ...mailTemplates.emailVerification(this.links.verifyEmail(raw)) },
      ctx,
      account.id,
    );
  }
}
