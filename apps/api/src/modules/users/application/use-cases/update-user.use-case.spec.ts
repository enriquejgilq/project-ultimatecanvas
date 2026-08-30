import { User } from '../../domain/user.entity';
import { UserAlreadyExistsError, UserNotFoundError } from '../../domain/user.errors';
import { InMemoryUsersRepository } from '../../infrastructure/in-memory-users.repository';
import { UpdateUserUseCase } from './update-user.use-case';

describe('UpdateUserUseCase', () => {
  function seedUser(repo: InMemoryUsersRepository, id: string, email: string) {
    const now = new Date();
    const user = new User(id, email, 'Ada Lovelace', now, now);
    repo.seed(user);
    return user;
  }

  it('updates the name of an existing user', async () => {
    const repo = new InMemoryUsersRepository();
    seedUser(repo, 'u1', 'ada@example.com');
    const useCase = new UpdateUserUseCase(repo);

    const updated = await useCase.execute('u1', { name: 'Ada L.' });

    expect(updated.name).toBe('Ada L.');
  });

  it('throws when the user does not exist', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new UpdateUserUseCase(repo);

    await expect(useCase.execute('missing-id', { name: 'X' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it('rejects changing the email to one already taken by another user', async () => {
    const repo = new InMemoryUsersRepository();
    seedUser(repo, 'u1', 'ada@example.com');
    seedUser(repo, 'u2', 'grace@example.com');
    const useCase = new UpdateUserUseCase(repo);

    await expect(useCase.execute('u1', { email: 'grace@example.com' })).rejects.toBeInstanceOf(
      UserAlreadyExistsError,
    );
  });
});
