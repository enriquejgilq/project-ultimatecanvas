import request from 'supertest';
import { createVerifiedAccount, TEST_PASSWORD } from './support/accounts';
import { createTestApp, TestApp } from './support/create-test-app';
import { CSRF, rawSetCookie, sessionCookie } from './support/session';

describe('Auth — login, session, logout (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const login = (rememberMe: boolean, password = TEST_PASSWORD) =>
    http().post('/api/v1/auth/login').send({ email: 'ana@example.com', password, rememberMe });

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

  it('login without remember me sets a browser-session cookie', async () => {
    const res = await login(false).expect(200);
    const cookie = rawSetCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).not.toMatch(/Max-Age|Expires/i);
    expect(res.body.data).toMatchObject({ expiresIn: 900, user: { email: 'ana@example.com' } });
    expect(JSON.stringify(res.body)).not.toContain(sessionCookie(res).split('=')[1]);
  });

  it('login with remember me sets a ~30 day cookie', async () => {
    const res = await login(true).expect(200);
    const maxAge = Number(rawSetCookie(res).match(/Max-Age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThan(30 * 24 * 3600 - 60);
    expect(maxAge).toBeLessThanOrEqual(30 * 24 * 3600);
  });

  it('wrong password and unknown email get the same 401 body', async () => {
    const wrong = await login(false, 'otra-clave-999').expect(401);
    const unknown = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@example.com', password: TEST_PASSWORD, rememberMe: false })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Correo o contraseña incorrectos.',
    });
  });

  it('me works with the access token; refresh needs the CSRF header', async () => {
    const res = await login(false).expect(200);
    const { accessToken } = res.body.data;
    const cookie = sessionCookie(res);

    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(403);
    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set(CSRF)
      .expect(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
  });

  it('logout revokes immediately: refresh and the old access token stop working', async () => {
    const res = await login(true).expect(200);
    const { accessToken } = res.body.data;
    const cookie = sessionCookie(res);

    await http().post('/api/v1/auth/logout').set('Cookie', cookie).set(CSRF).expect(204);

    const refresh = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set(CSRF)
      .expect(401);
    expect(refresh.body.error.code).toBe('SESSION_EXPIRED');
    await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
  });

  it('logout without a session still answers 204', async () => {
    await http().post('/api/v1/auth/logout').set(CSRF).expect(204);
  });

  it('refresh without cookie is 401', async () => {
    await http().post('/api/v1/auth/refresh').set(CSRF).expect(401);
  });

  it('a pending account with the right password gets 403 EMAIL_NOT_VERIFIED', async () => {
    await t.prisma.user.update({
      where: { email: 'ana@example.com' },
      data: { emailVerifiedAt: null },
    });
    const res = await login(false).expect(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('protected routes need a token', async () => {
    await http().get('/api/v1/users').expect(401);
    const { body } = await login(false);
    await http()
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${body.data.accessToken}`)
      .expect(200);
  });
});
