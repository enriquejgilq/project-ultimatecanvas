# Architecture Reference

## Clean Architecture (Default)

The goal: each layer has ONE job and doesn't know about layers above it.

### Layer Responsibilities

#### 1. Controllers (HTTP Layer)
- Parse request params, body, query
- Call the appropriate service method
- Return the response with correct status code
- NEVER contain business logic or DB queries

```typescript
// ✅ Good controller
class UserController {
  constructor(private userService: UserService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateUserDto.parse(req.body); // validate
      const user = await this.userService.create(dto);
      res.status(201).json({ success: true, data: user, error: null });
    } catch (error) {
      next(error); // let error middleware handle it
    }
  }
}

// ❌ Bad controller — logic and DB mixed in
async create(req: Request, res: Response) {
  const existing = await db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
  if (existing) return res.status(400).json({ error: 'exists' });
  const hashed = await bcrypt.hash(req.body.password, 10);
  await db.query('INSERT INTO users ...', [req.body.email, hashed]);
}
```

#### 2. Services (Business Logic Layer)
- All rules, validations, transformations live here
- Orchestrates between repositories
- Throws custom errors (AppError)
- Framework-agnostic (no req/res objects)

```typescript
class UserService {
  constructor(private userRepo: UserRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppError('Email already registered', 409);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return this.userRepo.create({ ...dto, password: hashedPassword });
  }
}
```

#### 3. Repositories (Data Access Layer)
- ONLY place that talks to the database
- Returns domain objects, not raw query results
- Easy to swap DB without touching business logic

```typescript
class UserRepository {
  constructor(private db: PrismaClient) {}

  async findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData) {
    return this.db.user.create({ data });
  }

  async findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }
}
```

#### 4. Domain / Models
- Pure data definitions and business rules
- No framework dependencies
- TypeScript interfaces/types

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
}
```

### DTOs (Data Transfer Objects)

DTOs define what goes in and out of the API. They prevent leaking internal DB structure.

```typescript
// What the API accepts
const CreateUserDto = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

// What the API returns (never includes password)
const UserResponseDto = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  createdAt: z.string(),
});
```

### Dependency Injection (Simple Version)

For Express projects, use a simple factory or container pattern:

```typescript
// container.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Repositories
const userRepo = new UserRepository(db);
const orderRepo = new OrderRepository(db);

// Services
const userService = new UserService(userRepo);
const orderService = new OrderService(orderRepo, userService);

// Controllers
const userController = new UserController(userService);
const orderController = new OrderController(orderService);

export { userController, orderController };
```

For NestJS, use the built-in DI system with `@Injectable()` decorators.

## MVC (Simpler Alternative)

Use when the project is small or the user explicitly asks for MVC:

```
src/
├── models/        # DB schemas + basic queries
├── controllers/   # HTTP handling + some logic
├── routes/        # Route definitions
├── middleware/
└── utils/
```

MVC is fine for prototypes and small APIs. Recommend Clean Architecture when:
- The project will grow
- Multiple developers
- Complex business logic
- Needs to be testable
