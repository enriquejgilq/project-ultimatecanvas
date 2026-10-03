import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { ResendVerificationUseCase } from './resend-verification.use-case';

function build(kit: AuthTestKit) {
  return new ResendVerificationUseCase(
    kit.accounts,
    kit.emailTokens,
    kit.tokens,
    kit.clock,
    kit.links,
    kit.rateLimiter,
  );
}

describe('ResendVerificationUseCase', () => {
  it('sends a new link to a pending account and invalidates the previous ones', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ email: 'ana@example.com', verified: false });
    const resend = build(kit);

    await resend.execute('ana@example.com');
    kit.clock.advance(60_000);
    await resend.execute(' ANA@example.com');

    const [first, second] = kit.emailTokens.all();
    expect(first.invalidatedAt).not.toBeNull();
    expect(second.isValid(kit.clock.now())).toBe(true);
    expect(kit.queue.ofKind('EMAIL_VERIFICATION')).toHaveLength(2);
  });

  it('does nothing for verified or unknown accounts, without throwing', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ email: 'ana@example.com', verified: true });

    await expect(build(kit).execute('ana@example.com')).resolves.toBeUndefined();
    await expect(build(kit).execute('nadie@example.com')).resolves.toBeUndefined();
    expect(kit.queue.queued).toHaveLength(0);
  });

  it('over the limit sends nothing and keeps the previous link valid', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ email: 'ana@example.com', verified: false });
    const resend = build(kit);

    await resend.execute('ana@example.com');
    await resend.execute('ana@example.com'); // < 60 s later

    expect(kit.queue.ofKind('EMAIL_VERIFICATION')).toHaveLength(1);
    expect(kit.emailTokens.all()).toHaveLength(1);
    expect(kit.emailTokens.all()[0].isValid(kit.clock.now())).toBe(true);
  });
});
