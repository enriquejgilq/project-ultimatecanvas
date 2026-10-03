import { InvalidLinkError } from '../../domain/auth.errors';
import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { RegisterUseCase } from './register.use-case';
import { VerifyEmailUseCase } from './verify-email.use-case';

async function registered(kit: AuthTestKit) {
  const register = new RegisterUseCase(
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
  await register.execute({ email: 'ana@example.com', password: 'lienzo-azul-2026' });
  return { register, token: kit.queue.lastToken('EMAIL_VERIFICATION')! };
}

function build(kit: AuthTestKit) {
  return new VerifyEmailUseCase(kit.accounts, kit.emailTokens, kit.tokens, kit.events, kit.clock);
}

describe('VerifyEmailUseCase', () => {
  it('verifies the account with a valid link', async () => {
    const kit = createAuthTestKit();
    const { token } = await registered(kit);

    await build(kit).execute(token);

    expect((await kit.accounts.findByEmail('ana@example.com'))?.isVerified()).toBe(true);
    expect(kit.events.types()).toContain('EMAIL_VERIFIED');
  });

  it('rejects a link that was already used', async () => {
    const kit = createAuthTestKit();
    const { token } = await registered(kit);
    await build(kit).execute(token);
    await expect(build(kit).execute(token)).rejects.toBeInstanceOf(InvalidLinkError);
  });

  it('rejects a link older than 24 h', async () => {
    const kit = createAuthTestKit();
    const { token } = await registered(kit);
    kit.clock.advance(24 * 60 * 60 * 1000);
    await expect(build(kit).execute(token)).rejects.toBeInstanceOf(InvalidLinkError);
  });

  it('accepts a link just before 24 h', async () => {
    const kit = createAuthTestKit();
    const { token } = await registered(kit);
    kit.clock.advance(24 * 60 * 60 * 1000 - 1);
    await expect(build(kit).execute(token)).resolves.toBeUndefined();
  });

  it('rejects a link invalidated by a newer one', async () => {
    const kit = createAuthTestKit();
    const { register, token } = await registered(kit);
    kit.clock.advance(60_000);
    await register.execute({ email: 'ana@example.com', password: 'otra-clave-2026' });

    await expect(build(kit).execute(token)).rejects.toBeInstanceOf(InvalidLinkError);
    await expect(
      build(kit).execute(kit.queue.lastToken('EMAIL_VERIFICATION')!),
    ).resolves.toBeUndefined();
  });

  it('rejects an unknown token', async () => {
    const kit = createAuthTestKit();
    await expect(build(kit).execute('x'.repeat(43))).rejects.toBeInstanceOf(InvalidLinkError);
  });
});
