import { Injectable } from '@nestjs/common';
import { User as UserRow } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { Account } from '../../domain/account.entity';
import {
  AccountsRepositoryPort,
  FailedAttemptsResult,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
} from '../../application/ports/accounts.repository.port';

@Injectable()
export class PrismaAccountsRepository implements AccountsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(normalizedEmail: string): Promise<Account | null> {
    const row = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(account: Account): Promise<void> {
    const p = account.toProps();
    await this.prisma.user.create({
      data: {
        id: p.id,
        email: p.email,
        name: p.name,
        passwordHash: p.passwordHash,
        emailVerifiedAt: p.emailVerifiedAt,
        failedLoginCount: p.failedLoginCount,
        lockedUntil: p.lockedUntil,
        passwordChangedAt: p.passwordChangedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    });
  }

  /** Persists only the fields this module owns — never touches profile fields like `name`. */
  async save(account: Account): Promise<void> {
    const p = account.toProps();
    await this.prisma.user.update({
      where: { id: p.id },
      data: {
        passwordHash: p.passwordHash,
        emailVerifiedAt: p.emailVerifiedAt,
        failedLoginCount: p.failedLoginCount,
        lockedUntil: p.lockedUntil,
        passwordChangedAt: p.passwordChangedAt,
        updatedAt: p.updatedAt,
      },
    });
  }

  /** Single atomic UPDATE so concurrent failures are never lost (research R9). */
  async incrementFailedAttempts(id: string, now: Date): Promise<FailedAttemptsResult | null> {
    // Columns are `timestamp` (no time zone) holding UTC, as Prisma writes them: convert explicitly
    // so the comparison doesn't depend on the connection's TimeZone setting.
    const nowUtc = now.toISOString();
    const lockedUntilUtc = new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString();
    const rows = await this.prisma.$queryRaw<
      { failed_login_count: number; locked_until: Date | null }[]
    >`
      UPDATE users
      SET failed_login_count = CASE WHEN failed_login_count + 1 >= ${MAX_FAILED_ATTEMPTS} THEN 0 ELSE failed_login_count + 1 END,
          locked_until = CASE WHEN failed_login_count + 1 >= ${MAX_FAILED_ATTEMPTS} THEN (${lockedUntilUtc}::timestamptz AT TIME ZONE 'UTC') ELSE locked_until END
      WHERE id = ${id} AND (locked_until IS NULL OR locked_until <= (${nowUtc}::timestamptz AT TIME ZONE 'UTC'))
      RETURNING failed_login_count, locked_until`;
    const row = rows[0];
    return row ? { failedLoginCount: row.failed_login_count, lockedUntil: row.locked_until } : null;
  }
}

function toDomain(row: UserRow): Account {
  return Account.restore({
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    emailVerifiedAt: row.emailVerifiedAt,
    failedLoginCount: row.failedLoginCount,
    lockedUntil: row.lockedUntil,
    passwordChangedAt: row.passwordChangedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
