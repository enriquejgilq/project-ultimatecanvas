import request from 'supertest';
import { createTestApp, TestApp } from './support/create-test-app';

describe('Auth — per-address email limit (e2e, FR-030/FR-031)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const resend = () =>
    http().post('/api/v1/auth/resend-verification').send({ email: 'ana@example.com' }).expect(202);

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: 'lienzo-azul-2026' })
      .expect(202);
  });
  afterAll(async () => {
    await t.close();
  });

  const verificationEmails = async () => {
    await t.flushEmails();
    return t.mailer
      .sentTo('ana@example.com')
      .filter((m) => m.subject.startsWith('Confirma tu correo'));
  };

  it('requests within 60 s always answer 202 but send nothing more', async () => {
    for (let i = 0; i < 5; i += 1) await resend();
    expect(await verificationEmails()).toHaveLength(1); // the one from registration
  });

  it('at most 3 per hour even when spaced by more than 60 s', async () => {
    for (let i = 0; i < 5; i += 1) {
      // Pretend the previous email went out 2 minutes ago (keeps them inside the same hour).
      await t.prisma.$executeRawUnsafe(
        `UPDATE email_dispatches SET created_at = created_at - interval '2 minutes'`,
      );
      await resend();
    }
    expect(await verificationEmails()).toHaveLength(3);
    const limited = await t.prisma.securityEvent.count({ where: { type: 'EMAIL_RATE_LIMITED' } });
    expect(limited).toBeGreaterThanOrEqual(3);
  });
});
