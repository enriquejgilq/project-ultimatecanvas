import request from 'supertest';
import { createTestApp, TestApp } from './support/create-test-app';
import { extractToken } from './support/extract-token';
import { CSRF, sessionCookie } from './support/session';

/** SC-009: no plaintext password or token in the database or the logs. */
describe('Auth — secrets never stored or logged (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const PASSWORD = 'Secreto-Unico-4815';
  const NEW_PASSWORD = 'Otro-Secreto-1623';
  let logs = '';
  let restore: () => void;

  beforeAll(async () => {
    t = await createTestApp();
    await t.reset();
    const stdout = process.stdout.write.bind(process.stdout);
    const stderr = process.stderr.write.bind(process.stderr);
    const capture =
      (original: typeof stdout) =>
      (chunk: unknown, ...rest: unknown[]) => {
        logs += String(chunk);
        return (original as (...args: unknown[]) => boolean)(chunk, ...rest);
      };
    process.stdout.write = capture(stdout) as typeof process.stdout.write;
    process.stderr.write = capture(stderr) as typeof process.stderr.write;
    restore = () => {
      process.stdout.write = stdout;
      process.stderr.write = stderr;
    };
  });

  afterAll(async () => {
    restore();
    await t.close();
  });

  it('runs every flow and finds no secret in DB rows or logs', async () => {
    const secrets: string[] = [PASSWORD, NEW_PASSWORD];

    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'ana@example.com', password: PASSWORD })
      .expect(202);
    await t.flushEmails();
    const verifyToken = extractToken(t.mailer.sent.at(-1));
    secrets.push(verifyToken);
    await http().post('/api/v1/auth/verify-email').send({ token: verifyToken }).expect(200);

    await http()
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: 'Equivocada-0000', rememberMe: false })
      .expect(401);
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: PASSWORD, rememberMe: true })
      .expect(200);
    const cookie = sessionCookie(login);
    secrets.push(cookie.split('=')[1], login.body.data.accessToken);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).set(CSRF).expect(200);

    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ana@example.com' })
      .expect(202);
    await t.flushEmails();
    const resetToken = extractToken(t.mailer.sent.at(-1));
    secrets.push(resetToken);
    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: NEW_PASSWORD })
      .expect(204);
    await t.flushEmails();

    const dump = JSON.stringify([
      await t.prisma.user.findMany(),
      await t.prisma.session.findMany(),
      await t.prisma.emailToken.findMany(),
      await t.prisma.securityEvent.findMany(),
      await t.prisma.emailDispatch.findMany(),
    ]);
    const emailBodies = t.mailer.sent.map((m) => m.text + m.html).join('\n');

    for (const secret of secrets) {
      expect(dump).not.toContain(secret);
      expect(logs).not.toContain(secret);
    }
    // Emails never contain passwords (links are expected).
    expect(emailBodies).not.toContain(PASSWORD);
    expect(emailBodies).not.toContain(NEW_PASSWORD);
  });
});
