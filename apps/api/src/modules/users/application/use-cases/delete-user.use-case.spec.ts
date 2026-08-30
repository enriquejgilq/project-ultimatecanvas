import { User } from '../../domain/user.entity';
import { UserNotFoundError } from '../../domain/user.errors';
import { InMemoryUsersRepository } from '../../infrastructure/in-memory-users.repository';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  it('removes an existing user', async () => {
    const repo = new InMemoryUsersRepository();
    const now = new Date();
    repo.seed(new User('u1', 'ada@example.com', 'Ada Lovelace', now, now));
    const useCase = new DeleteUserUseCase(repo);

    await useCase.execute('u1');

    expect(await repo.findById('u1')).toBeNull();
  });

  it('throws when the user does not exist', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new DeleteUserUseCase(repo);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
