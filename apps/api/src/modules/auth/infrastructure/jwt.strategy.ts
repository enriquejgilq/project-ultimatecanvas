import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CLOCK, ClockPort } from '../application/ports/clock.port';
import {
  SESSIONS_REPOSITORY,
  SessionsRepositoryPort,
} from '../application/ports/sessions.repository.port';

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

/** Writes lastActivityAt at most once a minute instead of on every request. */
const ACTIVITY_WRITE_INTERVAL_MS = 60_000;

/**
 * Besides signature/expiry, checks on every request that the session (`sid`) is still
 * active, so logout / password reset / password change revoke access immediately (SC-005, SC-011).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.sid) throw new UnauthorizedException();

    const now = this.clock.now();
    const session = await this.sessions.findById(payload.sid);
    if (!session || session.userId !== payload.sub || !session.isActive(now)) {
      throw new UnauthorizedException();
    }

    if (now.getTime() - session.lastActivityAt.getTime() >= ACTIVITY_WRITE_INTERVAL_MS) {
      session.touch(now);
      await this.sessions.save(session);
    }

    return { userId: payload.sub, sessionId: payload.sid };
  }
}
