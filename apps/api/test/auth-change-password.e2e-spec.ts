import request from 'supertest';
import { createVerifiedAccount, TEST_PASSWORD } from './support/accounts';
import { createTestApp, TestApp } from './support/create-test-app';

const NEW_PASSWORD = 'nueva-clave-2026';

describe('Auth — change password while logged in (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const login = async (password = TEST_PASSWORD) =>
    (
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'ana@example.com', password, rememberMe: false })
        .expect(200)
    ).body.data.accessToken as string;
  const change = (token: string, currentPassword: string, newPassword = NEW_PASSWORD) =>
    http()
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword, newPassword });

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

  it('keeps this device, logs out the other one and warns by email', async () => {
    const deviceA = await login();
    const deviceB = await login();

    await change(deviceA, TEST_PASSWORD).expect(204);

    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${deviceA}`).expect(200);
    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${deviceB}`).expect(401);
    await login(NEW_PASSWORD);

    await t.flushEmails();
    expect(t.mailer.sentTo('ana@example.com').map((m) => m.subject)).toContain(
      'Tu contraseña ha cambiado',
    );
  });

  it('requires authentication', async () => {
    await http()
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD })
      .expect(401);
  });

  it('wrong current password → 400; the 5th locks the account → 423', async () => {
    const token = await login();
    const first = await change(token, 'mal-mal-1234').expect(400);
    expect(first.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    for (let i = 0; i < 4; i += 1) await change(token, 'mal-mal-1234').expect(400);

    const locked = await change(token, TEST_PASSWORD).expect(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('weak new password → 422 with rules', async () => {
    const token = await login();
    const res = await change(token, TEST_PASSWORD, 'qwerty12345').expect(422);
    expect(res.body.error.rules).toContain('PASSWORD_TOO_COMMON');
  });
});
