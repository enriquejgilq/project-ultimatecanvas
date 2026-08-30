import { User } from '../../domain/user.entity';
import { InMemoryUsersRepository } from '../../infrastructure/in-memory-users.repository';
import { ListUsersUseCase } from './list-users.use-case';

describe('ListUsersUseCase', () => {
  it('returns an empty list when there are no users', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new ListUsersUseCase(repo);

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it('returns all seeded users', async () => {
    const repo = new InMemoryUsersRepository();
    const now = new Date();
    repo.seed(
      new User('u1', 'ada@example.com', 'Ada Lovelace', now, now),
      new User('u2', 'grace@example.com', 'Grace Hopper', now, now),
    );
    const useCase = new ListUsersUseCase(repo);

    const users = await useCase.execute();

    expect(users).toHaveLength(2);
  });
});
