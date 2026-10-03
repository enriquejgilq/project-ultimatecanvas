import { assertTestDatabase, resolveTestDatabaseUrl } from './test-env';

// Runs before each e2e test file. process.env wins over apps/api/.env in ConfigModule.
const databaseUrl = resolveTestDatabaseUrl();
assertTestDatabase(databaseUrl);
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'test-secret-min-32-characters-long!!';
process.env.APP_WEB_URL = 'http://web.test';
process.env.MAIL_TRANSPORT = 'console';
process.env.MAIL_FROM = 'UltimateCanvas <no-reply@test>';
process.env.THROTTLE_DISABLED ??= 'true';
