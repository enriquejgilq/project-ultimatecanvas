import request from 'supertest';
import { createVerifiedAccount, TEST_PASSWORD } from './support/accounts';
import { createTestApp, TestApp } from './support/create-test-app';

describe('Auth — lockout after failed attempts (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const login = (password: string) =>
    http()
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password, rememberMe: false });

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    await createVerifiedAccount(t.prisma);
  });
  afterAll(async () => {
    await t.close();
  });

  it('5 failures lock the account 15 min, with one alert and an identical 401', async () => {
    const failures = [];
    for (let i = 0; i < 5; i += 1) failures.push(await login('mal-mal-1234').expect(401));

    const whileLocked = await login(TEST_PASSWORD).expect(401);
    expect(whileLocked.body).toEqual(failures[0].body);

    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.com' } });
    const lockMs = user.lockedUntil!.getTime() - Date.now();
    expect(lockMs).toBeGreaterThan(14 * 60_000);
    expect(lockMs).toBeLessThanOrEqual(15 * 60_000);

    // More attempts during the lockout don't send more alerts.
    await login('mal-mal-1234').expect(401);
    await t.flushEmails();
    const alerts = t.mailer
      .sentTo('ana@example.com')
      .filter((m) => m.subject === 'Hemos bloqueado temporalmente el acceso a tu cuenta');
    expect(alerts).toHaveLength(1);

    // Simulate the 15 minutes passing.
    await t.prisma.user.update({
      where: { email: 'ana@example.com' },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });
    await login(TEST_PASSWORD).expect(200);
  });

  it('the counter survives concurrent failures (atomic increment)', async () => {
    await Promise.all(Array.from({ length: 4 }, () => login('mal-mal-1234')));
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.com' } });
    expect(user.failedLoginCount).toBe(4);
  });
});
