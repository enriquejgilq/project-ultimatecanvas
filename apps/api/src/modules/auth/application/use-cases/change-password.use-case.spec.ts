import {
  AccountLockedError,
  InvalidCurrentPasswordError,
  PasswordPolicyViolationError,
} from '../../domain/auth.errors';
import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import { buildChangePassword, buildLogin } from '../../infrastructure/testing/use-case-builders';

const OLD = 'lienzo-azul-2026';
const NEW = 'nueva-clave-2026';

async function twoDevices(kit: AuthTestKit) {
  const account = await kit.seedAccount({ password: OLD });
  const login = buildLogin(kit);
  await login.execute({ email: 'ana@example.com', password: OLD, rememberMe: true });
  await login.execute({ email: 'ana@example.com', password: OLD, rememberMe: false });
  const [current, other] = kit.sessions.all();
  return { account, current, other };
}

describe('ChangePasswordUseCase', () => {
  it('changes the password, keeps this session, closes the others and warns the owner', async () => {
    const kit = createAuthTestKit();
    const { account, current, other } = await twoDevices(kit);

    await buildChangePassword(kit).execute({
      userId: account.id,
      sessionId: current.id,
      currentPassword: OLD,
      newPassword: NEW,
    });

    const updated = await kit.accounts.findById(account.id);
    expect(updated?.passwordHash).toBe(`hashed:${NEW}`);
    expect(updated?.passwordChangedAt).toEqual(kit.clock.now());
    expect((await kit.sessions.findById(current.id))?.isActive(kit.clock.now())).toBe(true);
    expect((await kit.sessions.findById(other.id))?.revokedReason).toBe('PASSWORD_CHANGED');
    expect(kit.queue.ofKind('PASSWORD_CHANGED')).toHaveLength(1);
    expect(kit.events.types()).toContain('PASSWORD_CHANGED');
  });

  it('a wrong current password is rejected and counts as a failed attempt', async () => {
    const kit = createAuthTestKit();
    const { account, current } = await twoDevices(kit);

    await expect(
      buildChangePassword(kit).execute({
        userId: account.id,
        sessionId: current.id,
        currentPassword: 'mal-mal-1234',
        newPassword: NEW,
      }),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

    const stored = await kit.accounts.findById(account.id);
    expect(stored?.failedLoginCount).toBe(1);
    expect(stored?.passwordHash).toBe(`hashed:${OLD}`);
  });

  it('the 5th wrong current password locks the account; then it answers ACCOUNT_LOCKED', async () => {
    const kit = createAuthTestKit();
    const { account, current } = await twoDevices(kit);
    const change = buildChangePassword(kit);
    const wrong = {
      userId: account.id,
      sessionId: current.id,
      currentPassword: 'mal-mal-1234',
      newPassword: NEW,
    };

    for (let i = 0; i < 5; i += 1) await change.execute(wrong).catch(() => undefined);
    expect(kit.queue.ofKind('LOCKOUT_ALERT')).toHaveLength(1);

    const before = kit.hasher.verifyCalls;
    await expect(change.execute({ ...wrong, currentPassword: OLD })).rejects.toBeInstanceOf(
      AccountLockedError,
    );
    expect(kit.hasher.verifyCalls).toBe(before);
  });

  it('a weak new password changes nothing', async () => {
    const kit = createAuthTestKit();
    const { account, current, other } = await twoDevices(kit);

    await expect(
      buildChangePassword(kit).execute({
        userId: account.id,
        sessionId: current.id,
        currentPassword: OLD,
        newPassword: 'qwerty12345',
      }),
    ).rejects.toBeInstanceOf(PasswordPolicyViolationError);

    expect((await kit.accounts.findById(account.id))?.passwordHash).toBe(`hashed:${OLD}`);
    expect((await kit.sessions.findById(other.id))?.isActive(kit.clock.now())).toBe(true);
  });
});
