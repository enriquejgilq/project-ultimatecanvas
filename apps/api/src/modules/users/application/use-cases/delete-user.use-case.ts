import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../../domain/user.errors';
import { USERS_REPOSITORY, UsersRepositoryPort } from '../ports/users.repository.port';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(id);
    await this.users.delete(id);
  }
}
