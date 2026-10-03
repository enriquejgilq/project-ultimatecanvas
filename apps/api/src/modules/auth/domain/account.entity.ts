import { AuthDomainError } from './auth.errors';

export interface AccountProps {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credentials, verification and lockout state of a user. Lives on the same `users`
 * table as modules/users' User, but this module owns these fields.
 * Pure TypeScript: no NestJS, no Prisma.
 */
export class Account {
  private constructor(private props: AccountProps) {}

  static normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  static register(params: { id: string; email: string; passwordHash: string; now: Date }): Account {
    return new Account({
      id: params.id,
      email: Account.normalizeEmail(params.email),
      name: null,
      passwordHash: params.passwordHash,
      emailVerifiedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  static restore(props: AccountProps): Account {
    return new Account({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get name(): string | null {
    return this.props.name;
  }
  get passwordHash(): string | null {
    return this.props.passwordHash;
  }
  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt;
  }
  get failedLoginCount(): number {
    return this.props.failedLoginCount;
  }
  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }
  get passwordChangedAt(): Date | null {
    return this.props.passwordChangedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Snapshot for persistence adapters. */
  toProps(): AccountProps {
    return { ...this.props };
  }

  isVerified(): boolean {
    return this.props.emailVerifiedAt !== null;
  }

  isLocked(now: Date): boolean {
    return this.props.lockedUntil !== null && this.props.lockedUntil.getTime() > now.getTime();
  }

  verifyEmail(now: Date): void {
    if (this.isVerified()) return;
    this.props.emailVerifiedAt = now;
    this.props.updatedAt = now;
  }

  /** Re-registration of a pending account (FR-032): only whoever proves mailbox access activates it. */
  replacePendingPassword(passwordHash: string, now: Date): void {
    if (this.isVerified()) {
      throw new AuthDomainError('Cannot replace the password of a verified account', 422);
    }
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = now;
  }

  /** Mirrors the atomic increment done by the repository (see AccountsRepositoryPort). */
  applyFailedAttempts(failedLoginCount: number, lockedUntil: Date | null): void {
    this.props.failedLoginCount = failedLoginCount;
    this.props.lockedUntil = lockedUntil;
  }

  resetFailedAttempts(): void {
    this.props.failedLoginCount = 0;
  }

  changePassword(passwordHash: string, now: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.passwordChangedAt = now;
    this.props.updatedAt = now;
  }

  unlock(): void {
    this.props.lockedUntil = null;
    this.props.failedLoginCount = 0;
  }
}
