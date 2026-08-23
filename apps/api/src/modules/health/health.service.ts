import { Injectable } from '@nestjs/common';
import type { Health } from '@ucanvas/shared';

@Injectable()
export class HealthService {
  check(): Health {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
