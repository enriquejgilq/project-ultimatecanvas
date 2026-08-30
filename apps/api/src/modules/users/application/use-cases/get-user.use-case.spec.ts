import { User } from '../../domain/user.entity';
import { UserNotFoundError } from '../../domain/user.errors';
import { InMemoryUsersRepository } from '../../infrastructure/in-memory-users.repository';
import { GetUserUseCase } from './get-user.use-case';

describe('GetUserUseCase', () => {
  it('returns an existing user', async () => {
    const repo = new InMemoryUsersRepository();
    const now = new Date();
    const seeded = new User('u1', 'ada@example.com', 'Ada Lovelace', now, now);
    repo.seed(seeded);
    const useCase = new GetUserUseCase(repo);

    await expect(useCase.execute('u1')).resolves.toBe(seeded);
  });

  it('throws when the user does not exist', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new GetUserUseCase(repo);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
