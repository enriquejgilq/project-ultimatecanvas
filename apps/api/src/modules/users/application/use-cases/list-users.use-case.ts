import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/user.entity';
import { USERS_REPOSITORY, UsersRepositoryPort } from '../ports/users.repository.port';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort) {}

  execute(): Promise<User[]> {
    return this.users.findAll();
  }
}
