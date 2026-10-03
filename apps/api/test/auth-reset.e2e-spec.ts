import request from 'supertest';
import { createVerifiedAccount, TEST_PASSWORD } from './support/accounts';
import { createTestApp, TestApp } from './support/create-test-app';
import { extractToken } from './support/extract-token';
import { CSRF } from './support/session';

const NEW_PASSWORD = 'nueva-clave-2026';

describe('Auth — password recovery (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const login = (password = TEST_PASSWORD, rememberMe = false) =>
    http().post('/api/v1/auth/login').send({ email: 'ana@example.com', password, rememberMe });

  async function requestResetLink(): Promise<string> {
    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ana@example.com' })
      .expect(202);
    await t.flushEmails();
    const sent = t.mailer
      .sentTo('ana@example.com')
      .filter((m) => m.subject === 'Restablece tu contraseña');
    return extractToken(sent[sent.length - 1]);
  }

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

  it('only the latest link works; weak password keeps it; success closes every session', async () => {
    const a = (await login(TEST_PASSWORD, true).expect(200)).body.data.accessToken;
    const b = (await login(TEST_PASSWORD, false).expect(200)).body.data.accessToken;

    const first = await requestResetLink();
    await t.prisma.emailDispatch.updateMany({
      data: { createdAt: new Date(Date.now() - 120_000) },
    });
    const second = await requestResetLink();

    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: first, newPassword: NEW_PASSWORD })
      .expect(400);

    const weak = await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: second, newPassword: 'lienzoazulcielo' })
      .expect(422);
    expect(weak.body.error.rules).toEqual(['PASSWORD_NEEDS_NUMBER']);

    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: second, newPassword: NEW_PASSWORD })
      .expect(204);

    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${a}`).expect(401);
    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${b}`).expect(401);
    await login(TEST_PASSWORD).expect(401);
    await login(NEW_PASSWORD).expect(200);

    await t.flushEmails();
    expect(t.mailer.sentTo('ana@example.com').map((m) => m.subject)).toContain(
      'Tu contraseña ha cambiado',
    );
  });

  it('forgot-password for an unknown email answers the same and sends nothing', async () => {
    const res = await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nadie@example.com' })
      .expect(202);
    expect(res.body.data.message).toBe(
      'Si los datos son correctos, recibirás un correo en unos minutos.',
    );
    await t.flushEmails();
    expect(t.mailer.sent).toHaveLength(0);
  });

  it('a locked account can recover and log in with the new password (FR-017)', async () => {
    for (let i = 0; i < 5; i += 1) await login('mal-mal-1234').expect(401);
    await login(TEST_PASSWORD).expect(401); // locked

    const token = await requestResetLink();
    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD })
      .expect(204);
    await login(NEW_PASSWORD).expect(200);
  });

  it('refresh after a reset fails because the session was revoked', async () => {
    const res = await login(TEST_PASSWORD, true).expect(200);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const token = await requestResetLink();
    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD })
      .expect(204);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF).expect(401);
  });
});
