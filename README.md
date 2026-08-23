# project-ultimatecanvas

Monorepo pnpm + Turborepo. NestJS API + React (Vite) web app, with shared types/schemas and a design-system package.

## Estructura

```
apps/
  api/            NestJS + Swagger (http://localhost:3000, docs at /docs)
  web/             React + Vite + TypeScript (http://localhost:5173)
packages/
  shared/          Types, zod schemas and constants shared between api and web
  ui/              Design system (Atomic Design) — the only source of visual components. Empty for now, filled in the next phase.
  tsconfig/        Base tsconfig presets (base/nest/react)
  eslint-config/   Base ESLint flat-config presets (base/nest/react)
docker/            Dockerfiles + nginx config
```

See root `CLAUDE.md` for the non-negotiable project rules (where components live, no hardcoded colors, shared types, no frontend secrets, Conventional Commits).

## Requisitos

- Node >= 20 (ver `.nvmrc`)
- pnpm 9 (`corepack enable` lo habilita)

## Empezar

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm dev
```

- API: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs` (deshabilitado en producción)
- Web: `http://localhost:5173` (el dev server proxea `/api` hacia la API)

## Scripts (desde la raíz)

- `pnpm dev` — todos los paquetes en modo desarrollo (Turborepo)
- `pnpm build` — compila api, web, shared y ui
- `pnpm lint` — ESLint en todos los paquetes
- `pnpm typecheck` — chequeo de tipos sin emitir
- `pnpm test` — tests unitarios (Jest en api; `apps/api/test` tiene el e2e con `pnpm --filter @ucanvas/api test:e2e`)
- `pnpm format` — Prettier sobre todo el repo
- `pnpm --filter @ucanvas/ui storybook` — placeholder: Storybook aún no está instalado, se agrega cuando se construya el design system

## Seguridad (baseline ya aplicado)

- `helmet()` + `x-powered-by` deshabilitado
- CORS restringido por `CORS_ORIGINS` (env), nunca `*` con credentials
- `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `transform`
- Rate limiting global con `@nestjs/throttler`
- Validación de variables de entorno al arrancar (Joi) — si falta un secreto, la app no arranca
- Filtro global de excepciones: nunca expone stack traces en producción
- Interceptor de respuesta consistente: `{ success, data, error, meta? }`
- Versionado de API vía URI: `/api/v1`
- Swagger solo fuera de producción, con soporte Bearer listo para cuando exista auth
- Placeholders de auth: `JwtAuthGuard`, `@Public()`, `JwtStrategy`, variables `JWT_*` — no aplicados globalmente todavía
- `.env` en `.gitignore`; cada app trae `.env.example` completo
- Dockerfiles multi-stage, usuario no-root, sin devDependencies en la imagen final
- nginx del frontend con CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- CI (`ci.yml`): lint → typecheck → test → build → audit (no bloqueante)

## Pendiente para la siguiente fase

- **Base de datos**: `apps/api/src/database/database.module.ts` es un placeholder (`@Global() @Module({})`). `DATABASE_URL` ya está validada como opcional en `env.validation.ts`. Al elegir ORM (Prisma/TypeORM), inicializar el cliente ahí y quitar el flag opcional.
- **Auth**: `JwtAuthGuard`, `@Public()`, `@Roles()` y `JwtStrategy` existen pero no están registrados como guard global. El módulo `users` es en memoria (referencia); cuando exista DB, reemplazar `UsersService` por un repositorio real sin tocar el contrato del controller/DTO.
- **`packages/ui`**: solo tiene `package.json` + `tsconfig.json` + `src/index.ts` vacío. Ahí van los componentes visuales (Atomic Design) y Storybook.

## Cómo extender

- **Nueva feature de backend** → copiar la estructura de `apps/api/src/modules/users` (controller, service, dto, entity, module)
- **Nueva feature de frontend** → nueva carpeta en `apps/web/src/features/`. Los componentes visuales reutilizables van en `packages/ui`, nunca en `apps/web`.
- **Contrato compartido** → tipos/schemas en `packages/shared`, importados desde api y web vía `@ucanvas/shared`
- **Base de datos** → completar `DatabaseModule` / agregar el schema del ORM elegido; connection string solo por env
