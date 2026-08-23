import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports ok status', () => {
    const service = new HealthService();
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
  });
});
