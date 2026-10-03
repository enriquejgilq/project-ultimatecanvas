import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * e2e tests NEVER touch the development database: they use DATABASE_URL_TEST, or the
 * DATABASE_URL from apps/api/.env with the database renamed to `<name>_test`.
 */
export function resolveTestDatabaseUrl(): string {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;

  let base = process.env.DATABASE_URL;
  if (!base) {
    const envFile = readFileSync(join(__dirname, '..', '..', '.env'), 'utf8');
    base = envFile
      .match(/^DATABASE_URL=(.*)$/m)?.[1]
      ?.trim()
      .replace(/^"|"$/g, '');
  }
  if (!base)
    throw new Error('Set DATABASE_URL_TEST (or DATABASE_URL in apps/api/.env) for e2e tests');

  const url = new URL(base);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`;
  return url.toString();
}

export function assertTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e tests against "${name}": the database name must end with _test`,
    );
  }
}
