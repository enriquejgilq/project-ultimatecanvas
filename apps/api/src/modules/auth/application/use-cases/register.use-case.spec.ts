import { PasswordPolicyViolationError } from '../../domain/auth.errors';
import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { RegisterUseCase } from './register.use-case';

function build(kit: AuthTestKit) {
  return new RegisterUseCase(
    kit.accounts,
    kit.emailTokens,
    kit.hasher,
    kit.tokens,
    kit.events,
    kit.clock,
    kit.links,
    kit.passwordPolicy,
    kit.rateLimiter,
  );
}

const PASSWORD = 'lienzo-azul-2026';

describe('RegisterUseCase', () => {
  it('creates a pending account and emails a 24 h verification link', async () => {
    const kit = createAuthTestKit();
    await build(kit).execute({ email: 'ana@example.com', password: PASSWORD });

    const account = await kit.accounts.findByEmail('ana@example.com');
    expect(account?.isVerified()).toBe(false);
    expect(account?.passwordHash).toBe(`hashed:${PASSWORD}`);

    const [token] = kit.emailTokens.all();
    expect(token.type).toBe('EMAIL_VERIFICATION');
    expect(token.expiresAt.getTime() - kit.clock.now().getTime()).toBe(24 * 60 * 60 * 1000);

    const raw = kit.queue.lastToken('EMAIL_VERIFICATION');
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(kit.tokens.hash(raw!)).toBe(token.tokenHash);
    expect(kit.queue.ofKind('EMAIL_VERIFICATION')[0].text).toContain(
      'http://web.test/verify-email?token=',
    );
    expect(kit.events.types()).toEqual(['REGISTERED']);
  });

  it('normalizes the email (case and surrounding spaces)', async () => {
    const kit = createAuthTestKit();
    await build(kit).execute({ email: '  Ana@Example.COM ', password: PASSWORD });
    expect(await kit.accounts.findByEmail('ana@example.com')).not.toBeNull();
  });

  it('replaces a pending account: new password, old links invalidated, new link sent (FR-032)', async () => {
    const kit = createAuthTestKit();
    const register = build(kit);
    await register.execute({ email: 'ana@example.com', password: PASSWORD });
    kit.clock.advance(60_000);

    await register.execute({ email: 'ana@example.com', password: 'otra-clave-2026' });

    const account = await kit.accounts.findByEmail('ana@example.com');
    expect(account?.passwordHash).toBe('hashed:otra-clave-2026');
    const [first, second] = kit.emailTokens.all();
    expect(first.invalidatedAt).not.toBeNull();
    expect(second.isValid(kit.clock.now())).toBe(true);
    expect(kit.queue.ofKind('EMAIL_VERIFICATION')).toHaveLength(2);
    expect(kit.events.types()).toEqual(['REGISTERED', 'REGISTRATION_REPLACED']);
  });

  it('leaves a verified account untouched and warns its owner (FR-025)', async () => {
    const kit = createAuthTestKit();
    const owner = await kit.seedAccount({ email: 'ana@example.com', verified: true });

    await build(kit).execute({ email: 'ana@example.com', password: 'otra-clave-2026' });

    const account = await kit.accounts.findById(owner.id);
    expect(account?.passwordHash).toBe(owner.passwordHash);
    expect(kit.emailTokens.all()).toHaveLength(0);
    expect(kit.queue.ofKind('REGISTRATION_ATTEMPT')).toHaveLength(1);
    expect(kit.events.types()).toEqual(['REGISTRATION_ATTEMPT_EXISTING']);
  });

  it('resolves the same way in every case (no enumeration)', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ email: 'verified@example.com', verified: true });
    await kit.seedAccount({ email: 'pending@example.com', verified: false });
    const register = build(kit);

    for (const email of ['new@example.com', 'pending@example.com', 'verified@example.com']) {
      await expect(register.execute({ email, password: PASSWORD })).resolves.toBeUndefined();
    }
  });

  it('always hashes the password, even when the account already exists', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ email: 'ana@example.com', verified: true });
    const before = kit.hasher.hashCalls;
    await build(kit).execute({ email: 'ana@example.com', password: PASSWORD });
    expect(kit.hasher.hashCalls).toBe(before + 1);
  });

  it('rejects a weak password with every broken rule, before looking at the email', async () => {
    const kit = createAuthTestKit();
    const error = await build(kit)
      .execute({ email: 'ana@example.com', password: 'abc' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PasswordPolicyViolationError);
    expect((error as PasswordPolicyViolationError).rules).toEqual([
      'PASSWORD_TOO_SHORT',
      'PASSWORD_NEEDS_NUMBER',
    ]);
    expect(await kit.accounts.findByEmail('ana@example.com')).toBeNull();
  });

  it('rejects common passwords', async () => {
    const kit = createAuthTestKit();
    await expect(
      build(kit).execute({ email: 'ana@example.com', password: 'Password123' }),
    ).rejects.toMatchObject({ rules: ['PASSWORD_TOO_COMMON'] });
  });

  it('does not send more verification emails than the limit allows', async () => {
    const kit = createAuthTestKit();
    const register = build(kit);
    await register.execute({ email: 'ana@example.com', password: PASSWORD });
    const firstToken = kit.queue.lastToken('EMAIL_VERIFICATION');

    // Second attempt within 60 s: nothing changes, the first link still works.
    await register.execute({ email: 'ana@example.com', password: 'otra-clave-2026' });

    expect(kit.queue.ofKind('EMAIL_VERIFICATION')).toHaveLength(1);
    expect(kit.emailTokens.all()[0].isValid(kit.clock.now())).toBe(true);
    expect(kit.tokens.hash(firstToken!)).toBe(kit.emailTokens.all()[0].tokenHash);
    expect((await kit.accounts.findByEmail('ana@example.com'))?.passwordHash).toBe(
      `hashed:${PASSWORD}`,
    );
    expect(kit.events.types()).toContain('EMAIL_RATE_LIMITED');
  });
});
