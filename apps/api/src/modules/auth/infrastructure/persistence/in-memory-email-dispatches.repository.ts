import {
  EmailDispatchesRepositoryPort,
  EmailDispatchKind,
} from '../../application/ports/email-dispatches.repository.port';

export class InMemoryEmailDispatchesRepository implements EmailDispatchesRepositoryPort {
  readonly rows: { email: string; kind: EmailDispatchKind; createdAt: Date }[] = [];

  async record(email: string, kind: EmailDispatchKind, now: Date): Promise<void> {
    this.rows.push({ email, kind, createdAt: now });
  }

  async countSince(email: string, kind: EmailDispatchKind, since: Date): Promise<number> {
    return this.rows.filter(
      (r) => r.email === email && r.kind === kind && r.createdAt.getTime() >= since.getTime(),
    ).length;
  }

  async lastAt(email: string, kind: EmailDispatchKind): Promise<Date | null> {
    const times = this.rows
      .filter((r) => r.email === email && r.kind === kind)
      .map((r) => r.createdAt.getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  }
}
