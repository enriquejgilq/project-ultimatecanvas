import { EmailToken, EmailTokenType } from '../../domain/email-token.entity';

export const EMAIL_TOKENS_REPOSITORY = Symbol('EMAIL_TOKENS_REPOSITORY');

export interface EmailTokensRepositoryPort {
  create(token: EmailToken): Promise<void>;
  /** Marks every still-active token of that user and type as invalidated (FR-005, FR-015, FR-032). */
  invalidateActive(userId: string, type: EmailTokenType, now: Date): Promise<void>;
  findValid(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null>;
  /**
   * Atomically marks the token as used if it is still valid. Returns it, or null if it was
   * unknown, expired, invalidated or already used (single use even under concurrency).
   */
  consume(tokenHash: string, type: EmailTokenType, now: Date): Promise<EmailToken | null>;
}
