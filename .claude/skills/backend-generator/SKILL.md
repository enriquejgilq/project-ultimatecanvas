---
name: backend-generator
description: >
  Generate production-ready backend projects with proper architecture, patterns, and best practices.
  Use this skill whenever the user wants to: create a backend or API from scratch, scaffold a new
  server project, build REST or GraphQL APIs, set up authentication/authorization, design database
  schemas, implement CRUD operations, create a SaaS backend, build a CRM backend, or structure
  a Node.js/Next.js/Express/NestJS server project. Also trigger when the user mentions: backend
  architecture, clean architecture, repository pattern, service layer, API design, server-side
  project structure, or asks to generate controllers/services/repositories/models. Even if they
  just say "I need an API for X" or "build me a backend", use this skill.
---

# Backend Generator Skill

Generate complete, production-ready backend projects with clean architecture, proper patterns, and security best practices.

## When this skill triggers

Any request to create, scaffold, or design a backend system. This includes APIs, microservices, SaaS backends, CRM systems, dashboards with server logic, or any server-side project.

## Step 1: Gather Requirements

Before generating code, clarify these with the user (skip what's already obvious from context):

1. **What does the app do?** (e.g., "CRM for a tow truck company", "e-commerce API")
2. **Stack preference?** Default to the stack in `references/stacks.md` if not specified
3. **Auth needed?** (JWT, sessions, OAuth, none)
4. **Database?** (PostgreSQL default, MySQL, MongoDB)
5. **Which entities/resources?** (users, orders, products, etc.)

Don't over-interview — if the user gives a clear description, infer sensible defaults and confirm briefly.

## Step 2: Choose Architecture

Use **Clean Architecture** (layered) as the default. Read `references/architecture.md` for the full pattern guide.

The layers, from outside in:

```
Routes/Controllers  →  Services  →  Repositories  →  Domain/Models
     (HTTP)           (Business)     (Database)      (Pure logic)
```

**Key rules:**
- Inner layers NEVER import from outer layers
- Controllers only call services, never touch the DB directly
- Services contain all business logic
- Repositories are the only layer that talks to the database
- DTOs define what enters/exits the API (never expose raw DB models)

## Step 3: Generate Project Structure

Always generate this base structure (adapt filenames to the chosen framework):

```
project-name/
├── src/
│   ├── config/           # Environment, DB connection, app config
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── index.ts
│   ├── modules/          # Feature modules (one folder per resource)
│   │   └── users/
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       ├── user.model.ts        # DB schema/entity
│   │       ├── user.dto.ts          # Input/output shapes
│   │       ├── user.routes.ts       # Route definitions
│   │       └── user.validation.ts   # Zod/Joi schemas
│   ├── middleware/        # Auth, error handler, rate limit, logging
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   ├── shared/            # Shared utilities, types, helpers
│   │   ├── types/
│   │   ├── utils/
│   │   └── errors/        # Custom error classes
│   │       └── AppError.ts
│   ├── app.ts             # Express/framework setup
│   └── server.ts          # Entry point
├── prisma/                # If using Prisma
│   └── schema.prisma
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Step 4: Generate Code — Follow These Patterns

Read `references/patterns.md` for detailed code examples. Key patterns to always include:

### Consistent API Response Format
```typescript
// Every endpoint returns this shape
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "total": 50 }  // optional
}
```

### Error Handling
- Custom `AppError` class with status codes
- Global error middleware catches everything
- Never leak stack traces in production

### Validation
- Validate ALL inputs at the controller level using Zod (preferred) or Joi
- Reject bad data before it reaches the service layer

### Authentication
- JWT with access + refresh tokens (default)
- Password hashing with bcrypt (min 10 rounds)
- Auth middleware protects routes
- Role-based access control (RBAC) when needed

### Database Access
- Always through repositories, never in controllers
- Use transactions for multi-step operations
- Parameterized queries (never string concatenation)

## Step 5: Generate Essential Files

For every backend project, always create these files with real, working code (not stubs):

1. **Entry point** (`server.ts`) — starts the server
2. **App setup** (`app.ts`) — middleware chain, route mounting
3. **At least one complete module** — full CRUD for the primary resource
4. **Auth module** — if auth is needed
5. **Error handling** — AppError + global middleware
6. **Environment config** — with `.env.example`
7. **package.json** — with all needed dependencies
8. **README.md** — setup instructions, available endpoints

## Step 6: API Design Conventions

Follow REST conventions:

```
GET    /api/v1/users          → list
GET    /api/v1/users/:id      → get one
POST   /api/v1/users          → create
PUT    /api/v1/users/:id      → update
DELETE /api/v1/users/:id      → delete
```

- Always version APIs: `/api/v1/...`
- Use plural nouns for resources
- Nested resources: `/api/v1/users/:userId/orders`
- Query params for filtering: `?status=active&page=2`

## Stack-Specific Guidance

Read `references/stacks.md` for framework-specific instructions when generating for:
- **Express + TypeScript** (most common, default)
- **NestJS** (enterprise-grade)
- **Next.js API Routes / Server Actions**
- **Fastify**

## Quality Checklist

Before presenting the generated backend, verify:

- [ ] No business logic in controllers
- [ ] No direct DB access outside repositories
- [ ] All inputs validated
- [ ] Passwords hashed, never stored in plain text
- [ ] Consistent response format on every endpoint
- [ ] Error handling covers all routes
- [ ] Environment variables for secrets (never hardcoded)
- [ ] TypeScript types/interfaces for all data shapes
- [ ] README with setup steps
