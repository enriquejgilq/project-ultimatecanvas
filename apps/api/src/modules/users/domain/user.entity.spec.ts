import { DomainError } from './user.errors';
import { User } from './user.entity';

describe('User entity', () => {
  function makeUser() {
    const now = new Date('2024-01-01T00:00:00.000Z');
    return new User('u1', 'ada@example.com', 'Ada Lovelace', now, now);
  }

  it('renames the user and bumps updatedAt', () => {
    const user = makeUser();
    const before = user.updatedAt;

    user.rename('Ada L.');

    expect(user.name).toBe('Ada L.');
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('rejects an empty name', () => {
    const user = makeUser();
    expect(() => user.rename('   ')).toThrow(DomainError);
  });

  it('rejects an invalid email', () => {
    const user = makeUser();
    expect(() => user.changeEmail('not-an-email')).toThrow(DomainError);
  });
});
