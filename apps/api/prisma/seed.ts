import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createDemoUsers } from '../src/modules/users/infrastructure/in-memory-users.repository';

const prisma = new PrismaClient();

/** Development-only password for the demo users (meets the password policy, not a common one). */
export const DEMO_PASSWORD = 'Demo-canvas-2026';

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const now = new Date();

  for (const user of createDemoUsers()) {
    const email = user.email.trim().toLowerCase();
    await prisma.user.upsert({
      where: { email },
      create: { id: user.id, email, name: user.name, passwordHash, emailVerifiedAt: now },
      update: {
        name: user.name,
        passwordHash,
        emailVerifiedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
