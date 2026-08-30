import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/user.entity';
import { UserNotFoundError } from '../../domain/user.errors';
import { USERS_REPOSITORY, UsersRepositoryPort } from '../ports/users.repository.port';

@Injectable()
export class GetUserUseCase {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort) {}

  async execute(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }
}
