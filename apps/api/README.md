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

## Base de datos (Prisma + PostgreSQL)

`DatabaseModule` expone un `PrismaService` global (conecta en `onModuleInit`, desconecta en `onModuleDestroy`). `modules/users` usa `PrismaUsersRepository` como implementación de `UsersRepositoryPort` — el mismo puerto que `InMemoryUsersRepository`, que se sigue usando en los tests unitarios de los use cases (instanciada directamente, sin pasar por Nest DI).

Requiere una instancia de PostgreSQL accesible vía `DATABASE_URL` (ver `.env.example`). En local, con Postgres nativo (Homebrew) ya corriendo:

```bash
createdb ultimatecanvas   # una sola vez, si la base no existe
```

Comandos (desde `apps/api`, o con `pnpm --filter @ucanvas/api <script>` desde la raíz):

- `pnpm db:migrate` — crea y aplica una migración a partir de `prisma/schema.prisma` (dev).
- `pnpm db:migrate:deploy` — aplica migraciones pendientes sin generar una nueva (CI/producción).
- `pnpm db:generate` — regenera el Prisma Client tras cambiar el schema.
- `pnpm db:seed` — siembra los 3 usuarios de ejemplo (`prisma/seed.ts`, misma data que `createDemoUsers()`), verificados y con la contraseña de desarrollo `Demo-canvas-2026` (solo local).
- `pnpm db:studio` — abre Prisma Studio para inspeccionar la base.

## Autenticación (`modules/auth`)

Spec, plan y contratos en `specs/001-user-auth/`. Resumen de lo que hay que saber para trabajar con el API:

**Modelo de sesión** (research R2)

- `POST /api/v1/auth/login` devuelve un **token de acceso** JWT corto (`JWT_EXPIRES_IN`, 15 min por defecto; payload `{ sub, sid }`) y fija la cookie **`ucanvas_session`** (`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` en producción) con un token opaco cuya huella SHA-256 vive en `sessions`.
  - Sin "mantener sesión iniciada": cookie de sesión del navegador + cierre tras **2 h sin actividad**.
  - Con "mantener sesión iniciada": cookie de **30 días** desde el inicio de sesión.
- `POST /auth/refresh` (cookie + cabecera `X-Requested-With: ucanvas`) emite un token de acceso nuevo.
- `JwtStrategy` (`modules/auth/infrastructure/jwt.strategy.ts`) comprueba **en cada petición** que la sesión `sid` sigue activa: logout, recuperación y cambio de contraseña cortan el acceso al instante.
- Contraseñas con **Argon2id**; los enlaces de correo y las sesiones se guardan solo como hash.

**Rutas protegidas por defecto**

`JwtAuthGuard` es global (`APP_GUARD` en `app.module.ts`, después del `ThrottlerGuard`). Todo endpoint exige `Authorization: Bearer <token>` salvo que lleve `@Public()` (`common/decorators/public.decorator.ts`). Para leer el usuario: `@CurrentUser() user: AuthenticatedUser` → `{ userId, sessionId }`.

**Variables de entorno nuevas** (ver `.env.example`)

| Variable         | Uso                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_WEB_URL`    | Base de los enlaces de los correos (`/verify-email`, `/reset-password`…)                                                                                                               |
| `MAIL_TRANSPORT` | `console` (dev/test: el correo y su enlace salen en el log del API) o `smtp`. `console` está prohibido con `NODE_ENV=production`                                                       |
| `SMTP_URL`       | Obligatoria con `smtp`. En local se puede usar Mailpit: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit` → `SMTP_URL=smtp://localhost:1025`, bandeja en http://localhost:8025 |
| `MAIL_FROM`      | Remitente                                                                                                                                                                              |
| `TRUST_PROXY`    | `true` detrás de un proxy inverso (nginx del contenedor web) para usar la IP real                                                                                                      |

`JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` ya no se usan.

**Correos**

Salen por `MailDispatcher`: cola en memoria, sin esperar al SMTP (para que el tiempo de respuesta no delate si un correo existe), con 3 reintentos (1 s, 5 s, 25 s). Cada envío deja una línea de log `{"event":"mail.sent"|"mail.failed","kind","attempts","latencyMs"}` sin destinatario ni enlace. Para medir SC-002 (95 % en menos de 1 minuto) basta con el percentil 95 de `latencyMs` de las líneas `mail.sent`. **Limitación conocida**: los correos pendientes se pierden si el proceso se reinicia (siguiente paso: tabla outbox).

Límite por dirección: 3 correos por hora y tipo (verificación, recuperación, aviso de intento de registro) y 60 s entre dos; por encima no se envía nada y la respuesta HTTP no cambia.

**Tests e2e**

`pnpm --filter @ucanvas/api test:e2e` usa una base **separada**: `DATABASE_URL_TEST`, o la de `.env` con el nombre terminado en `_test` (p. ej. `ultimatecanvas_test`). Se niega a correr contra una base cuyo nombre no termine en `_test`. Créala una vez con `createdb ultimatecanvas_test`; las migraciones se aplican solas al empezar. El throttling se desactiva en e2e (`THROTTLE_DISABLED=true`). El test de enumeración admite `ENUMERATION_MAX_MEDIAN_GAP_MS` (50 ms por defecto) para máquinas de CI lentas.

## Migrar de in-memory a una base real (plantilla para módulos nuevos)

Cuando un módulo nuevo pase de `InMemory<Dominio>Repository` a Postgres (siguiendo el patrón ya aplicado en `users`):

1. Añade el modelo a `prisma/schema.prisma` y corre `pnpm db:migrate`.
2. Implementa `Prisma<Dominio>Repository implements <Dominio>RepositoryPort` en `infrastructure/`, mapeando fila ↔ entidad de dominio dentro del propio adaptador (el dominio nunca ve tipos de Prisma), inyectando `PrismaService`.
3. Cambia una única línea en `<dominio>.module.ts`: `{ provide: X_REPOSITORY, useClass: Prisma<Dominio>Repository }`.
4. Nada en `application/`, `domain/` o `presentation/` necesita tocarse.

## Comandos

- `pnpm --filter @ucanvas/api dev` — levanta la API con watch (`/api/v1/...`, Swagger en `/docs`).
- `pnpm --filter @ucanvas/api test` — tests unitarios (use cases + entidades de dominio).
- `pnpm --filter @ucanvas/api test:e2e` — tests e2e contra la base `*_test` (ver Autenticación).
- `pnpm --filter @ucanvas/api typecheck` / `lint`.
