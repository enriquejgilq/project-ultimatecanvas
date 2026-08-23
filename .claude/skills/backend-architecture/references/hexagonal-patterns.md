# Pragmatic Hexagonal Patterns — Full Code Examples

Complete reference implementation of one module (`orders`) following the pragmatic hexagonal structure. Copy/adapt when generating modules.

## Domain layer (plain TypeScript, zero imports from frameworks)

`modules/orders/domain/order.errors.ts`
```typescript
export class DomainError extends Error {}

export class OrderNotFoundError extends DomainError {
  constructor(id: string) { super(`Order ${id} not found`); }
}

export class OrderNotCancellableError extends DomainError {
  constructor(status: string) { super(`Cannot cancel an order in status "${status}"`); }
}
```

`modules/orders/domain/order.entity.ts`
```typescript
import { OrderNotCancellableError } from './order.errors';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public status: OrderStatus,
    public readonly totalCents: number,
    public readonly createdAt: Date,
  ) {}

  // Behavior lives here — the entity protects its own invariants
  cancel(): void {
    if (this.status === 'shipped' || this.status === 'cancelled') {
      throw new OrderNotCancellableError(this.status);
    }
    this.status = 'cancelled';
  }

  markPaid(): void {
    if (this.status !== 'pending') throw new DomainError('Only pending orders can be paid');
    this.status = 'paid';
  }
}
```

## Application layer (use cases + ports)

`modules/orders/application/ports/orders.repository.port.ts`
```typescript
import { Order } from '../../domain/order.entity';

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface OrdersRepositoryPort {
  findById(id: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<Order>;
}
```

`modules/orders/application/orders.service.ts`
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY, OrdersRepositoryPort } from './ports/orders.repository.port';
import { EMAIL_PORT, EmailPort } from '@/shared/ports/email.port';
import { Order } from '../domain/order.entity';
import { OrderNotFoundError } from '../domain/order.errors';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly orders: OrdersRepositoryPort,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  async cancelOrder(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new OrderNotFoundError(id);

    order.cancel();                       // domain rule enforced by the entity
    const saved = await this.orders.save(order);
    await this.email.send(order.customerId, 'Tu pedido fue cancelado');
    return saved;
  }
}
```

Note: no `HttpException`, no Prisma, no `@Res()`. Pure orchestration.

## Presentation layer (HTTP adapter)

`modules/orders/presentation/dto/create-order.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'a3f1...' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 4990, description: 'Total in cents' })
  @IsInt()
  @Min(1)
  totalCents: number;
}
```

`modules/orders/presentation/orders.controller.ts`
```typescript
import { Controller, Param, Post, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from '../application/orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelOrder(id);   // interceptor global envuelve en { success, data }
  }
}
```

## Infrastructure layer (concrete adapter)

`modules/orders/infrastructure/prisma-orders.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OrdersRepositoryPort } from '../application/ports/orders.repository.port';
import { Order, OrderStatus } from '../domain/order.entity';

@Injectable()
export class PrismaOrdersRepository implements OrdersRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({ where: { customerId } });
    return rows.map((r) => this.toDomain(r));
  }

  async save(order: Order): Promise<Order> {
    const row = await this.prisma.order.upsert({
      where: { id: order.id },
      create: { id: order.id, customerId: order.customerId, status: order.status, totalCents: order.totalCents, createdAt: order.createdAt },
      update: { status: order.status },
    });
    return this.toDomain(row);
  }

  private toDomain(row: { id: string; customerId: string; status: string; totalCents: number; createdAt: Date }): Order {
    return new Order(row.id, row.customerId, row.status as OrderStatus, row.totalCents, row.createdAt);
  }
}
```

The mapping (`toDomain`) lives in the adapter — the domain never sees Prisma types.

## In-memory fake (for unit tests — generate one per port)

`modules/orders/infrastructure/in-memory-orders.repository.ts`
```typescript
import { OrdersRepositoryPort } from '../application/ports/orders.repository.port';
import { Order } from '../domain/order.entity';

export class InMemoryOrdersRepository implements OrdersRepositoryPort {
  private store = new Map<string, Order>();

  async findById(id: string) { return this.store.get(id) ?? null; }
  async findByCustomer(customerId: string) {
    return [...this.store.values()].filter((o) => o.customerId === customerId);
  }
  async save(order: Order) { this.store.set(order.id, order); return order; }

  seed(...orders: Order[]) { orders.forEach((o) => this.store.set(o.id, o)); }
}
```

## Module wiring (the ONLY place implementations are known)

`modules/orders/orders.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { OrdersController } from './presentation/orders.controller';
import { OrdersService } from './application/orders.service';
import { ORDERS_REPOSITORY } from './application/ports/orders.repository.port';
import { PrismaOrdersRepository } from './infrastructure/prisma-orders.repository';
import { DatabaseModule } from '@/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
  ],
  exports: [OrdersService], // lo único que otros módulos pueden usar
})
export class OrdersModule {}
```

## Shared port + adapter (external service)

`shared/ports/email.port.ts`
```typescript
export const EMAIL_PORT = Symbol('EMAIL_PORT');
export interface EmailPort {
  send(to: string, message: string): Promise<void>;
}
```

`infrastructure/email/smtp-email.adapter.ts`
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EmailPort } from '@/shared/ports/email.port';

@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  async send(to: string, message: string): Promise<void> {
    // nodemailer/SES/etc. aquí; config vía env
    this.logger.log(`Email to ${to}: ${message}`);
  }
}
```

Bind it globally or per-module: `{ provide: EMAIL_PORT, useClass: SmtpEmailAdapter }`.

## Domain errors → HTTP (filter in common/)

`common/filters/domain-exception.filter.ts`
```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { DomainError, OrderNotFoundError, OrderNotCancellableError } from '@/modules/orders/domain/order.errors';

const STATUS_MAP = new Map<Function, number>([
  [OrderNotFoundError, HttpStatus.NOT_FOUND],
  [OrderNotCancellableError, HttpStatus.CONFLICT],
]);

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const status = STATUS_MAP.get(exception.constructor) ?? HttpStatus.UNPROCESSABLE_ENTITY;
    res.status(status).json({ success: false, data: null, error: exception.message });
  }
}
```

As modules grow, prefer each module registering its own error→status map (e.g. a static map exported next to the errors) to avoid this file importing every module.

## Service unit test (fast, no DB, no NestJS TestingModule)

`modules/orders/application/orders.service.spec.ts`
```typescript
import { OrdersService } from './orders.service';
import { InMemoryOrdersRepository } from '../infrastructure/in-memory-orders.repository';
import { Order } from '../domain/order.entity';
import { OrderNotCancellableError } from '../domain/order.errors';

class FakeEmail { sent: string[] = []; async send(to: string, msg: string) { this.sent.push(`${to}:${msg}`); } }

describe('OrdersService.cancelOrder', () => {
  it('cancels a pending order and notifies', async () => {
    const repo = new InMemoryOrdersRepository();
    const email = new FakeEmail();
    repo.seed(new Order('o1', 'c1', 'pending', 1000, new Date()));
    const service = new OrdersService(repo, email);

    const result = await service.cancelOrder('o1');

    expect(result.status).toBe('cancelled');
    expect(email.sent).toHaveLength(1);
  });

  it('rejects cancelling a shipped order', async () => {
    const repo = new InMemoryOrdersRepository();
    repo.seed(new Order('o2', 'c1', 'shipped', 1000, new Date()));
    const service = new OrdersService(repo, new FakeEmail());

    await expect(service.cancelOrder('o2')).rejects.toBeInstanceOf(OrderNotCancellableError);
  });
});
```

Plain `new OrdersService(repo, email)` — the ports make DI trivial in tests.

## When to graduate a module to fuller hexagonal

Signals: many use cases in one service file, entities with heavy rules, multiple entry points (HTTP + queue + cron) hitting the same logic. Then, inside that module only: split `application/` into one use-case class per operation, add explicit command/result objects, and separate persistence models with mappers. Other modules stay pragmatic.
