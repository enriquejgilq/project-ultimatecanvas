import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
  });

  it('creates and finds a user', () => {
    const created = service.create({ email: 'ada@example.com', name: 'Ada Lovelace' });
    expect(service.findOne(created.id)).toEqual(created);
  });

  it('throws when a user does not exist', () => {
    expect(() => service.findOne('missing-id')).toThrow(NotFoundException);
  });

  it('updates a user', () => {
    const created = service.create({ email: 'ada@example.com', name: 'Ada Lovelace' });
    const updated = service.update(created.id, { name: 'Ada L.' });
    expect(updated.name).toBe('Ada L.');
  });

  it('removes a user', () => {
    const created = service.create({ email: 'ada@example.com', name: 'Ada Lovelace' });
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow(NotFoundException);
  });
});
