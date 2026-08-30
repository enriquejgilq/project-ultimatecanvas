import { Module } from '@nestjs/common';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { USERS_REPOSITORY } from './application/ports/users.repository.port';
import { InMemoryUsersRepository } from './infrastructure/in-memory-users.repository';
import { UsersController } from './presentation/users.controller';

/**
 * The ONLY place that knows about the concrete repository implementation.
 * Swap { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository }
 * for a Prisma/TypeORM adapter once the database is wired — nothing else
 * in this module needs to change.
 */
@Module({
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
  ],
})
export class UsersModule {}
