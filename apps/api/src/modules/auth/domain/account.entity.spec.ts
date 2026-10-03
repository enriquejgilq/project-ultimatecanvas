import { Account } from './account.entity';
import { AuthDomainError } from './auth.errors';

const now = new Date('2026-10-02T10:00:00Z');

function pending() {
  return Account.register({ id: 'a1', email: '  Ana@Example.COM ', passwordHash: 'h1', now });
}

describe('Account', () => {
  it('normalizes the email on registration and starts pending', () => {
    const account = pending();
    expect(account.email).toBe('ana@example.com');
    expect(account.isVerified()).toBe(false);
    expect(account.failedLoginCount).toBe(0);
  });

  it('verifies the email once', () => {
    const account = pending();
    account.verifyEmail(now);
    const later = new Date(now.getTime() + 1000);
    account.verifyEmail(later);
    expect(account.emailVerifiedAt).toEqual(now);
  });

  it('replaces the password only while pending', () => {
    const account = pending();
    account.replacePendingPassword('h2', now);
    expect(account.passwordHash).toBe('h2');

    account.verifyEmail(now);
    expect(() => account.replacePendingPassword('h3', now)).toThrow(AuthDomainError);
  });

  it('is locked strictly before lockedUntil', () => {
    const account = pending();
    const until = new Date(now.getTime() + 15 * 60_000);
    account.applyFailedAttempts(0, until);
    expect(account.isLocked(new Date(until.getTime() - 1))).toBe(true);
    expect(account.isLocked(until)).toBe(false);
  });

  it('unlock clears the lock and the counter', () => {
    const account = pending();
    account.applyFailedAttempts(3, new Date(now.getTime() + 60_000));
    account.unlock();
    expect(account.isLocked(now)).toBe(false);
    expect(account.failedLoginCount).toBe(0);
  });

  it('changePassword records when it happened', () => {
    const account = pending();
    account.changePassword('h9', now);
    expect(account.passwordHash).toBe('h9');
    expect(account.passwordChangedAt).toEqual(now);
  });
});
