import { SecurityEvent, SecurityEventsPort } from '../../application/ports/security-events.port';

export class InMemorySecurityEvents implements SecurityEventsPort {
  readonly events: SecurityEvent[] = [];

  async record(event: SecurityEvent): Promise<void> {
    this.events.push(event);
  }

  types(): string[] {
    return this.events.map((event) => event.type);
  }
}
