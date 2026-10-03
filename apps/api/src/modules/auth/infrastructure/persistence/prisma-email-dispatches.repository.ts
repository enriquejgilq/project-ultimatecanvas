import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  EmailDispatchesRepositoryPort,
  EmailDispatchKind,
} from '../../application/ports/email-dispatches.repository.port';

@Injectable()
export class PrismaEmailDispatchesRepository implements EmailDispatchesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(email: string, kind: EmailDispatchKind, now: Date): Promise<void> {
    await this.prisma.emailDispatch.create({ data: { email, kind, createdAt: now } });
  }

  countSince(email: string, kind: EmailDispatchKind, since: Date): Promise<number> {
    return this.prisma.emailDispatch.count({ where: { email, kind, createdAt: { gte: since } } });
  }

  async lastAt(email: string, kind: EmailDispatchKind): Promise<Date | null> {
    const row = await this.prisma.emailDispatch.findFirst({
      where: { email, kind },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }
}
