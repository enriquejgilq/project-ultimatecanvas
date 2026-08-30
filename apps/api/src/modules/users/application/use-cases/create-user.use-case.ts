import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from '../../domain/user.entity';
import { UserAlreadyExistsError } from '../../domain/user.errors';
import { USERS_REPOSITORY, UsersRepositoryPort } from '../ports/users.repository.port';

export interface CreateUserInput {
  email: string;
  name: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new UserAlreadyExistsError(input.email);

    const now = new Date();
    const user = new User(randomUUID(), input.email, input.name, now, now);
    return this.users.save(user);
  }
}
