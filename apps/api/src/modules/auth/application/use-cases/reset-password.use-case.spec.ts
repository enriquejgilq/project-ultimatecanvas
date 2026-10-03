import { InvalidLinkError, PasswordPolicyViolationError } from '../../domain/auth.errors';
import { AuthTestKit, createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';
import {
  buildLogin,
  buildRequestReset,
  buildResetPassword,
} from '../../infrastructure/testing/use-case-builders';

const OLD = 'lienzo-azul-2026';
const NEW = 'nueva-clave-2026';

async function withResetLink(kit: AuthTestKit, verified = true) {
  const account = await kit.seedAccount({ password: OLD, verified });
  await buildRequestReset(kit).execute('ana@example.com');
  return { account, token: kit.queue.lastToken('PASSWORD_RESET')! };
}

describe('ResetPasswordUseCase', () => {
  it('changes the password, closes every session and warns the owner', async () => {
    const kit = createAuthTestKit();
    const { account, token } = await withResetLink(kit);
    const login = buildLogin(kit);
    await login.execute({ email: 'ana@example.com', password: OLD, rememberMe: true });
    await login.execute({ email: 'ana@example.com', password: OLD, rememberMe: false });

    await buildResetPassword(kit).execute({ token, newPassword: NEW });

    const updated = await kit.accounts.findById(account.id);
    expect(updated?.passwordHash).toBe(`hashed:${NEW}`);
    expect(updated?.passwordChangedAt).toEqual(kit.clock.now());
    expect(kit.sessions.all().every((s) => s.revokedReason === 'PASSWORD_RESET')).toBe(true);
    expect(kit.queue.ofKind('PASSWORD_CHANGED')).toHaveLength(1);
    expect(kit.events.types()).toContain('PASSWORD_RESET_COMPLETED');
  });

  it('is single use', async () => {
    const kit = createAuthTestKit();
    const { token } = await withResetLink(kit);
    const reset = buildResetPassword(kit);
    await reset.execute({ token, newPassword: NEW });
    await expect(reset.execute({ token, newPassword: 'otra-mas-2026' })).rejects.toBeInstanceOf(
      InvalidLinkError,
    );
  });

  it('expires after 60 minutes', async () => {
    const kit = createAuthTestKit();
    const { token } = await withResetLink(kit);
    kit.clock.advance(60 * 60_000);
    await expect(
      buildResetPassword(kit).execute({ token, newPassword: NEW }),
    ).rejects.toBeInstanceOf(InvalidLinkError);
  });

  it('rejects a link replaced by a newer one', async () => {
    const kit = createAuthTestKit();
    const { token } = await withResetLink(kit);
    kit.clock.advance(60_000);
    await buildRequestReset(kit).execute('ana@example.com');
    await expect(
      buildResetPassword(kit).execute({ token, newPassword: NEW }),
    ).rejects.toBeInstanceOf(InvalidLinkError);
  });

  it('a weak new password is rejected and the link stays valid', async () => {
    const kit = createAuthTestKit();
    const { token } = await withResetLink(kit);
    const reset = buildResetPassword(kit);

    await expect(reset.execute({ token, newPassword: 'corta1' })).rejects.toBeInstanceOf(
      PasswordPolicyViolationError,
    );
    await expect(reset.execute({ token, newPassword: NEW })).resolves.toBeUndefined();
  });

  it('lifts an active lockout (FR-017)', async () => {
    const kit = createAuthTestKit();
    const { account, token } = await withResetLink(kit);
    await kit.accounts.incrementFailedAttempts(account.id, kit.clock.now());
    const locked = (await kit.accounts.findById(account.id))!;
    locked.applyFailedAttempts(0, new Date(kit.clock.now().getTime() + 15 * 60_000));
    await kit.accounts.save(locked);

    await buildResetPassword(kit).execute({ token, newPassword: NEW });

    const updated = await kit.accounts.findById(account.id);
    expect(updated?.isLocked(kit.clock.now())).toBe(false);
    expect(updated?.failedLoginCount).toBe(0);
  });

  it('verifies a pending account', async () => {
    const kit = createAuthTestKit();
    const { account, token } = await withResetLink(kit, false);
    await buildResetPassword(kit).execute({ token, newPassword: NEW });
    expect((await kit.accounts.findById(account.id))?.isVerified()).toBe(true);
  });
});
