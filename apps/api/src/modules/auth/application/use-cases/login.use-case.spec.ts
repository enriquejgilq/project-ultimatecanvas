import { EmailNotVerifiedError, InvalidCredentialsError } from '../../domain/auth.errors';
import { REMEMBER_ME_TTL_MS } from '../../domain/session.entity';
import { createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { buildLogin } from '../../infrastructure/testing/use-case-builders';

const PASSWORD = 'lienzo-azul-2026';

describe('LoginUseCase', () => {
  it('opens a session and issues an access token bound to it', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount({ password: PASSWORD });

    const result = await buildLogin(kit).execute({
      email: ' ANA@example.com',
      password: PASSWORD,
      rememberMe: false,
    });

    const [session] = kit.sessions.all();
    expect(session.userId).toBe(account.id);
    expect(session.tokenHash).toBe(kit.tokens.hash(result.cookie.token));
    expect(kit.accessTokens.issued).toEqual([{ userId: account.id, sessionId: session.id }]);
    expect(result.session.user).toEqual({
      id: account.id,
      email: 'ana@example.com',
      name: null,
      emailVerified: true,
    });
    expect(kit.events.types()).toEqual(['LOGIN_SUCCEEDED']);
  });

  it('without remember me the session has no absolute expiry; with it, 30 days', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ password: PASSWORD });
    const login = buildLogin(kit);

    const short = await login.execute({
      email: 'ana@example.com',
      password: PASSWORD,
      rememberMe: false,
    });
    const long = await login.execute({
      email: 'ana@example.com',
      password: PASSWORD,
      rememberMe: true,
    });

    expect(short.cookie.expiresAt).toBeNull();
    expect(long.cookie.expiresAt?.getTime()).toBe(kit.clock.now().getTime() + REMEMBER_ME_TTL_MS);
  });

  it('rejects a wrong password with the generic error', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ password: PASSWORD });
    await expect(
      buildLogin(kit).execute({
        email: 'ana@example.com',
        password: 'otra-cosa-123',
        rememberMe: false,
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(kit.sessions.all()).toHaveLength(0);
  });

  it('rejects an unknown email with the same error, after the same hashing work', async () => {
    const kit = createAuthTestKit();
    const login = buildLogin(kit);
    const before = kit.hasher.verifyCalls;

    await expect(
      login.execute({ email: 'nadie@example.com', password: PASSWORD, rememberMe: false }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(kit.hasher.verifyCalls).toBe(before + 1);
    expect(kit.events.events[0].metadata).toEqual({ reason: 'UNKNOWN_EMAIL' });
  });

  it('computes the dummy hash only once', async () => {
    const kit = createAuthTestKit();
    const login = buildLogin(kit);
    for (let i = 0; i < 3; i += 1) {
      await login
        .execute({ email: `nadie${i}@example.com`, password: PASSWORD, rememberMe: false })
        .catch(() => undefined);
    }
    expect(kit.hasher.hashCalls).toBe(1);
  });

  it('tells a pending account with the right password to verify its email', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ password: PASSWORD, verified: false });
    await expect(
      buildLogin(kit).execute({ email: 'ana@example.com', password: PASSWORD, rememberMe: false }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
  });

  it('gives a pending account with a wrong password the generic error', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ password: PASSWORD, verified: false });
    await expect(
      buildLogin(kit).execute({
        email: 'ana@example.com',
        password: 'nope-nope-1',
        rememberMe: false,
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects accounts without a password (created outside self-registration)', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount({ password: PASSWORD });
    const props = account.toProps();
    kit.accounts.seed(
      (await import('../../domain/account.entity')).Account.restore({
        ...props,
        passwordHash: null,
      }),
    );
    await expect(
      buildLogin(kit).execute({ email: 'ana@example.com', password: PASSWORD, rememberMe: false }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('a successful login resets the failed-attempt counter', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount({ password: PASSWORD });
    const login = buildLogin(kit);
    await login
      .execute({ email: 'ana@example.com', password: 'mal-mal-123', rememberMe: false })
      .catch(() => undefined);
    expect((await kit.accounts.findById(account.id))?.failedLoginCount).toBe(1);

    await login.execute({ email: 'ana@example.com', password: PASSWORD, rememberMe: false });
    expect((await kit.accounts.findById(account.id))?.failedLoginCount).toBe(0);
  });

  describe('lockout (US5)', () => {
    const wrong = { email: 'ana@example.com', password: 'mal-mal-1234', rememberMe: false };
    const right = { email: 'ana@example.com', password: PASSWORD, rememberMe: false };

    it('rejects even the right password while locked, with the generic error and no session', async () => {
      const kit = createAuthTestKit();
      await kit.seedAccount({ password: PASSWORD });
      const login = buildLogin(kit);
      for (let i = 0; i < 5; i += 1) await login.execute(wrong).catch(() => undefined);

      await expect(login.execute(right)).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(kit.sessions.all()).toHaveLength(0);
      expect(kit.events.events.at(-1)?.metadata).toEqual({ reason: 'LOCKED' });
    });

    it('lets the owner in once the 15 minutes are over', async () => {
      const kit = createAuthTestKit();
      await kit.seedAccount({ password: PASSWORD });
      const login = buildLogin(kit);
      for (let i = 0; i < 5; i += 1) await login.execute(wrong).catch(() => undefined);

      kit.clock.advance(15 * 60_000);
      await expect(login.execute(right)).resolves.toBeDefined();
    });
  });
});
