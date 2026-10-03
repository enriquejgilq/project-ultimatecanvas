import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { assertTestDatabase, resolveTestDatabaseUrl } from './test-env';

/** Applies pending migrations to the test database once per e2e run. */
export default function globalSetup(): void {
  const databaseUrl = resolveTestDatabaseUrl();
  assertTestDatabase(databaseUrl);
  execSync('pnpm exec prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
