import { User } from '../../domain/user.entity';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepositoryPort {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
