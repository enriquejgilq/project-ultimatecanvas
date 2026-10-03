import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '../ports/clock.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';
import { SESSIONS_REPOSITORY, SessionsRepositoryPort } from '../ports/sessions.repository.port';
import { TOKEN_GENERATOR, TokenGeneratorPort } from '../ports/token-generator.port';

/** FR-013: revokes this device's session immediately. Idempotent — never throws. */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(rawToken: string | undefined, ctx: RequestContext = {}): Promise<void> {
    if (!rawToken) return;
    const session = await this.sessions.findByTokenHash(this.tokens.hash(rawToken));
    if (!session || session.isRevoked()) return;

    session.revoke('LOGOUT', this.clock.now());
    await this.sessions.save(session);
    await this.events.record({ type: 'LOGOUT', userId: session.userId, ...ctx });
  }
}
