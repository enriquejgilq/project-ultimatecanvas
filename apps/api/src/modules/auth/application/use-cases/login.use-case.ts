import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthSession } from '@ucanvas/shared';
import { Account } from '../../domain/account.entity';
import { EmailNotVerifiedError, InvalidCredentialsError } from '../../domain/auth.errors';
import { Session } from '../../domain/session.entity';
import { toAuthSession } from '../auth-session.mapper';
import { ACCESS_TOKEN_ISSUER, AccessTokenIssuerPort } from '../ports/access-token-issuer.port';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../ports/password-hasher.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { SESSIONS_REPOSITORY, SessionsRepositoryPort } from '../ports/sessions.repository.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';
import { LoginAttemptsService } from '../services/login-attempts.service';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResult {
  session: AuthSession;
  /** Raw opaque token for the HttpOnly cookie — never stored, never logged. */
  cookie: { token: string; rememberMe: boolean; expiresAt: Date | null };
}

/**
 * FR-010..FR-012, FR-018..FR-024. Unknown email, wrong password and locked account all end in
 * the same InvalidCredentialsError after the same amount of hashing work.
 */
@Injectable()
export class LoginUseCase {
  /** Hash of a throwaway password, computed once, verified against when the account doesn't exist. */
  private readonly dummyHash: Promise<string>;

  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly accessTokens: AccessTokenIssuerPort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly attempts: LoginAttemptsService,
  ) {
    this.dummyHash = hasher.hash('dummy-password-for-timing-1');
  }

  async execute(input: LoginInput, ctx: RequestContext = {}): Promise<LoginResult> {
    const email = Account.normalizeEmail(input.email);
    const account = await this.accounts.findByEmail(email);
    const hash = account?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await this.hasher.verify(hash, input.password);
    const now = this.clock.now();

    if (!account || !account.passwordHash) {
      await this.fail(email, null, 'UNKNOWN_EMAIL', ctx);
    }
    const known = account!;

    // Checked after verify() so a locked account costs the same time as any other failure (FR-020).
    if (known.isLocked(now)) await this.fail(email, known.id, 'LOCKED', ctx);

    if (!passwordMatches) {
      await this.attempts.recordFailure(known, now, ctx);
      await this.fail(email, known.id, 'WRONG_PASSWORD', ctx);
    }

    if (!known.isVerified()) {
      await this.events.record({
        type: 'LOGIN_BLOCKED_UNVERIFIED',
        userId: known.id,
        email,
        ...ctx,
      });
      throw new EmailNotVerifiedError();
    }

    await this.attempts.recordSuccess(known);

    const { raw, hash: tokenHash } = this.tokens.generate();
    const session = Session.create({
      id: randomUUID(),
      userId: known.id,
      tokenHash,
      rememberMe: input.rememberMe,
      now,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    await this.sessions.create(session);
    await this.events.record({
      type: 'LOGIN_SUCCEEDED',
      userId: known.id,
      email,
      ...ctx,
      metadata: { rememberMe: input.rememberMe },
    });

    const token = await this.accessTokens.issue(known.id, session.id);
    return {
      session: toAuthSession(known, token),
      cookie: { token: raw, rememberMe: session.rememberMe, expiresAt: session.expiresAt },
    };
  }

  private async fail(
    email: string,
    userId: string | null,
    reason: 'UNKNOWN_EMAIL' | 'WRONG_PASSWORD' | 'LOCKED',
    ctx: RequestContext,
  ): Promise<never> {
    await this.events.record({ type: 'LOGIN_FAILED', userId, email, ...ctx, metadata: { reason } });
    throw new InvalidCredentialsError();
  }
}
