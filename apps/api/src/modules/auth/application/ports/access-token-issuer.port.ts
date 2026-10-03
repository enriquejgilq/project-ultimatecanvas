export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');

export interface IssuedAccessToken {
  accessToken: string;
  /** Seconds until expiry — derived from the signed token, so it always matches JWT_EXPIRES_IN. */
  expiresIn: number;
}

export interface AccessTokenIssuerPort {
  issue(userId: string, sessionId: string): Promise<IssuedAccessToken>;
}
