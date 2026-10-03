export type EmailTokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

const TTL_MS: Record<EmailTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export interface EmailTokenProps {
  id: string;
  userId: string;
  type: EmailTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  createdAt: Date;
}

/** Single-use link token (verification: 24 h, FR-003; reset: 60 min, FR-014). Only its hash is stored. */
export class EmailToken {
  private constructor(private readonly props: EmailTokenProps) {}

  static ttlFor(type: EmailTokenType): number {
    return TTL_MS[type];
  }

  static issue(params: {
    id: string;
    userId: string;
    type: EmailTokenType;
    tokenHash: string;
    now: Date;
  }): EmailToken {
    return new EmailToken({
      id: params.id,
      userId: params.userId,
      type: params.type,
      tokenHash: params.tokenHash,
      expiresAt: new Date(params.now.getTime() + EmailToken.ttlFor(params.type)),
      usedAt: null,
      invalidatedAt: null,
      createdAt: params.now,
    });
  }

  static restore(props: EmailTokenProps): EmailToken {
    return new EmailToken({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): EmailTokenType {
    return this.props.type;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get usedAt(): Date | null {
    return this.props.usedAt;
  }
  get invalidatedAt(): Date | null {
    return this.props.invalidatedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): EmailTokenProps {
    return { ...this.props };
  }

  isValid(now: Date): boolean {
    return (
      this.props.usedAt === null &&
      this.props.invalidatedAt === null &&
      now.getTime() < this.props.expiresAt.getTime()
    );
  }
}
