import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { SecurityEvent, SecurityEventsPort } from '../../application/ports/security-events.port';

@Injectable()
export class PrismaSecurityEvents implements SecurityEventsPort {
  private readonly logger = new Logger('SecurityEvents');

  constructor(private readonly prisma: PrismaService) {}

  /** Best effort: an audit failure must never break the user's request. */
  async record(event: SecurityEvent): Promise<void> {
    try {
      await this.prisma.securityEvent.create({
        data: {
          type: event.type,
          userId: event.userId ?? null,
          email: event.email ?? null,
          ip: event.ip ?? null,
          userAgent: event.userAgent ?? null,
          metadata: event.metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        `Could not record security event ${event.type}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
