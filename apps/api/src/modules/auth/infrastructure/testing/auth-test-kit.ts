import { randomUUID } from 'node:crypto';
import { Account } from '../../domain/account.entity';
import { FakeClock } from '../clock/fake-clock';
import { FakePasswordHasher } from '../crypto/fake-password-hasher';
import { RandomTokenGenerator } from '../crypto/random-token-generator';
import { InMemoryEmailQueue } from '../mail/in-memory-email-queue';
import { InMemoryAccountsRepository } from '../persistence/in-memory-accounts.repository';
import { InMemoryEmailDispatchesRepository } from '../persistence/in-memory-email-dispatches.repository';
import { InMemoryEmailTokensRepository } from '../persistence/in-memory-email-tokens.repository';
import { InMemorySecurityEvents } from '../persistence/in-memory-security-events';
import { InMemorySessionsRepository } from '../persistence/in-memory-sessions.repository';
import { AuthLinks } from '../../application/services/auth-links';
import { EmailRateLimiter } from '../../application/services/email-rate-limiter';
import { PasswordPolicyService } from '../../application/services/password-policy.service';
import { LoginAttemptsService } from '../../application/services/login-attempts.service';
import { FakeAccessTokenIssuer } from './fake-access-token.issuer';

export const TEST_WEB_URL = 'http://web.test';
export const COMMON_PASSWORDS = new Set(['password123', 'qwerty12345']);

/** Wires every in-memory adapter the auth use cases need. Unit tests only — no Nest container. */
export function createAuthTestKit() {
  const clock = new FakeClock();
  const accounts = new InMemoryAccountsRepository();
  const sessions = new InMemorySessionsRepository();
  const emailTokens = new InMemoryEmailTokensRepository();
  const dispatches = new InMemoryEmailDispatchesRepository();
  const events = new InMemorySecurityEvents();
  const queue = new InMemoryEmailQueue();
  const hasher = new FakePasswordHasher();
  const tokens = new RandomTokenGenerator();
  const commonPasswords = { isCommon: (p: string) => COMMON_PASSWORDS.has(p) };
  const rateLimiter = new EmailRateLimiter(dispatches, queue, events, clock);
  const passwordPolicy = new PasswordPolicyService(commonPasswords);
  const links = new AuthLinks(TEST_WEB_URL);
  const loginAttempts = new LoginAttemptsService(accounts, dispatches, queue, events, links);
  const accessTokens = new FakeAccessTokenIssuer();

  async function seedAccount(
    options: { email?: string; password?: string; verified?: boolean } = {},
  ): Promise<Account> {
    const account = Account.register({
      id: randomUUID(),
      email: options.email ?? 'ana@example.com',
      passwordHash: await hasher.hash(options.password ?? 'lienzo-azul-2026'),
      now: clock.now(),
    });
    if (options.verified ?? true) account.verifyEmail(clock.now());
    accounts.seed(account);
    return account;
  }

  return {
    clock,
    accounts,
    sessions,
    emailTokens,
    dispatches,
    events,
    queue,
    hasher,
    tokens,
    commonPasswords,
    rateLimiter,
    passwordPolicy,
    links,
    loginAttempts,
    accessTokens,
    appWebUrl: TEST_WEB_URL,
    seedAccount,
  };
}

export type AuthTestKit = ReturnType<typeof createAuthTestKit>;
