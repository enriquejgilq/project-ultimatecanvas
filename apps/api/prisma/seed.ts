import { PrismaClient } from '@prisma/client';
import { createDemoUsers } from '../src/modules/users/infrastructure/in-memory-users.repository';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const user of createDemoUsers()) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { id: user.id, email: user.email, name: user.name },
      update: { name: user.name },
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
