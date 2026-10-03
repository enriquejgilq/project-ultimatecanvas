import {
  AccessTokenIssuerPort,
  IssuedAccessToken,
} from '../../application/ports/access-token-issuer.port';

export class FakeAccessTokenIssuer implements AccessTokenIssuerPort {
  readonly issued: { userId: string; sessionId: string }[] = [];

  async issue(userId: string, sessionId: string): Promise<IssuedAccessToken> {
    this.issued.push({ userId, sessionId });
    return { accessToken: `access:${userId}:${sessionId}`, expiresIn: 900 };
  }
}
