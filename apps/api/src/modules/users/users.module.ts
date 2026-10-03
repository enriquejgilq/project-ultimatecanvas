import { Module } from '@nestjs/common';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { USERS_REPOSITORY } from './application/ports/users.repository.port';
import { PrismaUsersRepository } from './infrastructure/prisma-users.repository';
import { UsersController } from './presentation/users.controller';

/**
 * The ONLY place that knows about the concrete repository implementation.
 * Swap the USERS_REPOSITORY provider below for InMemoryUsersRepository
 * (see infrastructure/in-memory-users.repository.ts, used directly by the
 * use-case unit tests) if you ever need to run the whole app without a
 * database — nothing else in this module needs to change.
 */
@Module({
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
  ],
})
export class UsersModule {}
