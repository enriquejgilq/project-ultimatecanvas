import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export const TEST_PASSWORD = 'lienzo-azul-2026';

/** Inserts a verified account directly (faster than the register+verify flow). */
export async function createVerifiedAccount(
  prisma: PrismaClient,
  email = 'ana@example.com',
  password = TEST_PASSWORD,
) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      emailVerifiedAt: new Date(),
    },
  });
}
