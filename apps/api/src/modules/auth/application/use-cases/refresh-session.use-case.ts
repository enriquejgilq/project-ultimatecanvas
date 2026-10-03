import { Inject, Injectable } from '@nestjs/common';
import { SessionExpiredError } from '../../domain/auth.errors';
import { LoginResult } from './login.use-case';
import { toAuthSession } from '../auth-session.mapper';
import { ACCESS_TOKEN_ISSUER, AccessTokenIssuerPort } from '../ports/access-token-issuer.port';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';
import { CLOCK, ClockPort } from '../ports/clock.port';
import { SESSIONS_REPOSITORY, SessionsRepositoryPort } from '../ports/sessions.repository.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';

/** Renews the access token from the session cookie (FR-010) while the session is active. */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly accessTokens: AccessTokenIssuerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(rawToken: string | undefined): Promise<LoginResult> {
    if (!rawToken) throw new SessionExpiredError();
    const now = this.clock.now();

    const session = await this.sessions.findByTokenHash(this.tokens.hash(rawToken));
    if (!session) throw new SessionExpiredError();
    if (!session.isActive(now)) {
      if (!session.isRevoked()) {
        session.revoke('EXPIRED', now);
        await this.sessions.save(session);
      }
      throw new SessionExpiredError();
    }

    const account = await this.accounts.findById(session.userId);
    if (!account || !account.isVerified()) throw new SessionExpiredError();

    session.touch(now);
    await this.sessions.save(session);

    const token = await this.accessTokens.issue(account.id, session.id);
    return {
      session: toAuthSession(account, token),
      cookie: { token: rawToken, rememberMe: session.rememberMe, expiresAt: session.expiresAt },
    };
  }
}
