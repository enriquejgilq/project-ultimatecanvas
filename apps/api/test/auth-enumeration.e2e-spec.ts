import request from 'supertest';
import { createVerifiedAccount, TEST_PASSWORD } from './support/accounts';
import { createTestApp, TestApp } from './support/create-test-app';

/**
 * SC-007 / FR-022..FR-024: an outsider can't tell registered emails from unregistered ones,
 * neither by the response nor by its timing. Threshold configurable for slow CI machines.
 */
const SAMPLES = 20;
const MAX_MEDIAN_GAP_MS = Number(process.env.ENUMERATION_MAX_MEDIAN_GAP_MS ?? 50);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe('Auth — no account enumeration (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  const registered = Array.from({ length: SAMPLES }, (_, i) => `registered${i}@example.com`);
  const unknown = Array.from({ length: SAMPLES }, (_, i) => `unknown${i}@example.com`);

  beforeAll(async () => {
    t = await createTestApp();
    await t.reset();
    for (const email of registered) await createVerifiedAccount(t.prisma, email);
  }, 60_000);

  afterAll(async () => {
    await t.close();
  });

  async function measure(emails: string[], send: (email: string) => request.Test) {
    const times: number[] = [];
    const responses: { status: number; body: unknown }[] = [];
    for (const email of emails) {
      const start = performance.now();
      const res = await send(email);
      times.push(performance.now() - start);
      responses.push({ status: res.status, body: res.body });
    }
    return { median: median(times), responses };
  }

  async function compare(name: string, send: (email: string) => request.Test) {
    // Warm-up so JIT/connection pool effects don't skew the first group.
    await send('warmup@example.com');
    const a = await measure(registered, send);
    const b = await measure(unknown, send);

    const statuses = new Set([...a.responses, ...b.responses].map((r) => r.status));
    const bodies = new Set([...a.responses, ...b.responses].map((r) => JSON.stringify(r.body)));
    expect({ name, statuses: [...statuses], distinctBodies: bodies.size }).toEqual({
      name,
      statuses: [...statuses].slice(0, 1),
      distinctBodies: 1,
    });
    expect(Math.abs(a.median - b.median)).toBeLessThan(MAX_MEDIAN_GAP_MS);
  }

  it(
    'login: wrong password vs unknown email',
    () =>
      compare('login', (email) =>
        http()
          .post('/api/v1/auth/login')
          .send({ email, password: 'no-es-la-clave-1', rememberMe: false }),
      ),
    60_000,
  );

  it(
    'register: existing vs new email',
    () =>
      compare('register', (email) =>
        http().post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD }),
      ),
    60_000,
  );

  it(
    'resend-verification',
    () =>
      compare('resend', (email) => http().post('/api/v1/auth/resend-verification').send({ email })),
    60_000,
  );

  it(
    'forgot-password',
    () => compare('forgot', (email) => http().post('/api/v1/auth/forgot-password').send({ email })),
    60_000,
  );

  it('login: a locked account answers exactly like a wrong password', async () => {
    await createVerifiedAccount(t.prisma, 'locked@example.com');
    for (let i = 0; i < 5; i += 1) {
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'locked@example.com', password: 'mal-mal-1234', rememberMe: false });
    }
    const locked = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'locked@example.com', password: TEST_PASSWORD, rememberMe: false });
    const wrong = await http()
      .post('/api/v1/auth/login')
      .send({ email: registered[0], password: 'mal-mal-1234', rememberMe: false });
    expect(locked.status).toBe(401);
    expect(locked.body).toEqual(wrong.body);
  });
});
