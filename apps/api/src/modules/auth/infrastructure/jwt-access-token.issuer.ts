import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenIssuerPort,
  IssuedAccessToken,
} from '../application/ports/access-token-issuer.port';

@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuerPort {
  constructor(private readonly jwt: JwtService) {}

  async issue(userId: string, sessionId: string): Promise<IssuedAccessToken> {
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { accessToken, expiresIn: exp - iat };
  }
}
