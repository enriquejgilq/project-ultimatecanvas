export const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export type SessionRevokedReason = 'LOGOUT' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED' | 'EXPIRED';

export interface SessionProps {
  id: string;
  userId: string;
  tokenHash: string;
  rememberMe: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  /** createdAt + 30 days when rememberMe; null otherwise (bounded by inactivity). */
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: SessionRevokedReason | null;
  userAgent: string | null;
  ip: string | null;
}

/** A logged-in device. Active rules: FR-011 (2 h idle), FR-012 (30 days with "remember me"). */
export class Session {
  private constructor(private props: SessionProps) {}

  static create(params: {
    id: string;
    userId: string;
    tokenHash: string;
    rememberMe: boolean;
    now: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Session {
    return new Session({
      id: params.id,
      userId: params.userId,
      tokenHash: params.tokenHash,
      rememberMe: params.rememberMe,
      createdAt: params.now,
      lastActivityAt: params.now,
      expiresAt: params.rememberMe ? new Date(params.now.getTime() + REMEMBER_ME_TTL_MS) : null,
      revokedAt: null,
      revokedReason: null,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
    });
  }

  static restore(props: SessionProps): Session {
    return new Session({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get rememberMe(): boolean {
    return this.props.rememberMe;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get lastActivityAt(): Date {
    return this.props.lastActivityAt;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
  get revokedReason(): SessionRevokedReason | null {
    return this.props.revokedReason;
  }

  toProps(): SessionProps {
    return { ...this.props };
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  /** Expired by time (not revoked). */
  isExpired(now: Date): boolean {
    if (this.props.rememberMe) {
      return this.props.expiresAt === null || now.getTime() >= this.props.expiresAt.getTime();
    }
    return now.getTime() - this.props.lastActivityAt.getTime() >= IDLE_TIMEOUT_MS;
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  touch(now: Date): void {
    this.props.lastActivityAt = now;
  }

  revoke(reason: SessionRevokedReason, now: Date): void {
    if (this.isRevoked()) return;
    this.props.revokedAt = now;
    this.props.revokedReason = reason;
  }
}
