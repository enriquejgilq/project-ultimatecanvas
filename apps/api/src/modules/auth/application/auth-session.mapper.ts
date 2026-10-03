import type { AuthSession, AuthUser } from '@ucanvas/shared';
import { Account } from '../domain/account.entity';
import { IssuedAccessToken } from './ports/access-token-issuer.port';

export function toAuthUser(account: Account): AuthUser {
  return { id: account.id, email: account.email, name: account.name, emailVerified: true };
}

export function toAuthSession(account: Account, token: IssuedAccessToken): AuthSession {
  return { accessToken: token.accessToken, expiresIn: token.expiresIn, user: toAuthUser(account) };
}
