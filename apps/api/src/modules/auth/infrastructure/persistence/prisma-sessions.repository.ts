import { Injectable } from '@nestjs/common';
import { Session as SessionRow } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { Session, SessionRevokedReason } from '../../domain/session.entity';
import { SessionsRepositoryPort } from '../../application/ports/sessions.repository.port';

@Injectable()
export class PrismaSessionsRepository implements SessionsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(session: Session): Promise<void> {
    await this.prisma.session.create({ data: session.toProps() });
  }

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { tokenHash } });
    return row ? toDomain(row) : null;
  }

  async save(session: Session): Promise<void> {
    const p = session.toProps();
    await this.prisma.session.update({
      where: { id: p.id },
      data: {
        lastActivityAt: p.lastActivityAt,
        revokedAt: p.revokedAt,
        revokedReason: p.revokedReason,
      },
    });
  }

  async revokeAllForUser(userId: string, reason: SessionRevokedReason, now: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now, revokedReason: reason },
    });
  }

  async revokeAllForUserExcept(
    userId: string,
    keepSessionId: string,
    reason: SessionRevokedReason,
    now: Date,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: keepSessionId } },
      data: { revokedAt: now, revokedReason: reason },
    });
  }
}

function toDomain(row: SessionRow): Session {
  return Session.restore({
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    rememberMe: row.rememberMe,
    createdAt: row.createdAt,
    lastActivityAt: row.lastActivityAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    userAgent: row.userAgent,
    ip: row.ip,
  });
}
