import { DomainError } from './user.errors';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/**
 * Plain domain entity: no NestJS, no Swagger, no ORM.
 * Invariants (valid email, non-empty name) are enforced here, not in the use cases.
 */
export class User {
  constructor(
    public readonly id: string,
    private _email: string,
    private _name: string,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get email(): string {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new DomainError('Name cannot be empty');
    this._name = trimmed;
    this._updatedAt = new Date();
  }

  changeEmail(email: string): void {
    if (!EMAIL_PATTERN.test(email)) throw new DomainError('Invalid email address');
    this._email = email;
    this._updatedAt = new Date();
  }
}
