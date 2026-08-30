# apps/api

NestJS API. Arquitectura hexagonal pragmática: cada módulo de negocio se organiza en capas (`presentation → application → domain`, con `infrastructure` implementando los puertos que `application` declara), con interfaces (puertos) solo donde el cambio de implementación es realista — hoy, el repositorio de datos.

`modules/users` es el módulo de referencia. Cópialo como plantilla para cualquier módulo nuevo.

## Estructura de un módulo

```
modules/<dominio>/
├── <dominio>.module.ts          # único lugar que conoce la implementación concreta del puerto
├── presentation/                # adaptador de entrada (HTTP)
│   ├── <dominio>.controller.ts  # valida input (DTO), llama al use case, devuelve DTO de salida
│   └── dto/
│       ├── create-*.dto.ts      # implementa el tipo derivado del schema zod de @ucanvas/shared
│       ├── update-*.dto.ts
│       └── *-response.dto.ts    # implementa el tipo de @ucanvas/shared + fromDomain() mapper
├── application/                 # lógica de negocio (el centro)
│   ├── use-cases/
│   │   └── <verbo>-<dominio>.use-case.ts   # una clase por operación, con .execute()
│   └── ports/
│       └── <dominio>.repository.port.ts    # interface + Symbol token
├── domain/                      # entidades y reglas puras (TypeScript plano, cero imports de NestJS/ORM)
│   ├── <dominio>.entity.ts      # invariantes: la entidad valida sus propias transiciones de estado
│   └── <dominio>.errors.ts      # errores de dominio (extienden DomainError, nunca HttpException)
└── infrastructure/
    ├── in-memory-<dominio>.repository.ts    # implementa el puerto — usado por defecto y en tests
    └── prisma-<dominio>.repository.ts       # (cuando exista Prisma) implementa el mismo puerto
```

### Reglas de capas

| Capa           | Puede importar                                                   | Nunca importa                              | Sabe sobre                                |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| presentation   | application, dto, common                                         | infrastructure, internals de otros módulos | HTTP, Swagger, class-validator            |
| application    | domain, sus propios ports, shared/ports                          | @Res/Request, Prisma, TypeORM              | orquestación de casos de uso              |
| domain         | nada externo (TS plano)                                          | NestJS, ORM, HTTP                          | invariantes, comportamiento de la entidad |
| infrastructure | domain (para mapear), ports de application (para implementarlos) | presentation                               | SQL/Prisma/clientes HTTP                  |

- El controller no contiene lógica de negocio ni queries.
- Los use cases lanzan **errores de dominio** (`extends DomainError`), nunca `HttpException`. El filtro global (`common/filters/http-exception.filter.ts`) los traduce a HTTP leyendo `httpStatus` de forma duck-typed — no necesita importar nada de cada módulo.
- Los DTOs de request/response implementan (`implements`) el tipo inferido del schema zod correspondiente en `@ucanvas/shared`. Nunca dupliques el shape a mano: si el contrato cambia, TypeScript marcará el DTO como incompleto.

## Cómo crear un módulo nuevo (paso a paso)

Usando `orders` como ejemplo:

1. **Contrato compartido**: define el schema zod en `packages/shared/src/schemas/order.schema.ts` (`orderSchema`, `createOrderSchema`, `updateOrderSchema` + los tipos inferidos) y expórtalo desde `packages/shared/src/index.ts`. Corre `pnpm --filter @ucanvas/shared build`.
2. **Domain**: crea `domain/order.entity.ts` (clase plana con al menos un método de comportamiento que valide su propia transición de estado) y `domain/order.errors.ts` (`OrderNotFoundError`, etc., extendiendo `DomainError`).
3. **Application**:
   - `application/ports/orders.repository.port.ts`: interfaz + `Symbol` token.
   - `application/use-cases/*.ts`: una clase `@Injectable()` por operación (`create-order.use-case.ts`, `list-orders.use-case.ts`, ...), cada una inyectando el puerto vía `@Inject(ORDERS_REPOSITORY)`.
4. **Infrastructure**: `infrastructure/in-memory-orders.repository.ts` implementando el puerto (incluye un método `seed(...)` para tests). Cuando exista la base de datos real, añade `infrastructure/prisma-orders.repository.ts` implementando el mismo puerto — la lógica de negocio no cambia.
5. **Presentation**:
   - `presentation/dto/create-order.dto.ts` / `update-order.dto.ts`: `implements` el tipo de `@ucanvas/shared`, decorados con `class-validator` + `@ApiProperty`.
   - `presentation/dto/order-response.dto.ts`: `implements` el tipo `Order` de `@ucanvas/shared`, con `@ApiProperty` en cada campo y un `static fromDomain(order: Order): OrderResponseDto`.
   - `presentation/orders.controller.ts`: `@ApiTags('orders')`, inyecta los use cases (uno por operación), cada endpoint con `@ApiOperation` + `@ApiResponse` (incluyendo los códigos de error de dominio, p. ej. 404/409).
6. **Wiring**: `orders.module.ts` — declara los use cases como providers, enlaza `{ provide: ORDERS_REPOSITORY, useClass: InMemoryOrdersRepository }`, registra el controller, y exporta solo lo que otros módulos necesiten consumir. Regístralo en `app.module.ts`.
7. **Tests**: por cada use case, un `.spec.ts` que instancia `new XUseCase(new InMemoryOrdersRepository())` — sin `TestingModule`, sin mocks de framework. Añade también un `.spec.ts` para la entidad de dominio si tiene invariantes no triviales.
8. **Verifica**: `pnpm --filter @ucanvas/api typecheck && pnpm --filter @ucanvas/api lint && pnpm --filter @ucanvas/api test`, luego levanta `pnpm --filter @ucanvas/api dev` y confirma en `/docs` que el módulo aparece documentado.

## Migrar de in-memory a una base real

Cuando `DatabaseModule` tenga un cliente Prisma/TypeORM configurado:

1. Implementa `Prisma<Dominio>Repository implements <Dominio>RepositoryPort`, mapeando fila ↔ entidad de dominio dentro del propio adaptador (el dominio nunca ve tipos de Prisma).
2. Cambia una única línea en `<dominio>.module.ts`: `{ provide: X_REPOSITORY, useClass: Prisma<Dominio>Repository }`.
3. Nada en `application/`, `domain/` o `presentation/` necesita tocarse.

## Comandos

- `pnpm --filter @ucanvas/api dev` — levanta la API con watch (`/api/v1/...`, Swagger en `/docs`).
- `pnpm --filter @ucanvas/api test` — tests unitarios (use cases + entidades de dominio).
- `pnpm --filter @ucanvas/api typecheck` / `lint`.
