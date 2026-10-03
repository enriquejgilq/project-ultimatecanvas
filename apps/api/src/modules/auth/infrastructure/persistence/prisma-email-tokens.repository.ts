import { Injectable } from '@nestjs/common';
import { EmailToken as EmailTokenRow } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { EmailToken, EmailTokenType } from '../../domain/email-token.entity';
import { EmailTokensRepositoryPort } from '../../application/ports/email-tokens.repository.port';

@Injectable()
export class PrismaEmailTokensRepository implements EmailTokensRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: EmailToken): Promise<void> {
    await this.prisma.emailToken.create({ data: token.toProps() });
  }

  async invalidateActive(userId: string, type: EmailTokenType, now: Date): Promise<void> {
    await this.prisma.emailToken.updateMany({
      where: { userId, type, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now },
    });
  }

  async findValid(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null> {
    const row = await this.prisma.emailToken.findFirst({
      where: { tokenHash, type, usedAt: null, invalidatedAt: null, expiresAt: { gt: now } },
    });
    return row ? toDomain(row) : null;
  }

  /** Conditional UPDATE: only one concurrent caller can flip usedAt (single use). */
  async consume(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null> {
    const { count } = await this.prisma.emailToken.updateMany({
      where: { tokenHash, type, usedAt: null, invalidatedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) return null;
    const row = await this.prisma.emailToken.findUnique({ where: { tokenHash } });
    return row ? toDomain(row) : null;
  }
}

function toDomain(row: EmailTokenRow): EmailToken {
  return EmailToken.restore({
    id: row.id,
    userId: row.userId,
    type: row.type,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    invalidatedAt: row.invalidatedAt,
    createdAt: row.createdAt,
  });
}
