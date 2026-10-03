import { Session, SessionRevokedReason } from '../../domain/session.entity';
import { SessionsRepositoryPort } from '../../application/ports/sessions.repository.port';

export class InMemorySessionsRepository implements SessionsRepositoryPort {
  private readonly rows = new Map<string, ReturnType<Session['toProps']>>();

  async create(session: Session): Promise<void> {
    this.rows.set(session.id, session.toProps());
  }

  async findById(id: string): Promise<Session | null> {
    const row = this.rows.get(id);
    return row ? Session.restore(row) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = [...this.rows.values()].find((r) => r.tokenHash === tokenHash);
    return row ? Session.restore(row) : null;
  }

  async save(session: Session): Promise<void> {
    this.rows.set(session.id, session.toProps());
  }

  async revokeAllForUser(userId: string, reason: SessionRevokedReason, now: Date): Promise<void> {
    this.revokeWhere((r) => r.userId === userId, reason, now);
  }

  async revokeAllForUserExcept(
    userId: string,
    keepSessionId: string,
    reason: SessionRevokedReason,
    now: Date,
  ): Promise<void> {
    this.revokeWhere((r) => r.userId === userId && r.id !== keepSessionId, reason, now);
  }

  all(): Session[] {
    return [...this.rows.values()].map((row) => Session.restore(row));
  }

  private revokeWhere(
    predicate: (row: ReturnType<Session['toProps']>) => boolean,
    reason: SessionRevokedReason,
    now: Date,
  ) {
    for (const row of this.rows.values()) {
      if (predicate(row) && row.revokedAt === null) {
        row.revokedAt = now;
        row.revokedReason = reason;
      }
    }
  }
}
