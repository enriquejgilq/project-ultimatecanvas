# Code Patterns Reference

## 1. Consistent API Response

Always wrap responses in a standard shape:

```typescript
// shared/utils/apiResponse.ts
export const apiResponse = {
  success: <T>(data: T, meta?: Record<string, any>) => ({
    success: true as const,
    data,
    error: null,
    ...(meta && { meta }),
  }),

  error: (message: string, details?: any) => ({
    success: false as const,
    data: null,
    error: { message, ...(details && { details }) },
  }),
};

// Usage in controller:
res.status(200).json(apiResponse.success(users, { page: 1, total: 50 }));
res.status(400).json(apiResponse.error('Invalid input', errors));
```

## 2. Custom Error Classes

```typescript
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}
```

## 3. Global Error Middleware

```typescript
// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        message: 'Validation failed',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { message: err.message },
    });
  }

  // Unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    data: null,
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
}
```

## 4. Validation Middleware (Zod)

```typescript
// middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next(error); // caught by error middleware
    }
  };
}

// Usage in routes:
router.post('/users', validate(CreateUserDto), userController.create);
```

## 5. Auth Middleware (JWT)

```typescript
// middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/AppError';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload as TokenPayload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid token');
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

// Usage:
router.delete('/users/:id', authenticate, authorize('admin'), userController.delete);
```

## 6. Auth Service (JWT with Refresh Tokens)

```typescript
class AuthService {
  constructor(private userRepo: UserRepository) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.userRepo.create({ ...dto, password: hashedPassword });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    return this.generateTokens(user);
  }

  private generateTokens(user: User) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken, user: this.toResponse(user) };
  }

  private toResponse(user: User) {
    const { password, ...safe } = user;
    return safe;
  }
}
```

## 7. Rate Limiting

```typescript
// middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, data: null, error: { message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter for auth
  message: { success: false, data: null, error: { message: 'Too many attempts' } },
});
```

## 8. Pagination Helper

```typescript
// shared/utils/pagination.ts
export function paginate(page: number = 1, limit: number = 20) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

// In repository:
async findAll(page?: number, limit?: number) {
  const { skip, take } = paginate(page, limit);
  const [data, total] = await Promise.all([
    this.db.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
    this.db.user.count(),
  ]);
  return { data, total, page: page ?? 1, totalPages: Math.ceil(total / take) };
}
```

## 9. Environment Config

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
```

## 10. App Setup

```typescript
// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { env } from './config/env';

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
```
