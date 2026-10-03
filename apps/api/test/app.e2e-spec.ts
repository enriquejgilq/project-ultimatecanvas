import request from 'supertest';
import { createTestApp, TestApp } from './support/create-test-app';

describe('AppModule (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('/api/v1/health (GET) is public and returns ok', () => {
    return request(t.app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
      });
  });

  it('/api/v1/users (GET) requires authentication', () => {
    return request(t.app.getHttpServer()).get('/api/v1/users').expect(401);
  });
});
