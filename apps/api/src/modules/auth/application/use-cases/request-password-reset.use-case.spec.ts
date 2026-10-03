import { createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { buildRequestReset } from '../../infrastructure/testing/use-case-builders';

describe('RequestPasswordResetUseCase', () => {
  it('emails a 60 min reset link and invalidates the previous ones', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount();
    const request = buildRequestReset(kit);

    await request.execute('ana@example.com');
    kit.clock.advance(60_000);
    await request.execute('ANA@example.com');

    const [first, second] = kit.emailTokens.all();
    expect(first.invalidatedAt).not.toBeNull();
    expect(second.type).toBe('PASSWORD_RESET');
    expect(second.expiresAt.getTime() - kit.clock.now().getTime()).toBe(60 * 60_000);
    expect(kit.queue.ofKind('PASSWORD_RESET')[1].text).toContain(
      'http://web.test/reset-password?token=',
    );
  });

  it('does nothing for an unknown email, without throwing', async () => {
    const kit = createAuthTestKit();
    await expect(buildRequestReset(kit).execute('nadie@example.com')).resolves.toBeUndefined();
    expect(kit.queue.queued).toHaveLength(0);
  });

  it('over the limit sends nothing and keeps the previous link', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount();
    const request = buildRequestReset(kit);
    await request.execute('ana@example.com');
    await request.execute('ana@example.com');

    expect(kit.queue.ofKind('PASSWORD_RESET')).toHaveLength(1);
    expect(kit.emailTokens.all()[0].isValid(kit.clock.now())).toBe(true);
  });

  it('also works for a pending account (recovering proves the mailbox)', async () => {
    const kit = createAuthTestKit();
    await kit.seedAccount({ verified: false });
    await buildRequestReset(kit).execute('ana@example.com');
    expect(kit.queue.ofKind('PASSWORD_RESET')).toHaveLength(1);
  });
});
