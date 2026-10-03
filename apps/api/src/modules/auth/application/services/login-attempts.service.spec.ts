import { createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';

const FIFTEEN_MIN = 15 * 60_000;

describe('LoginAttemptsService', () => {
  it('does not lock before the 5th consecutive failure', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount();
    for (let i = 0; i < 4; i += 1) {
      expect(await kit.loginAttempts.recordFailure(account, kit.clock.now())).toBe(false);
    }
    expect(account.failedLoginCount).toBe(4);
    expect(kit.queue.ofKind('LOCKOUT_ALERT')).toHaveLength(0);
  });

  it('locks for 15 minutes on the 5th failure, resets the counter and alerts the owner once', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount();
    for (let i = 0; i < 4; i += 1) await kit.loginAttempts.recordFailure(account, kit.clock.now());

    expect(await kit.loginAttempts.recordFailure(account, kit.clock.now())).toBe(true);

    const stored = await kit.accounts.findById(account.id);
    expect(stored?.lockedUntil?.getTime()).toBe(kit.clock.now().getTime() + FIFTEEN_MIN);
    expect(stored?.failedLoginCount).toBe(0);
    expect(kit.queue.ofKind('LOCKOUT_ALERT')).toHaveLength(1);
    expect(kit.queue.ofKind('LOCKOUT_ALERT')[0].subject).toBe(
      'Hemos bloqueado temporalmente el acceso a tu cuenta',
    );
    expect(kit.events.types()).toEqual(['ACCOUNT_LOCKED']);
  });

  it('failures during the lockout neither count nor send more alerts', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount();
    for (let i = 0; i < 5; i += 1) await kit.loginAttempts.recordFailure(account, kit.clock.now());

    kit.clock.advance(60_000);
    for (let i = 0; i < 10; i += 1) await kit.loginAttempts.recordFailure(account, kit.clock.now());

    expect((await kit.accounts.findById(account.id))?.failedLoginCount).toBe(0);
    expect(kit.queue.ofKind('LOCKOUT_ALERT')).toHaveLength(1);
  });

  it('after the lockout the counter starts from zero', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount();
    for (let i = 0; i < 5; i += 1) await kit.loginAttempts.recordFailure(account, kit.clock.now());
    kit.clock.advance(FIFTEEN_MIN);

    const fresh = (await kit.accounts.findById(account.id))!;
    expect(fresh.isLocked(kit.clock.now())).toBe(false);
    await kit.loginAttempts.recordFailure(fresh, kit.clock.now());
    expect((await kit.accounts.findById(account.id))?.failedLoginCount).toBe(1);
  });

  it('recordSuccess resets the counter', async () => {
    const kit = createAuthTestKit();
    const account = await kit.seedAccount();
    await kit.loginAttempts.recordFailure(account, kit.clock.now());
    await kit.loginAttempts.recordSuccess(account);
    expect((await kit.accounts.findById(account.id))?.failedLoginCount).toBe(0);
  });
});
