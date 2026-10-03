# Ultimate Canvas Constitution

## Core Principles

### I. Las guías de arquitectura son vinculantes

- Todo cambio de código MUST cumplir las guías de `docs/arquitectura/` que le apliquen:
  `backend.md` y `contrato-api.md` para `apps/api`; `frontend.md`, `estados-ui.md` y
  `contrato-api.md` para `apps/web` y `packages/ui`; `contrato-api.md` para `packages/shared`.
- Ninguna feature se da por terminada sin pasar `docs/arquitectura/checklist-feature.md`.
- Violar una regla MUST/"nunca"/"prohibido" de una guía equivale a violar esta constitución:
  `/speckit-analyze` y `/speckit-converge` la reportan como **CRITICAL**.
- Precedencia: constitución > guías de `docs/arquitectura/` > skills. Una contradicción entre
  ellas se resuelve enmendando el documento de menor rango, nunca ignorándola.

**Razón:** las guías concentran las decisiones de arquitectura; sin una puerta formal, Spec Kit no las verifica.

### II. Fronteras del monorepo

- Todo componente visual reutilizable MUST vivir en `packages/ui` (Atomic Design + Storybook).
  `apps/web/src/components/` MUST NOT existir.
- `apps/web/src` solo contiene `features/`, `pages/`, `hooks/`, `lib/`, `utils/` y `routes/`
  (más `main.tsx`/`App.tsx`).
- `packages/ui` MUST NOT importar de `apps/*`, hacer fetch ni conocer el API.
- Los tipos, esquemas zod, códigos de error y constantes compartidos entre api y web MUST vivir en
  `packages/shared` y MUST NOT duplicarse.
- Una feature del frontend MUST NOT importar de otra; un módulo del backend MUST NOT importar
  archivos internos de otro (solo sus `exports` o eventos de dominio).

### III. Backend hexagonal: las dependencias apuntan al dominio

- `domain/` MUST ser TypeScript plano: sin NestJS, Prisma, class-validator, I/O ni lectura directa del reloj.
- `application/` MUST NOT importar Prisma, `Request`/`Response` ni lanzar `HttpException`.
- Las reglas de negocio viven en métodos de las entidades; los servicios MUST NOT mutar campos de
  una entidad directamente.
- Todo repositorio y todo servicio externo (correo, almacenamiento, pagos, IA, reloj) MUST estar
  detrás de un puerto con token y tener un fake `InMemory*`/`Fake*` para pruebas.
- Los controladores solo validan, extraen el contexto, llaman a la aplicación y devuelven una clase `*Response`.

### IV. Aislamiento por grupo y denegar por defecto

A partir de la fase que introduce los grupos (workspaces):

- Toda consulta a datos de grupo MUST filtrar por `workspaceId`. Un recurso de otro grupo MUST
  responder `404`, nunca `403`.
- Toda ruta de grupo MUST declarar `@RequirePermission` o `@NoPermissionRequired`; lo no declarado se niega.
- Todo recurso con límite de plan MUST pasar por `EntitlementsService` dentro de la transacción.
- Toda query key del frontend con datos de grupo MUST empezar con `['ws', workspaceId, …]`.
- La autorización real MUST estar en el backend; ocultar en la UI es solo comodidad.

### V. Un único contrato del API

- Toda respuesta MUST tener la forma `{ success, data, error, meta }` definida en `contrato-api.md`;
  los errores usan `code` del catálogo de `packages/shared`.
- Rutas bajo `/api/v1`, recursos en plural kebab-case, UUID como IDs, `PATCH` para actualizar (sin `PUT`).
- Un cambio de contrato MUST aplicarse en api, web y shared en el mismo commit.
- En el frontend, solo `lib/apiClient.ts` llama al API; los componentes MUST usar hooks
  (componente → hook → servicio → `apiClient`).

### VI. Interfaz completa en todos sus estados

- Todo componente con datos MUST implementar carga (skeleton), vacío y error, según `estados-ui.md`,
  con una historia de Storybook y una prueba por estado.
- Las vistas de features siguen el patrón contenedor + vista con `ViewState`.
- Cero colores, espaciados o radios fijos: todo MUST salir de los design tokens (CSS variables) de `packages/ui`.
- La interfaz MUST estar en español, dirigida al usuario de "tú", accesible por teclado y con
  contraste mínimo de 4.5:1. El código, los identificadores y los commits van en inglés.

### VII. Seguridad por defecto

- El frontend MUST NOT contener secretos: solo variables `VITE_*`.
- Nunca se registran contraseñas, tokens, contenido de canvas o evidencias ni datos de pago.
- Los tokens de un solo uso se guardan como hash y se comparan en tiempo constante.
- Los endpoints públicos tienen rate limit específico; nunca se usa `$queryRawUnsafe` con interpolación.
- Sin `any`, `@ts-ignore`, `eslint-disable` ni `console.log` sin un comentario que lo justifique.

### VIII. Pruebas como parte de la entrega

- Toda entidad con comportamiento y todo caso de uso MUST tener pruebas unitarias con fakes (sin
  `Test.createTestingModule`).
- Los flujos críticos de cada spec MUST tener pruebas e2e; todo módulo con datos de grupo MUST tener
  pruebas de aislamiento y de permisos.
- En el frontend: una prueba por estado de cada vista e integración del flujo principal con MSW.

### IX. Alcance estricto por fase

- No se construye nada que la spec de la fase actual no pida.
- Si una decisión no está en la spec, en esta constitución ni en las guías, MUST preguntarse antes de decidir.

**Razón:** las fases se implementan en orden; adelantar trabajo genera código sin spec que lo respalde.

## Stack y restricciones técnicas

- Monorepo pnpm + Turborepo: `apps/api` (NestJS + Swagger + Prisma), `apps/web` (React + Vite +
  TypeScript + TanStack Query), `packages/ui` (design system + Storybook + Tailwind sobre tokens),
  `packages/shared` (zod), `packages/tsconfig` y `packages/eslint-config`.
- Estilo visual: "liquid glass" según la skill `liquid-glass-ui`, con fallbacks para
  `prefers-reduced-transparency` y sin `backdrop-filter`.
- Las migraciones de Prisma tienen nombre descriptivo y nunca se editan una vez aplicadas.

### Desviaciones conocidas

El módulo `auth` (fase 001) se construyó antes de estas guías y difiere en dos puntos, documentados
en `backend.md` §5 y `contrato-api.md` §3:

1. Usa `AuthDomainError` con `httpStatus` en el dominio en lugar de `DomainError` con `kind` neutral.
2. La respuesta de error puede ser un string y `meta` no lleva `requestId`.

Estas desviaciones se aceptan **solo en el código existente de `auth`** hasta su refactor de
migración y no se reportan como CRITICAL en él. Todo módulo nuevo, y todo cambio nuevo en `auth`
que toque errores o respuestas, MUST seguir el modelo de las guías.

## Flujo de desarrollo y puertas de calidad

- Cada fase sigue Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`.
- El plan de cada fase MUST incluir un "Constitution Check" que evalúe estos principios y liste qué
  guías de `docs/arquitectura/` aplican y cómo se cumplen.
- Antes de cerrar una tarea MUST pasar desde la raíz: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Commits en formato Conventional Commits; al terminar una fase se propone el mensaje del commit de la fase.

## Governance

- Esta constitución prevalece sobre las guías de `docs/arquitectura/`, las skills y cualquier otra
  práctica. `CLAUDE.md` es la guía de desarrollo en tiempo de ejecución y MUST mantenerse coherente con ella.
- Enmiendas: se hacen con `/speckit-constitution`, en un commit propio, con su Sync Impact Report, y
  actualizando las guías o plantillas afectadas en el mismo cambio.
- Versionado semántico: MAJOR al eliminar o redefinir un principio; MINOR al añadir un principio o
  sección o ampliar una regla; PATCH para aclaraciones y redacción.
- Cumplimiento: `/speckit-analyze` y `/speckit-converge` verifican esta constitución y las guías
  vinculantes; toda revisión de código verifica `checklist-feature.md`. Cualquier complejidad o
  excepción MUST justificarse en la sección "Complexity Tracking" del plan.

**Version**: 1.0.0 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03
