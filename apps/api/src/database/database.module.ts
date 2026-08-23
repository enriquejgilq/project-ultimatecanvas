import { Global, Module } from '@nestjs/common';

/**
 * Placeholder: no ORM/driver wired yet.
 * DATABASE_URL is already validated in env.validation.ts — once a database is
 * chosen (e.g. Prisma/TypeORM), initialize the client/connection here and
 * export it for feature modules to inject.
 */
@Global()
@Module({})
export class DatabaseModule {}
