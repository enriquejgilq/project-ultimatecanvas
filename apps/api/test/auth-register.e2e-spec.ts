import request from 'supertest';
import { createTestApp, TestApp } from './support/create-test-app';
import { extractToken } from './support/extract-token';

const PASSWORD = 'lienzo-azul-2026';

describe('Auth — registration & verification (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
  });
  afterAll(async () => {
    await t.close();
  });

  async function lastEmailTo(to: string) {
    await t.flushEmails();
    const sent = t.mailer.sentTo(to);
    return sent[sent.length - 1];
  }

  it('register → verify → link cannot be reused', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: ' Ana@Example.com ', password: PASSWORD })
      .expect(202);
    expect(res.body.data.message).toBe(
      'Si los datos son correctos, recibirás un correo en unos minutos.',
    );

    const email = await lastEmailTo('ana@example.com');
    expect(email.subject).toBe('Confirma tu correo en UltimateCanvas');
    const token = extractToken(email);

    await http().post('/api/v1/auth/verify-email').send({ token }).expect(200);
    const user = await t.prisma.user.findUnique({ where: { email: 'ana@example.com' } });
    expect(user?.emailVerifiedAt).not.toBeNull();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);

    const again = await http().post('/api/v1/auth/verify-email').send({ token }).expect(400);
    expect(again.body.error.code).toBe('INVALID_LINK');
  });

  it('re-registering a pending email invalidates the first link (FR-032)', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: PASSWORD });
    const first = extractToken(await lastEmailTo('ana@example.com'));

    // Skip the 60 s spacing of the email limit.
    await t.prisma.emailDispatch.updateMany({
      data: { createdAt: new Date(Date.now() - 120_000) },
    });
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: 'otra-clave-2026' })
      .expect(202);
    const second = extractToken(await lastEmailTo('ana@example.com'));

    expect(second).not.toBe(first);
    await http().post('/api/v1/auth/verify-email').send({ token: first }).expect(400);
    await http().post('/api/v1/auth/verify-email').send({ token: second }).expect(200);
  });

  it('registering a verified email answers the same and warns the owner (FR-025)', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: PASSWORD });
    await http()
      .post('/api/v1/auth/verify-email')
      .send({ token: extractToken(await lastEmailTo('ana@example.com')) });
    t.mailer.clear();

    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: 'otra-clave-2026' })
      .expect(202);
    expect(res.body.data.message).toBe(
      'Si los datos son correctos, recibirás un correo en unos minutos.',
    );

    const warning = await lastEmailTo('ana@example.com');
    expect(warning.subject).toBe('Alguien intentó registrarse con tu correo');
    expect(warning.text).not.toMatch(/token=/);
  });

  it('rejects a common password with 422 and the broken rules', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: 'password123' })
      .expect(422);
    expect(res.body.error).toMatchObject({
      code: 'PASSWORD_POLICY',
      rules: ['PASSWORD_TOO_COMMON'],
    });
  });

  it('resend-verification always answers 202', async () => {
    await http()
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nadie@example.com' })
      .expect(202);
  });
});
