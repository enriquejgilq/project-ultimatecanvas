---
name: monorepo-scaffold
description: >
  Scaffold a complete, production-ready monorepo skeleton with NestJS (API + Swagger),
  React + Vite (frontend), shared packages, and a security baseline. Use this skill whenever
  the user wants to: create or structure a monorepo, start a new full-stack project skeleton,
  set up a project "cascarón/estructura" before defining the business logic, combine a Node
  backend and React frontend in one repository, or set up workspaces (npm/pnpm/Turborepo).
  Also trigger when the user mentions: monorepo, workspaces, apps/packages structure,
  full-stack scaffold, NestJS + React together, shared DTOs/types between backend and frontend,
  or "prepare the project structure so I can add features later" — even if they don't say
  the word "monorepo" explicitly.
---

# Monorepo Scaffold Skill

Generate the complete skeleton (cascarón) of a full-stack monorepo so the business logic can be added later. Default stack: **Node 20+, pnpm workspaces (npm workspaces as fallback), NestJS + Swagger for the API, React + Vite + TypeScript for the web app, shared packages for types/config**.

The output must be a **runnable skeleton**: after `pnpm install && pnpm dev`, the API answers on `/api/v1/health`, Swagger renders at `/docs`, and the web app renders and successfully calls the health endpoint.

## Step 1: Gather minimal requirements

Ask only what's not obvious (the user may not have the business idea defined yet — that's fine, the skeleton doesn't need it):

1. **Project name** (kebab-case; used for folders and package scope, e.g. `@miapp/*`)
2. **Package manager**: pnpm (default) or npm
3. **Database now or later?** If later, still scaffold the config + a `DatabaseModule` placeholder. If now, default PostgreSQL + Prisma or TypeORM (ask which; Prisma default)
4. **Auth now or later?** If later, scaffold the guard/decorator placeholders and JWT env vars anyway

Never block on the business idea. Generate generic `health` and `users` modules as reference implementations that the user can copy for real features.

## Step 2: Generate this structure

```
<project-name>/
├── apps/
│   ├── api/                          # NestJS
│   │   ├── src/
│   │   │   ├── main.ts               # bootstrap: helmet, CORS, prefix, versioning, Swagger, validation
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   ├── env.validation.ts # validate ALL env vars at boot (fail fast)
│   │   │   │   └── configuration.ts
│   │   │   ├── common/
│   │   │   │   ├── filters/http-exception.filter.ts
│   │   │   │   ├── interceptors/transform.interceptor.ts   # { success, data, error, meta }
│   │   │   │   ├── guards/            # jwt-auth.guard.ts placeholder
│   │   │   │   ├── decorators/        # current-user, public, roles
│   │   │   │   └── pipes/
│   │   │   └── modules/
│   │   │       ├── health/            # /api/v1/health (terminus or simple)
│   │   │       └── users/             # reference CRUD module (controller/service/dto/entity)
│   │   ├── test/
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                           # React + Vite
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/client.ts          # fetch/axios wrapper reading VITE_API_URL
│       │   ├── components/
│       │   ├── features/              # one folder per feature (mirrors API modules)
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── routes/
│       ├── index.html
│       ├── vite.config.ts             # dev proxy /api -> http://localhost:3000
│       ├── .env.example               # VITE_API_URL
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/                        # @<scope>/shared — DTO types, zod schemas, constants
│   │   ├── src/index.ts
│   │   └── package.json
│   ├── eslint-config/                 # shared flat ESLint config
│   └── tsconfig/                      # base.json, react.json, nest.json
├── docker/
│   ├── api.Dockerfile                 # multi-stage, non-root user
│   ├── web.Dockerfile                 # build + nginx with security headers
│   └── nginx.conf
├── docker-compose.yml                 # api, web, postgres (if DB chosen)
├── .github/workflows/ci.yml          # lint + typecheck + test + build
├── .husky/                            # pre-commit: lint-staged; commit-msg: commitlint
├── .gitignore  .editorconfig  .nvmrc
├── pnpm-workspace.yaml                # (or "workspaces" in root package.json for npm)
├── turbo.json                         # optional; include by default with pnpm
├── package.json                       # root scripts: dev, build, lint, test, format
├── commitlint.config.js  .lintstagedrc
└── README.md                          # setup, scripts, structure explanation, security notes
```

## Step 3: Security baseline (non-negotiable)

Read `references/security.md` for the full checklist and code snippets. Always implement in the skeleton:

**API (NestJS `main.ts` and modules):**
- `helmet()` enabled
- CORS restricted to an env-configured origin list (never `*` with credentials)
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Rate limiting with `@nestjs/throttler` (global, sensible defaults)
- Env validation at boot (Joi or zod) — missing secret = app refuses to start
- Global exception filter that never leaks stack traces when `NODE_ENV=production`
- Response interceptor with consistent shape `{ success, data, error, meta }`
- API versioning via URI (`/api/v1`) and Swagger only enabled outside production (or behind auth)
- JWT placeholders: guard, `@Public()` decorator, secrets in env, bcrypt listed as dependency
- Request body size limit and `x-powered-by` disabled

**Web:**
- No secrets in the frontend; only `VITE_`-prefixed public config
- API client centralizes auth header handling and error normalization
- nginx config in docker with CSP, `X-Content-Type-Options`, `X-Frame-Options`, HSTS

**Repo-level:**
- `.env` files gitignored; every app ships `.env.example`
- Husky pre-commit runs lint-staged; CI runs `lint`, `typecheck`, `test`, `build`
- Dockerfiles run as non-root, multi-stage, no dev deps in final image
- Root `README.md` documents the security decisions so the team keeps them

## Step 4: Swagger setup

In `main.ts`, configure `@nestjs/swagger`:
- Title/description from package.json, version from env or package version
- `addBearerAuth()` so auth works later without refactoring
- Served at `/docs`, JSON at `/docs-json`
- Every DTO uses `@ApiProperty()`; controllers use `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`
- The reference `users` module must be fully documented as the pattern to copy

## Step 5: Shared package pattern

`packages/shared` is the contract between API and web:
- Export DTO **types/interfaces** and zod schemas (validation reusable on both sides)
- API and web both depend on it via `workspace:*` (pnpm) or `*` (npm workspaces)
- Never put runtime server code (DB, secrets) in shared — types, schemas, constants, pure utils only

## Step 6: Root scripts

Root `package.json` must include (adapt to turbo/plain workspaces):

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write ."
  }
}
```

Without turbo: use `pnpm -r --parallel dev`, etc.

## Step 7: Verify before delivering

Checklist — actually run these in the sandbox when possible:

- [ ] `pnpm install` succeeds from root
- [ ] `pnpm build` compiles api, web, and shared
- [ ] API boots, `/api/v1/health` returns 200, `/docs` renders
- [ ] Web dev server proxies `/api` to the API correctly
- [ ] `users` reference module: full CRUD, validated DTOs, Swagger docs, consistent responses
- [ ] All security items from Step 3 present
- [ ] `.env.example` complete for both apps; no real secrets anywhere
- [ ] README explains structure, scripts, how to add a new module, and how to add a new package

If the sandbox lacks network access to install dependencies, still generate everything and tell the user exactly what to run locally.

## How to extend later (document this in the generated README)

- **New backend feature** → copy `apps/api/src/modules/users` structure
- **New frontend feature** → new folder in `apps/web/src/features/`
- **Shared contract** → add types/schemas to `packages/shared`, import from both apps
- **Database** → fill in `DatabaseModule` / add Prisma schema; connection string via env only
