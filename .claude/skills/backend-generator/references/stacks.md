# Stack Reference

## Express + TypeScript (Default)

The most flexible, widely-used Node.js backend stack. Use as default when no preference stated.

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18",
    "cors": "^2.8",
    "helmet": "^7.1",
    "jsonwebtoken": "^9.0",
    "bcrypt": "^5.1",
    "zod": "^3.22",
    "express-rate-limit": "^7.1",
    "@prisma/client": "^5.0",
    "dotenv": "^16.3"
  },
  "devDependencies": {
    "typescript": "^5.3",
    "@types/express": "^4.17",
    "@types/cors": "^2.8",
    "@types/jsonwebtoken": "^9.0",
    "@types/bcrypt": "^5.0",
    "tsx": "^4.7",
    "prisma": "^5.0"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Next.js (API Routes + Server Actions)

Use when the user already has a Next.js frontend or wants fullstack in one project.

### Structure
```
src/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── users/
│   │       │   └── route.ts          # GET, POST
│   │       │   └── [id]/
│   │       │       └── route.ts      # GET, PUT, DELETE
│   │       └── auth/
│   │           ├── login/route.ts
│   │           └── register/route.ts
│   └── actions/                      # Server Actions
│       └── user.actions.ts
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── auth.ts                       # Auth helpers
│   └── validations/
│       └── user.schema.ts
├── services/
│   └── user.service.ts
└── repositories/
    └── user.repository.ts
```

### Route Handler Example
```typescript
// app/api/v1/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/user.service';
import { CreateUserDto } from '@/lib/validations/user.schema';

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
  const result = await userService.findAll(page);
  return NextResponse.json({ success: true, data: result, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const dto = CreateUserDto.parse(body);
  const user = await userService.create(dto);
  return NextResponse.json({ success: true, data: user, error: null }, { status: 201 });
}
```

### Key Differences from Express
- No middleware chain — use `middleware.ts` at root or per-route logic
- Auth: use `next-auth` (Auth.js) or manual JWT in route handlers
- Services and repositories work the same way
- Server Actions for mutations from React components

---

## NestJS

Use for enterprise projects, teams, or when the user wants batteries-included DI.

### Structure
```
src/
├── modules/
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       └── entities/
│           └── user.entity.ts
├── common/
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards
│   ├── interceptors/      # Response transform
│   ├── pipes/             # Validation
│   └── decorators/        # Custom decorators
├── config/
├── app.module.ts
└── main.ts
```

### Key Patterns
- Use `@Injectable()` for services and repositories
- Use `class-validator` + `class-transformer` for DTOs
- Guards for auth, Pipes for validation, Filters for errors
- Module-based organization (each feature is a module)

---

## Prisma Schema (Common for All Stacks)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

enum Role {
  USER
  ADMIN
}
```

---

## .env.example (Always Include)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_REFRESH_SECRET=another-long-random-string-min-32-chars
CORS_ORIGIN=http://localhost:3000
```
