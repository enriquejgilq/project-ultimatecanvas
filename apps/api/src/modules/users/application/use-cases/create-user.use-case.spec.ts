import { UserAlreadyExistsError } from '../../domain/user.errors';
import { InMemoryUsersRepository } from '../../infrastructure/in-memory-users.repository';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  it('creates a user', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new CreateUserUseCase(repo);

    const user = await useCase.execute({ email: 'ada@example.com', name: 'Ada Lovelace' });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('ada@example.com');
    expect(user.name).toBe('Ada Lovelace');
    expect(await repo.findById(user.id)).toBe(user);
  });

  it('rejects a duplicate email', async () => {
    const repo = new InMemoryUsersRepository();
    const useCase = new CreateUserUseCase(repo);
    await useCase.execute({ email: 'ada@example.com', name: 'Ada Lovelace' });

    await expect(
      useCase.execute({ email: 'ada@example.com', name: 'Someone Else' }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });
});
