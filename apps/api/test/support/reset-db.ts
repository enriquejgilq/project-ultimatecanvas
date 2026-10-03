import { PrismaClient } from '@prisma/client';
import { assertTestDatabase } from './test-env';

/** Empties every table touched by the app. Only ever runs against a *_test database. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL!);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE security_events, email_dispatches, email_tokens, sessions, users RESTART IDENTITY CASCADE',
  );
}
