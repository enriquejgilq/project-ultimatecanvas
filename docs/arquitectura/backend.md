# Guía de arquitectura del backend

> Obligatoria para todo código en `apps/api`. Desarrolla la skill `backend-architecture` (hexagonal pragmática) con las reglas propias de este proyecto: grupos, permisos, límites de plan y contrato del API.
> Si esta guía y la skill se contradicen, manda esta guía. Si esta guía y la constitución se contradicen, manda la constitución.

---

## 1. La idea en una imagen

```
           ENTRADA                       CENTRO                          SALIDA
   ┌──────────────────────┐   ┌─────────────────────────────┐   ┌──────────────────────────┐
   │ presentation/        │   │ application/                │   │ infrastructure/          │
   │  Controller + DTOs   │──▶│  Service (casos de uso)     │──▶│  Prisma repositorio      │
   │  (HTTP, Swagger)     │   │  ports/ (interfaces)        │◀──│  implementa el puerto    │
   └──────────────────────┘   │         │                   │   └──────────────────────────┘
                              │         ▼                   │
                              │ domain/                     │
                              │  Entidades + errores        │
                              │  (TypeScript plano)         │
                              └─────────────────────────────┘
```

**Las dependencias siempre apuntan hacia el centro.** El dominio no conoce a nadie. La aplicación conoce al dominio y a sus puertos (interfaces). La infraestructura implementa los puertos. La presentación solo llama a la aplicación.

## 2. Estructura de un módulo

Un módulo por dominio de negocio, con sus capas adentro. Ejemplo real del proyecto:

```
apps/api/src/modules/canvas/
├── canvas.module.ts                      # wiring: único lugar que une puertos con adaptadores
├── presentation/
│   ├── canvas.controller.ts
│   └── dto/
│       ├── create-canvas.dto.ts
│       ├── update-card.dto.ts
│       └── canvas.response.ts            # forma de salida documentada en Swagger
├── application/
│   ├── canvas.service.ts                 # casos de uso
│   ├── canvas.service.spec.ts            # pruebas con fakes en memoria
│   └── ports/
│       └── canvas.repository.port.ts     # interface + token Symbol
├── domain/
│   ├── canvas.entity.ts                  # comportamiento e invariantes
│   ├── canvas.entity.spec.ts
│   ├── canvas-card.entity.ts
│   ├── canvas.errors.ts                  # errores de dominio
│   └── canvas.events.ts                  # eventos de dominio (si los hay)
├── infrastructure/
│   ├── prisma-canvas.repository.ts       # implementa el puerto
│   └── in-memory-canvas.repository.ts    # fake para pruebas
└── content/                              # contenido predefinido (solo si el módulo lo tiene)
    └── lean-canvas.es.json
```

Fuera de los módulos:

```
apps/api/src/
├── config/              # validación de variables de entorno
├── common/              # guards, decorators, filters, interceptors, pipes
├── database/            # PrismaService y DatabaseModule
├── shared/ports/        # (cuando haga falta) puertos usados por varios módulos: email, storage, payments, ai, transaction
├── infrastructure/      # (cuando haga falta) adaptadores compartidos: email, storage, payments, ai, queue
└── modules/             # un módulo por dominio
```

**Puertos de un solo módulo vs. compartidos:** un puerto que hoy usa un solo módulo vive dentro de él (por ejemplo, `modules/auth/application/ports/clock.port.ts` o `mailer.port.ts`). Cuando un segundo módulo lo necesita, se promueve a `shared/ports/` y su adaptador a `src/infrastructure/`, en un commit de refactor propio.

**Servicio o casos de uso:** un módulo pequeño usa un `<modulo>.service.ts`. Un módulo con muchos casos de uso (como `auth`) usa `application/use-cases/<accion>.use-case.ts`, un archivo por caso de uso con su `.spec.ts`, y `application/services/` para lógica de aplicación reutilizada entre casos de uso (por ejemplo, `login-attempts.service.ts`).

### Nombres de archivos y clases

| Qué            | Archivo                          | Clase / símbolo                              |
| -------------- | -------------------------------- | -------------------------------------------- |
| Módulo         | `canvas.module.ts`               | `CanvasModule`                               |
| Controlador    | `canvas.controller.ts`           | `CanvasController`                           |
| DTO de entrada | `create-canvas.dto.ts`           | `CreateCanvasDto`                            |
| DTO de salida  | `canvas.response.ts`             | `CanvasResponse`                             |
| Servicio       | `canvas.service.ts`              | `CanvasService`                              |
| Puerto         | `canvas.repository.port.ts`      | `CanvasRepositoryPort` + `CANVAS_REPOSITORY` |
| Entidad        | `canvas.entity.ts`               | `Canvas`                                     |
| Errores        | `canvas.errors.ts`               | `CanvasNotFoundError`, …                     |
| Adaptador      | `prisma-canvas.repository.ts`    | `PrismaCanvasRepository`                     |
| Fake           | `in-memory-canvas.repository.ts` | `InMemoryCanvasRepository`                   |

Archivos en kebab-case, clases en PascalCase, código e identificadores en inglés. Los mensajes para el usuario van en español.

## 3. Reglas por capa

### 3.1 `domain/`: el corazón (TypeScript plano)

**Hace:** modelar entidades con comportamiento, proteger sus invariantes y lanzar errores de dominio.

**Nunca:** importa NestJS, Prisma, class-validator, librerías HTTP ni nada de `infrastructure/`. No hace I/O. No lee la hora del sistema directamente: recibe `now: Date` como parámetro, para que las pruebas sean deterministas.

```typescript
// domain/canvas.errors.ts
import { DomainError } from '../../../common/errors/domain-error';

export class CanvasNotFoundError extends DomainError {
  constructor(id: string) {
    super('NOT_FOUND', 'NOT_FOUND', 'No encontramos ese canvas.', { canvasId: id });
  }
}

export class BlockFullError extends DomainError {
  constructor() {
    super('DOMAIN_RULE', 'DOMAIN_RULE_VIOLATION', 'Este bloque ya tiene el máximo de 10 tarjetas.');
  }
}

export class EmptyBlockCannotBeCompletedError extends DomainError {
  constructor() {
    super(
      'DOMAIN_RULE',
      'DOMAIN_RULE_VIOLATION',
      'Agrega al menos una tarjeta antes de marcar el bloque como completo.',
    );
  }
}
```

```typescript
// domain/canvas.entity.ts
export const MAX_CARDS_PER_BLOCK = 10;

export class Canvas {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public name: string,
    public status: CanvasStatus,
    private readonly blocks: CanvasBlock[],
  ) {}

  addCard(blockType: BlockType, card: CanvasCard): void {
    const block = this.block(blockType);
    if (block.cards.length >= MAX_CARDS_PER_BLOCK) throw new BlockFullError();
    block.cards.push(card);
    if (block.status === 'EMPTY') block.status = 'IN_PROGRESS';
  }

  markBlockComplete(blockType: BlockType, now: Date): void {
    const block = this.block(blockType);
    if (block.cards.length === 0) throw new EmptyBlockCannotBeCompletedError();
    block.status = 'COMPLETE';
    block.completedAt = now;
  }

  progress(): number {
    const done = this.blocks.filter((b) => b.status === 'COMPLETE').length;
    return Math.round((done / this.blocks.length) * 100);
  }

  archive(): void {
    if (this.status === 'ARCHIVED') throw new CanvasAlreadyArchivedError();
    this.status = 'ARCHIVED';
  }

  private block(type: BlockType): CanvasBlock {
    /* … */
  }
}
```

**Regla clave:** el servicio nunca cambia campos de una entidad directamente (`canvas.status = 'ARCHIVED'`). Siempre llama a un método de la entidad (`canvas.archive()`), que valida la transición.

### 3.2 `application/`: los casos de uso

**Hace:** orquestar: cargar entidades con los repositorios, llamar a su comportamiento, guardar, emitir eventos y llamar a servicios externos mediante puertos.

**Nunca:** importa Prisma, `Request`, `Response` ni `@Res()`; tampoco lanza `HttpException` ni contiene SQL o consultas. No conoce códigos HTTP.

```typescript
// application/ports/canvas.repository.port.ts
export const CANVAS_REPOSITORY = Symbol('CANVAS_REPOSITORY');

export interface CanvasRepositoryPort {
  findById(workspaceId: string, id: string): Promise<Canvas | null>;
  list(workspaceId: string, query: ListCanvasQuery): Promise<Page<CanvasSummary>>;
  countActive(workspaceId: string): Promise<number>;
  save(canvas: Canvas): Promise<void>;
}
```

```typescript
// application/canvas.service.ts
@Injectable()
export class CanvasService {
  constructor(
    @Inject(CANVAS_REPOSITORY) private readonly canvases: CanvasRepositoryPort,
    @Inject(TRANSACTION_MANAGER) private readonly tx: TransactionManager,
    private readonly entitlements: EntitlementsService, // servicio exportado por el módulo billing
    private readonly events: DomainEventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(ctx: MembershipContext, input: CreateCanvasInput): Promise<Canvas> {
    return this.tx.run(async () => {
      await this.entitlements.assert(ctx.workspaceId, 'canvas.active'); // límite del plan (fase 006)
      const canvas = Canvas.create({
        workspaceId: ctx.workspaceId,
        ...input,
        createdBy: ctx.userId,
      });
      await this.canvases.save(canvas);
      this.events.publish(new CanvasCreated(canvas.id, ctx.workspaceId, ctx.userId));
      return canvas;
    });
  }

  async markBlockComplete(
    ctx: MembershipContext,
    canvasId: string,
    type: BlockType,
  ): Promise<Canvas> {
    const canvas = await this.getOrFail(ctx.workspaceId, canvasId);
    canvas.markBlockComplete(type, this.clock.now()); // la regla vive en la entidad
    await this.canvases.save(canvas);
    return canvas;
  }

  private async getOrFail(workspaceId: string, id: string): Promise<Canvas> {
    const canvas = await this.canvases.findById(workspaceId, id);
    if (!canvas) throw new CanvasNotFoundError(id); // también si es de otro grupo → 404
    return canvas;
  }
}
```

Reglas:

- **Todo método que toca datos de grupo recibe el `MembershipContext`** (`userId`, `workspaceId`, `roleId`) como primer parámetro y pasa `workspaceId` al repositorio. No existe ningún método de repositorio de datos de grupo sin `workspaceId`.
- Si un servicio supera unos 300 líneas o 8 casos de uso, se divide en clases de caso de uso (`create-canvas.use-case.ts`) solo dentro de ese módulo.
- Las entradas del servicio son tipos propios (`CreateCanvasInput`), no los DTOs de presentación.

### 3.3 `infrastructure/`: los adaptadores

**Hace:** implementar los puertos con Prisma o con clientes externos, y traducir filas de la base de datos a entidades (`toDomain`) y entidades a filas (`toPersistence`).

**Nunca:** contiene reglas de negocio, lanza errores HTTP ni es importado por `presentation/` o `application/`.

```typescript
// infrastructure/prisma-canvas.repository.ts
@Injectable()
export class PrismaCanvasRepository implements CanvasRepositoryPort {
  constructor(private readonly db: PrismaTxClient) {} // usa la transacción activa si existe

  async findById(workspaceId: string, id: string): Promise<Canvas | null> {
    const row = await this.db.client.canvas.findFirst({
      where: { id, workspaceId }, // SIEMPRE filtrar por grupo
      include: { blocks: { include: { cards: { orderBy: { position: 'asc' } } } } },
    });
    return row ? CanvasMapper.toDomain(row) : null;
  }
  // …
}
```

- Las consultas usan `findFirst({ where: { id, workspaceId } })`, **nunca** `findUnique({ where: { id } })` sobre datos de grupo.
- Los tipos de Prisma no salen del adaptador.
- Cada puerto tiene su fake `InMemory*` en la misma carpeta, con un método `seed(...)` para las pruebas.

### 3.4 `presentation/`: el adaptador HTTP

**Hace:** declarar rutas, validar con DTOs, aplicar decoradores de permisos y límites, extraer el contexto, llamar al servicio y devolver el resultado.

**Nunca:** contiene lógica de negocio, consultas, `try/catch` para traducir errores (eso lo hace el filtro global) ni construye manualmente `{ success, data }` (eso lo hace el interceptor).

```typescript
// presentation/canvas.controller.ts
@ApiTags('canvas')
@ApiBearerAuth()
@Controller('canvases')
export class CanvasController {
  constructor(private readonly service: CanvasService) {}

  @Post()
  @RequirePermission('canvas:create')
  @ApiOperation({ summary: 'Crear un canvas en el grupo activo' })
  @ApiCreatedResponse({ type: CanvasResponse })
  async create(
    @CurrentMembership() ctx: MembershipContext,
    @Body() dto: CreateCanvasDto,
  ): Promise<CanvasResponse> {
    const canvas = await this.service.create(ctx, {
      name: dto.name,
      ideaDescription: dto.ideaDescription ?? null,
    });
    return CanvasResponse.from(canvas);
  }

  @Post(':id/blocks/:type/complete')
  @RequirePermission('canvas:edit')
  @ApiOperation({ summary: 'Marcar un bloque como completo' })
  async completeBlock(
    @CurrentMembership() ctx: MembershipContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type', new ParseEnumPipe(BlockType)) type: BlockType,
  ): Promise<CanvasResponse> {
    return CanvasResponse.from(await this.service.markBlockComplete(ctx, id, type));
  }
}
```

```typescript
// presentation/dto/create-canvas.dto.ts
export class CreateCanvasDto {
  @ApiProperty({ example: 'App de inventario para restaurantes', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ideaDescription?: string;
}
```

- Todo DTO lleva `@ApiProperty` y validaciones. Todo controlador lleva `@ApiTags`; toda ruta, `@ApiOperation` y su respuesta documentada.
- Las respuestas se construyen con clases `*Response` (`CanvasResponse.from(entity)`); nunca se devuelve la entidad ni la fila de Prisma directamente.
- Los parámetros se validan con pipes: `ParseUUIDPipe` y `ParseEnumPipe`.

## 4. Pipeline de cada petición

Toda petición a datos de grupo pasa por este orden, sin excepciones:

```
JwtAuthGuard            → ¿sesión válida?                        sino 401 UNAUTHENTICATED
WorkspaceContextGuard   → ¿es miembro del grupo X-Workspace-Id?  sino 404 WORKSPACE_NOT_FOUND
PermissionsGuard        → ¿su rol tiene el permiso declarado?    sino 403 FORBIDDEN
ValidationPipe          → ¿el DTO es válido?                     sino 400 VALIDATION_ERROR
Controller → Service    → límites del plan dentro del caso de uso  sino 409 PLAN_LIMIT_REACHED
DomainExceptionFilter   → traduce los errores de dominio a HTTP
TransformInterceptor    → envuelve en { success, data, error, meta }
```

Decoradores disponibles:

| Decorador                              | Uso                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@Public()`                            | Ruta sin sesión (login, registro, enlaces de correo).                                     |
| `@NoWorkspace()`                       | Ruta con sesión pero sin grupo (perfil, lista de mis grupos).                             |
| `@RequirePermission('recurso:accion')` | Obligatorio en toda ruta de datos de grupo.                                               |
| `@NoPermissionRequired()`              | Ruta de grupo que cualquier miembro puede usar. Se usa explícitamente, nunca por omisión. |
| `@CurrentUser()`                       | Usuario autenticado.                                                                      |
| `@CurrentMembership()`                 | `MembershipContext` del grupo activo.                                                     |

**Denegar por defecto:** una ruta de grupo sin `@RequirePermission` ni `@NoPermissionRequired` responde 403. Una prueba automatizada recorre todas las rutas y falla si alguna no declara su permiso.

## 5. Errores

> **Estado actual:** el módulo `auth` (fase 001) usa un modelo anterior: `AuthDomainError` con `httpStatus` y el `HttpExceptionFilter` lo reconoce por esa propiedad. El modelo de esta sección (`DomainError` con `kind` neutral + `DomainExceptionFilter`) es el objetivo y se aplica a todo módulo nuevo. `auth` se migra en un refactor dedicado; hasta entonces, el filtro debe aceptar ambos modelos.

```typescript
// common/errors/domain-error.ts
export type DomainErrorKind =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EDIT_CONFLICT'
  | 'DOMAIN_RULE'
  | 'FORBIDDEN'
  | 'LIMIT'
  | 'UNAVAILABLE';

export abstract class DomainError extends Error {
  constructor(
    public readonly kind: DomainErrorKind, // categoría neutral, sin HTTP
    public readonly code: ErrorCode, // del catálogo de packages/shared
    message: string, // en español, apto para el usuario
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
```

- El dominio y la aplicación lanzan **solo** subclases de `DomainError`.
- `DomainExceptionFilter` traduce `kind` a HTTP: `NOT_FOUND`→404, `CONFLICT`/`EDIT_CONFLICT`/`LIMIT`→409, `DOMAIN_RULE`→422, `FORBIDDEN`→403, `UNAVAILABLE`→503. Así, el filtro no necesita importar los errores de cada módulo.
- Cualquier otro error no controlado responde `500 INTERNAL_ERROR` con un mensaje genérico, y se registra completo en el log con su `requestId`.
- Los errores de servicios externos se capturan en el adaptador y se relanzan como `ExternalServiceUnavailableError` (kind `UNAVAILABLE`). Nunca llegan crudos al servicio.

## 6. Transacciones

Cuando un caso de uso modifica más de una entidad o verifica un límite antes de crear, va dentro de una transacción.

```typescript
// shared/ports/transaction.port.ts
export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}
```

- El adaptador de Prisma guarda el cliente de la transacción en un contexto asíncrono (`AsyncLocalStorage`, por ejemplo con `nestjs-cls`), y `PrismaTxClient.client` devuelve el cliente de la transacción activa o el normal. Así, los repositorios no reciben `tx` como parámetro.
- Los eventos de dominio se publican después del commit; si la transacción falla, no se publican.
- En las pruebas unitarias se usa un `FakeTransactionManager` que solo ejecuta `work()`.

## 7. Comunicación entre módulos

- Un módulo **nunca** importa archivos internos de otro (`modules/billing/infrastructure/...`). Solo usa lo que el otro declara en `exports`, normalmente su servicio.
- Para reaccionar a algo que pasó en otro módulo (por ejemplo, "una hipótesis fue invalidada → marcar la tarjeta del canvas"), se usan **eventos de dominio** mediante `DomainEventBus` (puerto) con un adaptador sobre el EventEmitter de NestJS.
- Los eventos se nombran en pasado (`ExperimentStarted`, `HypothesisInvalidated`), se definen en `domain/<modulo>.events.ts` y solo llevan IDs y datos mínimos, nunca entidades completas.
- Si dos módulos se necesitan mutuamente, es señal de que hay que mover algo: extraer un servicio compartido o usar eventos. Nunca se usa `forwardRef` entre módulos de negocio.

## 8. Servicios externos

Todo servicio externo va detrás de un puerto en `shared/ports/` con su adaptador en `infrastructure/`:

| Puerto         | Adaptador real              | Adaptador de desarrollo y pruebas      |
| -------------- | --------------------------- | -------------------------------------- |
| `EmailPort`    | SMTP o el proveedor elegido | Mailpit (local) / `FakeEmailAdapter`   |
| `StoragePort`  | Compatible con S3           | `LocalDiskStorageAdapter` / en memoria |
| `PaymentsPort` | Pasarela elegida (fase 011) | `FakePaymentsAdapter`                  |
| `AiPort`       | Proveedor de IA (fase 010)  | `FakeAiAdapter`                        |
| `Clock`        | `SystemClock`               | `FixedClock`                           |

- El adaptador real se elige por variable de entorno en el módulo de infraestructura; el código de negocio no se entera.
- Todo adaptador externo define un timeout, como máximo un reintento en errores transitorios, y traduce sus errores a `ExternalServiceUnavailableError`.
- Los puertos de IA y de pagos exponen métodos por caso de uso (`reviewBlock`, `createCheckout`), no un método genérico.

## 9. Base de datos (Prisma)

- Solo `infrastructure/` usa Prisma. `PrismaService` vive en `src/database/`.
- Toda tabla de datos de negocio tiene `workspaceId` con índice y clave foránea a `Workspace`.
- Todas las tablas tienen `id` (UUID), `createdAt` y `updatedAt`. Las que registran autoría también tienen `createdById` y `updatedById`.
- Los nombres de modelos van en PascalCase singular (`CanvasCard`), y los de tablas en snake_case plural con `@@map("canvas_cards")`.
- Cada cambio de esquema genera una migración con un nombre descriptivo (`pnpm prisma migrate dev --name add_canvas_versions`). Nunca se edita una migración ya aplicada.
- Las eliminaciones de entidades con periodo de gracia (cuentas, grupos) usan `deletedAt`. Las demás se eliminan de verdad, salvo que la spec diga lo contrario.
- Para evitar consultas N+1, las relaciones se cargan con `include` o `select` explícito. Nunca se hacen consultas dentro de un bucle.

## 10. Jobs y tareas programadas

- Los jobs viven en el módulo dueño de la lógica: `modules/notifications/infrastructure/jobs/send-reminders.job.ts`.
- El job solo dispara un caso de uso del servicio; la lógica está en `application/`, para poder probarla sin el programador.
- Todo job es **idempotente**: ejecutarlo dos veces produce el mismo resultado. Se garantiza con índices únicos o con registros de "ya procesado".
- Los jobs que recorren varios grupos procesan cada grupo por separado y nunca mezclan sus datos.

## 11. Seguridad

- Nunca se registran en logs contraseñas, tokens, contenido completo de canvas o evidencias, ni datos de tarjetas de pago.
- Los tokens de un solo uso se guardan solo como hash y se comparan en tiempo constante.
- Los endpoints públicos (`@Public()`) tienen rate limit específico, además del global.
- Todo valor que el usuario controla y llega a una consulta va por los parámetros de Prisma; nunca se usa `$queryRawUnsafe` con interpolación.
- Los archivos subidos se validan por su tipo real (no por la extensión) y por su tamaño, antes de procesarlos.
- Se registran en el historial del grupo o en `security_events` las acciones sensibles que indique la spec de cada fase.

## 12. Logs

- Se usa el `Logger` de NestJS; nunca `console.log`.
- Cada línea de log incluye `requestId` y, cuando aplica, `userId` y `workspaceId`.
- Niveles: `error` para lo inesperado, `warn` para fallos esperables (servicio externo caído), `log` para eventos de negocio relevantes y `debug` solo en desarrollo.

## 13. Pruebas

| Tipo                   | Qué cubre                                                   | Herramientas                      | Obligatorio                        |
| ---------------------- | ----------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| Unitaria de dominio    | Métodos de entidades e invariantes                          | Jest, TS plano                    | Toda entidad con comportamiento    |
| Unitaria de aplicación | Casos de uso con fakes de los puertos                       | Jest + `InMemory*` + `FixedClock` | Todo caso de uso                   |
| e2e                    | Flujos HTTP completos con base de datos de prueba           | supertest                         | Flujos críticos de cada spec       |
| Aislamiento            | Un miembro del grupo A no lee ni modifica datos del grupo B | supertest                         | **Todo módulo con datos de grupo** |
| Permisos               | Cada rol puede exactamente lo que dice la tabla de permisos | supertest parametrizado           | Toda ruta nueva de grupo           |

- Las pruebas unitarias crean los servicios con `new` y fakes, sin `Test.createTestingModule`.
- Nombres de pruebas en español, describiendo el comportamiento: `it('rechaza completar un bloque sin tarjetas')`.
- Cada prueba e2e crea sus propios datos y no depende del orden de ejecución.

## 14. Prohibido en el backend

- ❌ Lógica de negocio en controladores.
- ❌ Prisma, SQL o `HttpException` en `application/` o `domain/`.
- ❌ Imports de NestJS, Prisma o librerías externas en `domain/`.
- ❌ Consultas a datos de grupo sin filtrar por `workspaceId`.
- ❌ Rutas de grupo sin permiso declarado.
- ❌ Devolver entidades o filas de Prisma directamente en las respuestas.
- ❌ Importar archivos internos de otro módulo.
- ❌ Cambiar campos de una entidad desde el servicio sin pasar por un método de la entidad.
- ❌ `any`, `@ts-ignore` o `eslint-disable` sin un comentario que lo justifique.
- ❌ `console.log`, secretos en el código o valores de configuración fijos en lugar de variables de entorno.
- ❌ Crear un recurso con límite de plan sin pasar por `EntitlementsService`.
- ❌ Llamar a un servicio externo sin puerto.

## 15. Receta: crear un módulo nuevo

1. Crea la carpeta con las cuatro capas siguiendo la sección 2.
2. **Dominio:** entidad con sus métodos de comportamiento, errores de dominio y sus pruebas unitarias.
3. **Puerto** del repositorio con su token, y su fake `InMemory*`.
4. **Servicio** con los casos de uso, recibiendo `MembershipContext`, y sus pruebas con fakes.
5. **Adaptador Prisma**, con el mapper y filtrando siempre por `workspaceId`. Agrega la migración.
6. **DTOs y respuestas** con validaciones y Swagger. Los esquemas compartidos van en `packages/shared`.
7. **Controlador** con `@RequirePermission` en cada ruta y las verificaciones de límites que correspondan.
8. **Permisos nuevos** en `packages/shared/src/permissions.ts`, asignados a los roles predefinidos.
9. **Wiring** en `<modulo>.module.ts`, exportando solo el servicio.
10. **Pruebas e2e** del flujo principal, de aislamiento entre grupos y de permisos.
11. Revisa `checklist-feature.md` antes de dar la tarea por terminada.
