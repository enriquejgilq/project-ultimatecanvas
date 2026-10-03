import { SessionExpiredError } from '../../domain/auth.errors';
import { IDLE_TIMEOUT_MS, REMEMBER_ME_TTL_MS } from '../../domain/session.entity';
import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { buildLogin } from '../../infrastructure/testing/use-case-builders';
import { LogoutUseCase } from './logout.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';

function buildRefresh(kit: AuthTestKit) {
  return new RefreshSessionUseCase(
    kit.sessions,
    kit.accounts,
    kit.tokens,
    kit.accessTokens,
    kit.clock,
  );
}

async function loggedIn(kit: AuthTestKit, rememberMe: boolean) {
  await kit.seedAccount({ password: 'lienzo-azul-2026' });
  const { cookie } = await buildLogin(kit).execute({
    email: 'ana@example.com',
    password: 'lienzo-azul-2026',
    rememberMe,
  });
  return cookie.token;
}

describe('RefreshSessionUseCase', () => {
  it('issues a new access token and records activity', async () => {
    const kit = createAuthTestKit();
    const token = await loggedIn(kit, false);
    kit.clock.advance(10 * 60_000);

    const result = await buildRefresh(kit).execute(token);

    expect(result.session.accessToken).toContain('access:');
    expect(kit.sessions.all()[0].lastActivityAt).toEqual(kit.clock.now());
  });

  it('keeps a short session alive while there is activity', async () => {
    const kit = createAuthTestKit();
    const token = await loggedIn(kit, false);
    const refresh = buildRefresh(kit);
    for (let i = 0; i < 10; i += 1) {
      kit.clock.advance(IDLE_TIMEOUT_MS - 1);
      await refresh.execute(token);
    }
  });

  it('ends a short session after 2 h without activity (and marks it EXPIRED)', async () => {
    const kit = createAuthTestKit();
    const token = await loggedIn(kit, false);
    kit.clock.advance(IDLE_TIMEOUT_MS);

    await expect(buildRefresh(kit).execute(token)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(kit.sessions.all()[0].revokedReason).toBe('EXPIRED');
  });

  it('keeps a remember-me session for 29 days of inactivity and ends it at 30', async () => {
    const kit = createAuthTestKit();
    const token = await loggedIn(kit, true);
    const refresh = buildRefresh(kit);

    kit.clock.advance(29 * 24 * 60 * 60 * 1000);
    await expect(refresh.execute(token)).resolves.toBeDefined();

    kit.clock.advance(REMEMBER_ME_TTL_MS - 29 * 24 * 60 * 60 * 1000);
    await expect(refresh.execute(token)).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('rejects a revoked session, an unknown token and a missing cookie', async () => {
    const kit = createAuthTestKit();
    const token = await loggedIn(kit, true);
    await new LogoutUseCase(kit.sessions, kit.tokens, kit.events, kit.clock).execute(token);

    const refresh = buildRefresh(kit);
    await expect(refresh.execute(token)).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(refresh.execute('unknown')).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(refresh.execute(undefined)).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
