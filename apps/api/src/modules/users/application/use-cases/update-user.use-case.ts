import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/user.entity';
import { UserAlreadyExistsError, UserNotFoundError } from '../../domain/user.errors';
import { USERS_REPOSITORY, UsersRepositoryPort } from '../ports/users.repository.port';

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort) {}

  async execute(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(id);

    if (input.email && input.email !== user.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing && existing.id !== id) throw new UserAlreadyExistsError(input.email);
      user.changeEmail(input.email);
    }

    if (input.name) user.rename(input.name);

    return this.users.save(user);
  }
}
