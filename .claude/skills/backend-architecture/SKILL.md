---
name: backend-architecture
description: >
  Organize and build NestJS backends with pragmatic hexagonal architecture (ports & adapters lite):
  layered modules (controller, service/use-case, repository), domain isolation, and interfaces only
  where change is likely (database, external services). Use this skill whenever the user wants to:
  structure or reorganize a NestJS/Node backend, apply hexagonal/clean/onion architecture, create a
  new API module or endpoint, decide where business logic should live, add a repository or external
  service integration, or make the backend testable and decoupled from the database. Also trigger
  when the user mentions: arquitectura hexagonal, puertos y adaptadores, clean architecture, capas
  del backend, "organizar el backend", use cases, repositorio, dominio, or asks to create any new
  NestJS module/controller/service in a project that follows (or should follow) this structure.
  Works standalone or on top of a monorepo created with monorepo-scaffold (apply inside apps/api).
---

# Backend Architecture Skill (Pragmatic Hexagonal for NestJS)

Structure NestJS backends using hexagonal principles without the ceremony: clear layers inside each module, dependencies pointing inward, and ports (interfaces) only where swapping implementations is realistic. The goal is a backend that is testable, ordered, and cheap to change — not architectural purity.

Two jobs:
1. **Scaffold/reorganize** a backend to this structure.
2. **Place and build new code correctly** — when the user asks for any endpoint, module, or integration in a project using this structure, follow these rules.

## Core principles (the hexagonal essence we keep)

1. **Dependencies point inward**: controller → service → repository. Never the reverse. The domain never imports from infrastructure.
2. **The domain doesn't know the framework**: entities and business rules import nothing from NestJS, Prisma, or TypeORM. Plain TypeScript.
3. **Ports where change is likely**: database access and external services (email, payments, storage, third-party APIs) go behind interfaces. HTTP layer and internal wiring do NOT need interfaces — NestJS DI already decouples them.
4. **One module per business domain**, mirroring frontend features: `users`, `orders`, `payments`.

## What we deliberately DON'T do (pragmatic cuts)

- No interface for every service "just in case" — only for repositories and external adapters.
- No separate DTO↔domain↔persistence mappers with three model classes per concept, until a module actually needs different shapes. Start with one entity + DTOs.
- No `application/domain/infrastructure` mega-folders at the root splitting each concept across three trees. Layers live INSIDE each module — cohesion by domain, not by layer.
- If a module grows complex (many use cases, rich rules), it can graduate to fuller hexagonal internally without affecting others.

## The structure

Inside `apps/api/src/` (or `src/` standalone):

```
src/
├── main.ts / app.module.ts
├── config/                        # env validation, configuration (from monorepo-scaffold)
├── common/                        # filters, interceptors, guards, decorators, pipes
├── shared/
│   └── ports/                     # puertos GENÉRICOS multi-módulo
│       ├── email.port.ts          # interface EmailPort { send(...): Promise<void> }
│       └── storage.port.ts
├── infrastructure/                # adaptadores de salida COMPARTIDOS
│   ├── database/
│   │   ├── database.module.ts     # Prisma/TypeORM setup (único lugar que conoce el driver)
│   │   └── prisma.service.ts
│   ├── email/
│   │   └── smtp-email.adapter.ts  # implements EmailPort
│   └── storage/
└── modules/
    └── orders/                    # UN módulo por dominio de negocio
        ├── orders.module.ts       # wiring: bind ports → adapters aquí
        ├── presentation/          # ADAPTADOR DE ENTRADA (HTTP)
        │   ├── orders.controller.ts
        │   └── dto/               # create-order.dto.ts con class-validator + @ApiProperty
        ├── application/           # LÓGICA DE NEGOCIO (el centro)
        │   ├── orders.service.ts  # use cases; sin HTTP, sin SQL, sin Prisma
        │   └── ports/
        │       └── orders.repository.port.ts   # interface + token (Symbol)
        ├── domain/                # entidades y reglas puras (TS plano)
        │   ├── order.entity.ts    # invariantes: order.cancel() valida su propio estado
        │   └── order.errors.ts    # errores de dominio (no HttpException)
        └── infrastructure/        # ADAPTADOR DE SALIDA propio del módulo
            └── prisma-orders.repository.ts     # implements OrdersRepositoryPort
```

## Layer rules (enforce strictly)

| Layer | Can import | NEVER imports | Knows about |
|---|---|---|---|
| presentation | application, dto, common | infrastructure, other modules' internals | HTTP, Swagger, validation |
| application | domain, own ports, shared/ports | NestJS HTTP (@Res, Request), Prisma, TypeORM | business rules, orchestration |
| domain | nothing external (plain TS) | everything framework/db | invariants, entity behavior |
| infrastructure | domain (to map), application ports (to implement) | presentation | Prisma/SQL/HTTP clients |

- Controllers: validate input (DTO), call service, return. Zero business logic, zero queries.
- Services throw **domain errors** (`OrderNotFoundError`); an exception filter in `common/` maps them to HTTP status codes. Services never throw `HttpException`.
- Cross-module use: module A never imports B's repository or internals; it calls B's exported service (declared in B's module `exports`).

## The port pattern (full code in references/hexagonal-patterns.md)

```typescript
// application/ports/orders.repository.port.ts
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
export interface OrdersRepositoryPort {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// application/orders.service.ts
constructor(@Inject(ORDERS_REPOSITORY) private readonly repo: OrdersRepositoryPort) {}

// orders.module.ts — el ÚNICO lugar que conoce la implementación concreta
providers: [
  OrdersService,
  { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
]
```

Swapping Prisma → TypeORM → in-memory (tests) = changing one line in the module. That's the payoff.

## Testing strategy this enables

- **Unit (domain)**: entities tested as plain TS, no NestJS TestingModule needed.
- **Unit (application)**: services tested with in-memory fakes of their ports — no DB, fast.
- **e2e (presentation)**: supertest against the HTTP layer with a test database, only for critical flows.
Generate an `InMemoryOrdersRepository` alongside each repository port as the testing fake.

## Scaffolding workflow

When asked to set up or create a module:

1. Detect context: ¿monorepo (aplicar en `apps/api`)? ¿Prisma o TypeORM ya elegido? Respeta lo existente; si es proyecto de monorepo-scaffold, reutiliza `common/`, `config/` y el shape de respuesta `{ success, data, error }`.
2. For a new module, generate ALL layers: controller + DTOs (Swagger-documented), service with use cases, domain entity with at least one behavior method, repository port + concrete adapter + in-memory fake, module wiring, and unit tests for the service using the fake.
3. Domain entities get behavior, not just data: `order.cancel()` validates its own state transition instead of the service manipulating fields.
4. Shared external services (email, storage, payments): port in `shared/ports/`, adapter in `infrastructure/`, bound in the module that owns the integration.
5. If reorganizing an existing backend: classify each file by layer, move, fix imports. Business logic found in controllers moves to services; SQL/ORM calls found in services move behind a repository port. Never delete logic while moving.
6. Types shared with the frontend (request/response contracts) → `packages/shared` in monorepo.

## Quality checklist

- [ ] No business logic in controllers; no HTTP/ORM knowledge in services
- [ ] Domain entities are plain TS with behavior methods and domain errors
- [ ] Every repository/external service behind a port with Symbol token
- [ ] Concrete adapters bound only in module `providers`
- [ ] In-memory fake generated per repository port; service unit tests use it
- [ ] Domain errors mapped to HTTP by a common exception filter
- [ ] DTOs validated (class-validator) and documented (@ApiProperty)
- [ ] Modules only expose intended services via `exports`
