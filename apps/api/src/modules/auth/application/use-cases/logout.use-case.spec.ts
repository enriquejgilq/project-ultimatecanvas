import { createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { buildLogin } from '../../infrastructure/testing/use-case-builders';
import { LogoutUseCase } from './logout.use-case';

describe('LogoutUseCase', () => {
  it('revokes the session of that cookie with reason LOGOUT', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ password: 'lienzo-azul-2026' });
    const { cookie } = await buildLogin(kit).execute({
      email: 'ana@example.com',
      password: 'lienzo-azul-2026',
      rememberMe: true,
    });

    await new LogoutUseCase(kit.sessions, kit.tokens, kit.events, kit.clock).execute(cookie.token);

    const [session] = kit.sessions.all();
    expect(session.isActive(kit.clock.now())).toBe(false);
    expect(session.revokedReason).toBe('LOGOUT');
    expect(kit.events.types()).toContain('LOGOUT');
  });

  it('never throws without a cookie or with an unknown one', async () => {
    const kit = createAuthTestKit();
    const logout = new LogoutUseCase(kit.sessions, kit.tokens, kit.events, kit.clock);
    await expect(logout.execute(undefined)).resolves.toBeUndefined();
    await expect(logout.execute('unknown')).resolves.toBeUndefined();
  });
});
