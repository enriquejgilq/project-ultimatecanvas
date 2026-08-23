# Security Baseline — Code Snippets

Concrete implementations for the security items required by the skill. Copy/adapt these when generating the skeleton.

## 1. NestJS bootstrap (`apps/api/src/main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

## 2. Env validation at boot (`config/env.validation.ts`)

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().uri().optional(), // required once DB is added
});
```

Wire it in `AppModule` with `ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })`.

## 3. Throttling (in `app.module.ts`)

```typescript
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
// providers:
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

## 4. Exception filter — never leak stack traces

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;
    const message =
      isHttp ? exception.getResponse()
      : process.env.NODE_ENV === 'production' ? 'Internal server error'
      : String(exception);
    res.status(status).json({ success: false, data: null, error: message });
  }
}
```

## 5. Response interceptor (consistent shape)

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T> {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => ({ success: true, data, error: null })));
  }
}
```

## 6. Auth placeholders

- `jwt-auth.guard.ts` extending `AuthGuard('jwt')` (passport-jwt) — can start as a stub that reads a `@Public()` metadata flag.
- `public.decorator.ts`: `export const Public = () => SetMetadata('isPublic', true);`
- Dependencies to include even if auth comes later: `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt`, `bcrypt`.
- Password rule when implemented: `bcrypt.hash(pwd, 12)`, never log or return the hash.

## 7. Vite dev proxy (`apps/web/vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
```

## 8. nginx for the web image (`docker/nginx.conf` essentials)

```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" always;
  location / { try_files $uri /index.html; }
}
```

Add HSTS at the TLS-terminating proxy, not here, unless this container terminates TLS.

## 9. Dockerfile pattern (api)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter api build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]
```

(Adjust for pnpm deploy / pruned node_modules in real projects.)

## 10. CI minimum (`.github/workflows/ci.yml`)

Jobs on push/PR: checkout → setup node 20 + pnpm → install (frozen lockfile) → `lint` → `typecheck` → `test` → `build`. Add `pnpm audit --audit-level=high` as a non-blocking step.

## Full checklist

- [ ] helmet, CORS allowlist, rate limiting, body size limit
- [ ] Global validation pipe (whitelist + forbidNonWhitelisted)
- [ ] Env validated at boot; secrets min length enforced
- [ ] No stack traces in production responses
- [ ] Swagger disabled or protected in production
- [ ] JWT/bcrypt scaffolded; secrets only in env
- [ ] .env gitignored, .env.example complete
- [ ] Non-root Docker users, multi-stage builds
- [ ] Frontend: no secrets, CSP headers, centralized API client
- [ ] CI: lint + typecheck + test + build + audit
