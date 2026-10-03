# project-ultimatecanvas

Monorepo pnpm + Turborepo. NestJS API + React (Vite) web app, con tipos/schemas compartidos y un design system propio.

## Qué es cada paquete

| Paquete                  | Qué es                                                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`               | API REST con NestJS + Swagger. Arquitectura hexagonal pragmática (`presentation → application → domain`, `infrastructure` implementa los puertos). Ver [`apps/api/README.md`](apps/api/README.md) para el detalle de capas y cómo crear un módulo nuevo.              |
| `apps/web`               | Frontend con React + Vite + TypeScript. Atomic Design vive en `packages/ui`; `apps/web` solo consume (`features/`, `pages/`, `hooks/`, `lib/`, `utils/`, `routes/`). Ver [`apps/web/src/README.md`](apps/web/src/README.md) para las reglas de import entre features. |
| `packages/shared`        | Tipos, schemas [zod](https://zod.dev) y constantes compartidos entre `api` y `web` (p. ej. `User`, `CreateUserDto`, `ApiResponse<T>`). Es la única fuente de verdad del contrato — ni la API ni el front duplican estos tipos a mano.                                 |
| `packages/ui`            | Design system (Atomic Design: atoms/molecules/organisms) + Storybook. Única fuente de componentes visuales del monorepo — nunca se crean componentes reutilizables dentro de `apps/web`.                                                                              |
| `packages/tsconfig`      | Presets base de `tsconfig` (`base.json`, `nest.json`, `react.json`) que heredan el resto de paquetes.                                                                                                                                                                 |
| `packages/eslint-config` | Presets base de ESLint flat-config (`base.js`, `nest.js`, `react.js`).                                                                                                                                                                                                |
| `docker/`                | Dockerfiles (`api.Dockerfile`, `web.Dockerfile`) + `nginx.conf`. Scaffoldeados pero **no verificados ni integrados a CI todavía** — ver [Pendiente](#pendiente).                                                                                                      |

See root `CLAUDE.md` para las reglas no negociables del proyecto (dónde viven los componentes, cero colores hardcodeados, tipos compartidos, sin secretos en el front, Conventional Commits).

## Requisitos

- Node >= 20 (ver `.nvmrc`)
- pnpm 9 (`corepack enable` lo habilita)

## Empezar (todo en local)

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm dev
```

- API: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs` (deshabilitado en producción)
- Web: `http://localhost:5173` (el dev server proxea `/api` hacia la API)
- Storybook de `packages/ui`: `pnpm --filter @ucanvas/ui storybook` → `http://localhost:6006`

## Scripts (desde la raíz)

- `pnpm dev` — todos los paquetes en modo desarrollo (Turborepo)
- `pnpm build` — compila api, web, shared y ui
- `pnpm lint` — ESLint en todos los paquetes
- `pnpm typecheck` — chequeo de tipos sin emitir
- `pnpm test` — tests unitarios (Jest en api; `apps/api/test` tiene el e2e con `pnpm --filter @ucanvas/api test:e2e`)
- `pnpm format` — Prettier sobre todo el repo
- `pnpm --filter @ucanvas/ui storybook` / `pnpm --filter @ucanvas/ui build-storybook`

## Calidad de commits (commitlint + husky + lint-staged)

- `commit-msg` (husky) corre `commitlint` con `@commitlint/config-conventional`: cualquier commit que no siga [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, ...) se rechaza.
- `pre-commit` (husky) corre `lint-staged` (`.lintstagedrc`): ESLint `--fix` sobre `.ts/.tsx/.js/.jsx` y Prettier sobre esos más `.json/.md/.yml/.yaml`, solo en los archivos staged.
- Los hooks se instalan solos con `pnpm install` (script `prepare` → `husky`). Si un commit no dispara los hooks, correr `pnpm prepare` a mano.

## CI (`.github/workflows/ci.yml`)

Corre en cada push a `main` y en cada PR contra `main`: instala con pnpm (cacheado vía `actions/setup-node`), cachea el cache local de Turborepo (`.turbo/`), y ejecuta `lint → typecheck → test → build → audit` (el audit es no bloqueante).

## Cómo agregar un módulo nuevo al API (patrón `users`)

`apps/api/src/modules/users` es el módulo de referencia. Resumen (ver [`apps/api/README.md`](apps/api/README.md) para el paso a paso completo con ejemplo `orders`):

1. Define el contrato en `packages/shared/src/schemas/<dominio>.schema.ts` (schema zod + tipos inferidos) y expórtalo desde `packages/shared/src/index.ts`.
2. `domain/`: entidad de dominio en TypeScript plano (con comportamiento, no solo datos) + errores de dominio (`extends DomainError`).
3. `application/`: un puerto de repositorio (`interface` + `Symbol` token) y un use case por operación (`@Injectable()`, un `.execute()`).
4. `infrastructure/`: adaptador in-memory que implementa el puerto (con `seed()` para tests/demo). Cuando exista la base real, un adaptador Prisma implementando el mismo puerto.
5. `presentation/`: DTOs que `implements` los tipos de `@ucanvas/shared` (decorados con `class-validator` + `@ApiProperty`) y el controller (`@ApiTags`, use cases inyectados, cero lógica de negocio).
6. `<dominio>.module.ts`: única pieza que conoce la implementación concreta del puerto; regístralo en `app.module.ts`.
7. Tests unitarios por use case contra el repositorio in-memory (sin `TestingModule`).

## Cómo agregar un componente a `packages/ui`

Sigue el patrón Atomic Design ya usado por `Button`/`Spinner` (atoms), `Card` (molecule) y `DataTable` (organism):

1. Elige la categoría (`atoms/`, `molecules/` u `organisms/`, según si compone otros componentes del paquete) y crea `src/<categoria>/<Componente>/`.
2. `<Componente>.types.ts` — props tipadas (extiende los atributos HTML nativos cuando aplique).
3. `<Componente>.tsx` — implementación. Cero fetch, cero conocimiento de `apps/*`; estilos vía Tailwind + los design tokens (CSS variables) de `src/styles/`, nunca colores hardcodeados.
4. `<Componente>.stories.tsx` — historia de Storybook con los variants/estados principales.
5. `index.ts` del componente (`export * from './Componente'; export type * from './Componente.types';`) y agrégalo al barrel de su categoría (`src/atoms/index.ts`, etc.) — ya se re-exporta solo desde `src/index.ts`.
6. Verifica con `pnpm --filter @ucanvas/ui lint && pnpm --filter @ucanvas/ui typecheck && pnpm --filter @ucanvas/ui storybook`.
7. Consúmelo desde `apps/web` como `import { Componente } from '@ucanvas/ui'` — nunca copies el componente dentro de `apps/web/src`.

## Contrato compartido (`packages/shared`)

Tipos/schemas nuevos van en `packages/shared/src/schemas/*.schema.ts` (zod) y se exportan desde `packages/shared/src/index.ts`. Tanto los DTOs de `apps/api` como los servicios de `apps/web` los importan vía `@ucanvas/shared` — nunca se duplica el shape a mano. Tras cambiar `packages/shared`, correr `pnpm --filter @ucanvas/shared build` para que el resto del monorepo vea los tipos actualizados.

## Seguridad (decisiones tomadas)

- `helmet()` + `x-powered-by` deshabilitado.
- CORS restringido por `CORS_ORIGINS` (env), nunca `*` con credentials.
- `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `transform`.
- Rate limiting global con `@nestjs/throttler`.
- Validación de variables de entorno al arrancar (Joi) — si falta un secreto requerido, la app no arranca.
- Filtro global de excepciones (`common/filters/http-exception.filter.ts`): nunca expone stack traces en producción, y traduce errores de dominio (`DomainError`) a HTTP leyendo `httpStatus` de forma duck-typed, sin acoplar el filtro a cada módulo.
- Interceptor de respuesta consistente: `{ success, data, error, meta? }`.
- Versionado de API vía URI: `/api/v1`.
- Swagger solo fuera de producción, con soporte Bearer listo para cuando exista auth.
- Placeholders de auth: `JwtAuthGuard`, `@Public()`, `JwtStrategy`, variables `JWT_*` — no aplicados globalmente todavía; `ProtectedRoute` en el front es un no-op documentado con `TODO(auth)` hasta que exista la feature real.
- `.env` en `.gitignore` (con excepción explícita para `.env.example`); cada app trae su `.env.example` completo y documentado. Nunca hay secretos ni URLs de API con credenciales en `apps/web` — solo variables `VITE_*` públicas.
- Commits validados con Conventional Commits (`commitlint` + husky) para mantener el historial auditable.
- CI corre lint/typecheck/test/build en cada PR antes de poder mergear a `main`, más un `pnpm audit` no bloqueante.

## Pendiente

- **Docker**: `docker/api.Dockerfile`, `docker/web.Dockerfile` y `docker/nginx.conf` existen como scaffold (multi-stage, usuario no-root, CSP en nginx) pero no se han construido/probado ni se integraron a CI. Se retoma en la fase de deploy.
- **Deploy**: no hay pipeline de deploy (ni entorno de staging/producción, ni secrets de CI para publicar imágenes). Pendiente de decidir el proveedor.
- **GitHub Pages para Storybook**: `pnpm --filter @ucanvas/ui build-storybook` ya genera `storybook-static/`, pero no hay workflow que lo publique en GitHub Pages.
- **Base de datos**: `apps/api/src/database/database.module.ts` es un placeholder (`@Global() @Module({})`). `DATABASE_URL` ya está validada como opcional en `env.validation.ts`. Al elegir ORM (Prisma/TypeORM), inicializar el cliente ahí; el módulo `users` ya está preparado para recibir un adaptador Prisma sin tocar use cases ni controller.
- **Auth**: `JwtAuthGuard`, `@Public()`, `@Roles()` y `JwtStrategy` existen pero no están registrados como guard global; `ProtectedRoute` en el front es un no-op temporal.
