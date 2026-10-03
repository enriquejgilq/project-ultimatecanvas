import { EmailToken, EmailTokenType } from '../../domain/email-token.entity';
import { EmailTokensRepositoryPort } from '../../application/ports/email-tokens.repository.port';

export class InMemoryEmailTokensRepository implements EmailTokensRepositoryPort {
  private readonly rows = new Map<string, ReturnType<EmailToken['toProps']>>();

  async create(token: EmailToken): Promise<void> {
    this.rows.set(token.id, token.toProps());
  }

  async invalidateActive(userId: string, type: EmailTokenType, now: Date): Promise<void> {
    for (const row of this.rows.values()) {
      if (
        row.userId === userId &&
        row.type === type &&
        row.usedAt === null &&
        row.invalidatedAt === null
      ) {
        row.invalidatedAt = now;
      }
    }
  }

  async findValid(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null> {
    const row = this.find(tokenHash, type);
    if (!row) return null;
    const token = EmailToken.restore(row);
    return token.isValid(now) ? token : null;
  }

  async consume(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null> {
    const row = this.find(tokenHash, type);
    if (!row || !EmailToken.restore(row).isValid(now)) return null;
    row.usedAt = now;
    return EmailToken.restore(row);
  }

  all(): EmailToken[] {
    return [...this.rows.values()].map((row) => EmailToken.restore(row));
  }

  private find(tokenHash: string, type: EmailTokenType) {
    return [...this.rows.values()].find((r) => r.tokenHash === tokenHash && r.type === type);
  }
}
