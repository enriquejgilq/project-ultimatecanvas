import { Session, SessionRevokedReason } from '../../domain/session.entity';

export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');

export interface SessionsRepositoryPort {
  create(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  revokeAllForUser(userId: string, reason: SessionRevokedReason, now: Date): Promise<void>;
  revokeAllForUserExcept(
    userId: string,
    keepSessionId: string,
    reason: SessionRevokedReason,
    now: Date,
  ): Promise<void>;
}
