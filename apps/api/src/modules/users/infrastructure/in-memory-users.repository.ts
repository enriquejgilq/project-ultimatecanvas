import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { UsersRepositoryPort } from '../application/ports/users.repository.port';

/**
 * Reference adapter for UsersRepositoryPort. Swap for a Prisma/TypeORM
 * implementation by changing the provider binding in users.module.ts —
 * use cases and controller stay untouched.
 */
@Injectable()
export class InMemoryUsersRepository implements UsersRepositoryPort {
  private readonly store = new Map<string, User>();

  async findAll(): Promise<User[]> {
    return [...this.store.values()];
  }

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.store.values()].find((user) => user.email === email) ?? null;
  }

  async save(user: User): Promise<User> {
    this.store.set(user.id, user);
    return user;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** Test helper — populates the store directly. */
  seed(...users: User[]): void {
    users.forEach((user) => this.store.set(user.id, user));
  }
}
