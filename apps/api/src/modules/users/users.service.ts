import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

/**
 * Reference implementation using an in-memory store.
 * Swap for a real repository once DatabaseModule is implemented —
 * the controller/DTO contract should not need to change.
 */
@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserEntity>();

  findAll(): UserEntity[] {
    return [...this.users.values()];
  }

  findOne(id: string): UserEntity {
    const user = this.users.get(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  create(dto: CreateUserDto): UserEntity {
    const now = new Date().toISOString();
    const user: UserEntity = {
      id: randomUUID(),
      email: dto.email,
      name: dto.name,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  update(id: string, dto: UpdateUserDto): UserEntity {
    const user = this.findOne(id);
    const updated: UserEntity = {
      ...user,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    this.findOne(id);
    this.users.delete(id);
  }
}
