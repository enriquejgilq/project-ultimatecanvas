import { ClockPort } from '../../application/ports/clock.port';

/** Test double: every time rule (24 h, 60 min, 15 min, 2 h, 30 days, 60 s) is tested with it. */
export class FakeClock implements ClockPort {
  private current: Date;

  constructor(start: Date = new Date('2026-10-02T10:00:00Z')) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = new Date(date);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
