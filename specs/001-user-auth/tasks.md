---
description: 'Task list for 001-user-auth: Autenticación y protección de cuentas'
---

# Tasks: Autenticación y protección de cuentas

**Input**: Design documents from `specs/001-user-auth/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth-api.md](./contracts/auth-api.md), [contracts/web-routes.md](./contracts/web-routes.md), [quickstart.md](./quickstart.md)

**Tests**: Se incluyen. El README de `apps/api` exige un `.spec.ts` por caso de uso y por entidad con invariantes, y el plan (research R15) define los tests e2e y web. Las tareas de test van **junto** a la implementación de cada historia. Si se quiere TDD estricto, se ejecutan antes.

**Organization**: una fase por historia de usuario (US1–US6 de spec.md), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario de spec.md (US1…US6)

## Path Conventions

- API: `apps/api/` (módulo nuevo en `apps/api/src/modules/auth/`, abreviado aquí como **`auth/`** solo en los títulos; las tareas usan siempre la ruta completa)
- Web: `apps/web/src/`
- UI: `packages/ui/src/`
- Contratos compartidos: `packages/shared/src/`

## Convenciones obligatorias para todas las tareas (de CLAUDE.md y del README de la API)

- **Dominio** (`domain/`): TypeScript puro, sin importar `@nestjs/*`, `@prisma/client` ni nada HTTP. Los errores extienden una base propia del módulo (`AuthDomainError`, con `httpStatus`) y los traduce el filtro global ya existente, por duck typing.
- **Casos de uso** (`application/use-cases/`): una clase `@Injectable()` con `execute()` por operación. Inyectan puertos mediante `@Inject(TOKEN)`. Nunca lanzan `HttpException`.
- **DTO** (`presentation/dto/`): `implements` del tipo inferido en `@ucanvas/shared`, con `class-validator` y `@ApiProperty`.
- **Tests de casos de uso**: `new XUseCase(new InMemory…(), fakeClock, …)`, sin `TestingModule`.
- **UI**: los componentes visuales reutilizables solo van en `packages/ui`, sin colores fijos (tokens de `tokens.css` o `glass-tokens.css`). Siguen el estilo de `packages/ui/src/atoms/Button` (`forwardRef`, archivo `.types.ts`, `index.ts`, `.stories.tsx`).
- **Textos visibles para el usuario**: en español, tomados de `AUTH_MESSAGES` en `@ucanvas/shared`.
- **Secretos**: nunca escribir en logs, eventos ni respuestas contraseñas, tokens ni sus hashes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencias, configuración y contratos compartidos.

- [x] T001 Actualizar dependencias de la API en `apps/api/package.json`: añadir `argon2`, `nodemailer`, `cookie-parser`; añadir en devDependencies `@types/nodemailer` y `@types/cookie-parser`; eliminar `bcrypt` y `@types/bcrypt`; ejecutar `pnpm install` en la raíz para actualizar `pnpm-lock.yaml`.
- [x] T002 [P] Añadir tests a la web en `apps/web/package.json`:
  - devDependencies `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` y `jsdom`;
  - scripts `"test": "vitest run"` y `"test:watch": "vitest"`;
  - bloque `test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'], globals: true }` en `apps/web/vite.config.ts`;
  - `apps/web/test/setup.ts`, fuera de `src/` para respetar las carpetas permitidas por CLAUDE.md, que importa `@testing-library/jest-dom/vitest`. Incluir `test/` en el `tsconfig` que corresponda.
- [x] T003 [P] Ampliar la validación de entorno en `apps/api/src/config/env.validation.ts`:
  - `APP_WEB_URL` (URI http/https, obligatoria);
  - `MAIL_TRANSPORT` (`'console' | 'smtp'`, por defecto `'console'`); si `NODE_ENV=production`, `'console'` no se permite (`Joi.when`);
  - `SMTP_URL` (URI, obligatoria si `MAIL_TRANSPORT=smtp`);
  - `MAIL_FROM` (string, obligatoria);
  - `TRUST_PROXY` (boolean, por defecto `false`);
  - eliminar `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` (research R2).
- [x] T004 [P] Reflejar las nuevas variables en `apps/api/src/config/configuration.ts`: `appWebUrl`, `mail: { transport, smtpUrl, from }` y `trustProxy`; quitar `jwt.refreshSecret` y `jwt.refreshExpiresIn`.
- [x] T005 [P] Actualizar `apps/api/.env.example` con `APP_WEB_URL=http://localhost:5173`, `MAIL_TRANSPORT=console`, `SMTP_URL=` (comentado, ejemplo `smtp://localhost:1025` para Mailpit), `MAIL_FROM="UltimateCanvas <no-reply@localhost>"` y `TRUST_PROXY=false`; eliminar `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN`. Actualizar también la variable de entorno del servicio `api` en `docker-compose.yml`, quitando `JWT_REFRESH_SECRET`.
- [x] T006 [P] Crear `packages/shared/src/constants/auth.ts`:
  - `PASSWORD_MIN_LENGTH = 10`, `PASSWORD_MAX_LENGTH = 128`;
  - `AUTH_ERROR_CODES`: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `INVALID_LINK`, `PASSWORD_POLICY`, `INVALID_CURRENT_PASSWORD`, `ACCOUNT_LOCKED`, `SESSION_EXPIRED`;
  - `PASSWORD_RULE_CODES`: `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_NEEDS_LETTER`, `PASSWORD_NEEDS_NUMBER`, `PASSWORD_TOO_COMMON`;
  - `AUTH_MESSAGES` en español, con al menos:
    - `CHECK_YOUR_EMAIL: 'Si los datos son correctos, recibirás un correo en unos minutos.'`
    - `INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.'`
    - `INVALID_LINK: 'El enlace no es válido o ha caducado. Puedes pedir uno nuevo.'`
    - `EMAIL_NOT_VERIFIED: 'Verifica tu correo para entrar. Te podemos reenviar el enlace.'`
    - `EMAIL_VERIFIED: 'Tu correo está verificado. Ya puedes iniciar sesión.'`
    - `INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.'`
    - `ACCOUNT_LOCKED: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.'`
    - un mensaje por cada regla de contraseña.

  Re-exportar desde `packages/shared/src/constants/index.ts`.

- [x] T007 [P] Crear `packages/shared/src/schemas/auth.schema.ts` según data-model.md § "Contratos compartidos":
  - `passwordSchema`: string de longitud `PASSWORD_MIN_LENGTH`..`PASSWORD_MAX_LENGTH`, con al menos una letra `/\p{L}/u` y al menos un dígito `/\p{N}/u`; sin la lista de contraseñas comunes, que es solo del servidor;
  - `emailSchema`: `z.string().trim().toLowerCase().email()`;
  - `registerSchema { email, password }`, `loginSchema { email, password, rememberMe: boolean }`, `emailOnlySchema { email }`;
  - `tokenSchema { token: string, 43 caracteres base64url /^[A-Za-z0-9_-]{43}$/ }`;
  - `resetPasswordSchema { token, newPassword }`, `changePasswordSchema { currentPassword, newPassword }`;
  - `authUserSchema { id, email, name: string | null, emailVerified: true }` y `authSessionSchema { accessToken, expiresIn, user }`;
  - `authErrorSchema { code, message, rules?: PasswordRuleCode[] }`;
  - los tipos inferidos de todos ellos.

  Exportar desde `packages/shared/src/index.ts`.

- [x] T008 [P] Cambiar `name` a `z.string().min(1).max(120).nullable()` en `packages/shared/src/schemas/user.schema.ts` y ajustar `createUserSchema` para que `name` siga siendo obligatorio al crear con `POST /users`, usando `.extend({ name: z.string().min(1).max(120) })`.
- [x] T009 Compilar shared con `pnpm --filter @ucanvas/shared build` y corregir los errores de tipos que aparezcan en `apps/api/src/modules/users/presentation/dto/user-response.dto.ts` y `apps/web/src/pages/UsersPage.tsx` por el cambio de `name` a nullable (mostrar `—` cuando sea `null`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: persistencia, puertos, adaptadores, guard global y componentes de UI que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Persistencia

- [x] T010 Ampliar `apps/api/prisma/schema.prisma` según data-model.md:
  - **User**: `name String?`; `passwordHash String? @map("password_hash")`; `emailVerifiedAt DateTime? @map("email_verified_at")`; `failedLoginCount Int @default(0) @map("failed_login_count")`; `lockedUntil DateTime? @map("locked_until")`; `passwordChangedAt DateTime? @map("password_changed_at")`; relaciones `sessions`, `emailTokens` y `securityEvents`.
  - **Session** (`@@map("sessions")`): `id String @id @default(uuid())`; `userId` (FK `onDelete: Cascade`); `tokenHash String @unique`; `rememberMe Boolean`; `createdAt`; `lastActivityAt`; `expiresAt DateTime?`; `revokedAt DateTime?`; `revokedReason SessionRevokedReason?` (enum `LOGOUT | PASSWORD_RESET | PASSWORD_CHANGED | EXPIRED`); `userAgent String?`; `ip String?`; `@@index([userId])` y `@@index([userId, revokedAt])`.
  - **EmailToken** (`@@map("email_tokens")`): `type EmailTokenType` (enum `EMAIL_VERIFICATION | PASSWORD_RESET`); `tokenHash String @unique`; `expiresAt`; `usedAt DateTime?`; `invalidatedAt DateTime?`; `createdAt`; FK `onDelete: Cascade`; `@@index([userId, type])`.
  - **EmailDispatch** (`@@map("email_dispatches")`): `email String`; `kind EmailDispatchKind` (enum `EMAIL_VERIFICATION | PASSWORD_RESET | REGISTRATION_ATTEMPT | LOCKOUT_ALERT | PASSWORD_CHANGED`); `createdAt`; `@@index([email, kind, createdAt(sort: Desc)])`.
  - **SecurityEvent** (`@@map("security_events")`): `type SecurityEventType` (enum `REGISTERED | REGISTRATION_REPLACED | REGISTRATION_ATTEMPT_EXISTING | EMAIL_VERIFIED | LOGIN_SUCCEEDED | LOGIN_FAILED | LOGIN_BLOCKED_UNVERIFIED | ACCOUNT_LOCKED | PASSWORD_RESET_REQUESTED | PASSWORD_RESET_COMPLETED | PASSWORD_CHANGED | PASSWORD_CHANGE_FAILED | LOGOUT | EMAIL_RATE_LIMITED`); `userId String?` (FK `onDelete: SetNull`); `email String?`; `ip String?`; `userAgent String?`; `metadata Json?`; `createdAt`; `@@index([userId, createdAt(sort: Desc)])` y `@@index([type, createdAt(sort: Desc)])`.
  - Todas las columnas con `@map` en snake_case, como en el modelo `User` actual.
- [x] T011 Generar la migración con `pnpm --filter @ucanvas/api db:migrate --name auth` (crea `apps/api/prisma/migrations/<timestamp>_auth/`). Revisar el SQL y añadir a mano una normalización de los correos existentes (`UPDATE users SET email = lower(trim(email));`) antes de crear los índices. Después, `pnpm --filter @ucanvas/api db:generate`.

### Dominio común del módulo auth

- [x] T012 [P] Crear `apps/api/src/modules/auth/domain/auth.errors.ts`. Clase base propia `AuthDomainError extends Error` con `httpStatus: number`, `code: AuthErrorCode` y `rules?: PasswordRuleCode[]`, definida en este archivo. No importa nada de `modules/users`; el filtro global la reconoce por duck typing gracias a `httpStatus`. Subclases:
  - `InvalidCredentialsError` (401, `INVALID_CREDENTIALS`)
  - `EmailNotVerifiedError` (403)
  - `InvalidLinkError` (400)
  - `PasswordPolicyViolationError` (422, con `rules: PasswordRuleCode[]`)
  - `InvalidCurrentPasswordError` (400)
  - `AccountLockedError` (423)
  - `SessionExpiredError` (401)

  Cada una usa su mensaje de `AUTH_MESSAGES`.

- [x] T013 Ampliar `apps/api/src/common/filters/http-exception.filter.ts`: si el error de dominio (duck-typed) tiene la propiedad `code`, responder `error: { code, message, ...(rules ? { rules } : {}) }`; si no, mantener `error: message` como ahora.
- [x] T014 [P] Crear `apps/api/src/modules/auth/domain/password-policy.ts`: función pura `evaluatePassword(password, isCommon: (p) => boolean): PasswordRuleCode[]`, que devuelve **todas** las reglas incumplidas: longitud menor que 10 → `PASSWORD_TOO_SHORT`; mayor que 128 → `PASSWORD_TOO_LONG`; sin letra `\p{L}` → `PASSWORD_NEEDS_LETTER`; sin dígito `\p{N}` → `PASSWORD_NEEDS_NUMBER`; `isCommon(password.toLowerCase())` → `PASSWORD_TOO_COMMON`. Incluir `apps/api/src/modules/auth/domain/password-policy.spec.ts`, que cubra cada regla y sus combinaciones.
- [x] T015 [P] Crear `apps/api/src/modules/auth/domain/account.entity.ts`: clase `Account` con `id`, `email` (normalizado), `name: string | null`, `passwordHash: string | null`, `emailVerifiedAt`, `failedLoginCount`, `lockedUntil`, `passwordChangedAt`, `createdAt` y `updatedAt`. Métodos:
  - `isVerified()` e `isLocked(now)` (`lockedUntil > now`);
  - `verifyEmail(now)`;
  - `replacePendingPassword(hash)`, que lanza `AuthDomainError` (422) si ya está verificada;
  - `resetFailedAttempts()`;
  - `changePassword(hash, now)`, que fija `passwordChangedAt`;
  - `unlock()`;
  - `static normalizeEmail(raw)` (`trim` + `toLowerCase`).

  Incluir `apps/api/src/modules/auth/domain/account.entity.spec.ts`.

- [x] T016 [P] Crear `apps/api/src/modules/auth/domain/session.entity.ts`. `Session` con `id`, `userId`, `tokenHash`, `rememberMe`, `createdAt`, `lastActivityAt`, `expiresAt: Date | null`, `revokedAt`, `revokedReason`, `userAgent` e `ip`.
  - `static create({ userId, tokenHash, rememberMe, now, … })`: con `rememberMe`, `expiresAt = now + 30 días`; sin él, `expiresAt = null`.
  - `isActive(now)`: falso si `revokedAt`. Con `rememberMe`, activa si `now < expiresAt`. Sin él, activa si `now - lastActivityAt < 2 h`.
  - `touch(now)` y `revoke(reason, now)`.

  Constantes `REMEMBER_ME_TTL_MS = 30 días` e `IDLE_TIMEOUT_MS = 2 h`. Incluir `apps/api/src/modules/auth/domain/session.entity.spec.ts`, que cubra los límites exactos (2 h − 1 ms activa y 2 h inactiva; 30 días).

- [x] T017 [P] Crear `apps/api/src/modules/auth/domain/email-token.entity.ts`. `EmailToken` con `id`, `userId`, `type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'`, `tokenHash`, `expiresAt`, `usedAt`, `invalidatedAt` y `createdAt`.
  - `static ttlFor(type)`: 24 h para `EMAIL_VERIFICATION` y 60 min para `PASSWORD_RESET`.
  - `isValid(now)`: `usedAt` e `invalidatedAt` nulos y `now < expiresAt`.

### Puertos (application/ports)

- [x] T018 [P] Crear los puertos en `apps/api/src/modules/auth/application/ports/`, cada uno con su interfaz y su token `Symbol`:
  - `accounts.repository.port.ts` (`findByEmail`, `findById`, `create`, `save`, `incrementFailedAttempts(id, now): Promise<{ failedLoginCount, lockedUntil }>`, que bloquea atómicamente al llegar a 5 (research R9));
  - `sessions.repository.port.ts` (`create`, `findByTokenHash`, `findById`, `save`, `revokeAllForUser(userId, reason, now)`, `revokeAllForUserExcept(userId, keepId, reason, now)`);
  - `email-tokens.repository.port.ts` (`create`, `invalidateActive(userId, type, now)`, `consume(tokenHash, type, now): Promise<EmailToken | null>`, que hace un UPDATE condicional atómico, y `findValid(tokenHash, type, now)`);
  - `email-dispatches.repository.port.ts` (`record(email, kind, now)`, `countSince(email, kind, since)` y `lastAt(email, kind)`);
  - `security-events.port.ts` (`record({ type, userId?, email?, ip?, userAgent?, metadata? })`);
  - `password-hasher.port.ts` (`hash`, `verify`);
  - `common-password-checker.port.ts` (`isCommon(lowercased)`);
  - `mailer.port.ts` (`send({ to, subject, text, html })`);
  - `clock.port.ts` (`now(): Date`);
  - `token-generator.port.ts` (`generate(): { raw, hash }`, con 32 bytes en base64url y SHA-256 en hex; `hash(raw)`).

  Exportar también el tipo `RequestContext { ip?: string; userAgent?: string }`, que reciben los casos de uso para los eventos.

### Adaptadores e implementaciones en memoria

- [x] T019 [P] Crear `apps/api/src/modules/auth/infrastructure/crypto/argon2-password-hasher.ts` (Argon2id con `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`) y `apps/api/src/modules/auth/infrastructure/crypto/random-token-generator.ts` (`crypto.randomBytes(32).toString('base64url')` + `createHash('sha256')`). Incluir `apps/api/src/modules/auth/infrastructure/crypto/fake-password-hasher.ts`, rápido y determinista, para los tests unitarios.
- [x] T020 [P] Crear `apps/api/src/modules/auth/infrastructure/clock/system-clock.ts` y `apps/api/src/modules/auth/infrastructure/clock/fake-clock.ts` (`set(date)`, `advance(ms)`) para los tests.
- [x] T021 [P] Descargar la lista pública de las 100 000 contraseñas más comunes (SecLists `Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt` o equivalente; anotar la fuente y la licencia en la cabecera de un README junto al archivo) a `apps/api/src/modules/auth/infrastructure/passwords/common-passwords.txt`. Crear `apps/api/src/modules/auth/infrastructure/passwords/file-common-password-checker.ts`, que la carga al construirse en un `Set` en minúsculas, y su `.spec.ts` (`password123` es común; `Lienzo-2026-xyz` no). Asegurar que el `.txt` se copia a `dist` (`assets` en `apps/api/nest-cli.json`).
- [x] T022 [P] Crear el mailer en `apps/api/src/modules/auth/infrastructure/mail/`:
  - `console-mailer.ts`, que hace `Logger.log` del destinatario, el asunto y el texto;
  - `smtp-mailer.ts`, con `nodemailer.createTransport(smtpUrl)` y `from` de la configuración;
  - `capturing-mailer.ts`, que guarda los mensajes en un array, para los tests;
  - `mail-dispatcher.ts`: servicio con `enqueue(message)` que no espera al envío (`setImmediate`) y reintenta 3 veces con espera de 1 s, 5 s y 25 s, registrando el error final con `Logger.error` sin incluir el cuerpo. Expone `drain()` para los tests.
    Por cada envío escribe una línea de log estructurada `{ event: 'mail.sent' | 'mail.failed', kind, attempts, latencyMs }`, donde `latencyMs` va del momento de encolar al de enviar. No incluye ni destinatario ni enlace. Esto permite medir SC-002 (95 % por debajo de 60 000 ms) a partir de los logs.
- [x] T023 [P] Crear las plantillas de correo en español en `apps/api/src/modules/auth/infrastructure/mail/templates.ts`: funciones puras que devuelven `{ subject, text, html }` para `emailVerification(link)`, `registrationAttempt(loginUrl, forgotUrl)`, `passwordReset(link)`, `lockoutAlert(at)` y `passwordChanged(at, forgotUrl)`, con los asuntos y contenidos de contracts/auth-api.md § "Contenido de los correos". El HTML es sencillo, sin recursos externos.
- [x] T024 Crear `apps/api/src/modules/auth/application/services/email-rate-limiter.ts`: `canSend(email, kind, now)` devuelve `true` solo si `countSince(email, kind, now - 1h) < 3` **y** `lastAt(email, kind)` es nulo o de hace 60 s o más; solo aplica a `EMAIL_VERIFICATION`, `PASSWORD_RESET` y `REGISTRATION_ATTEMPT` (los demás tipos siempre devuelven `true`). También `sendLimited(email, kind, message, ctx)`: si se puede enviar, registra el envío y lo encola en `MailDispatcher`; si no, registra el evento `EMAIL_RATE_LIMITED`. Incluir `apps/api/src/modules/auth/application/services/email-rate-limiter.spec.ts` (3 por hora, 60 s de separación y la cuarta petición bloqueada).
- [x] T025 [P] Crear las implementaciones en memoria en `apps/api/src/modules/auth/infrastructure/persistence/`: `in-memory-accounts.repository.ts`, `in-memory-sessions.repository.ts`, `in-memory-email-tokens.repository.ts`, `in-memory-email-dispatches.repository.ts` y `in-memory-security-events.ts`. Cada una incluye un `seed(...)` y respeta la misma semántica atómica que su puerto.
- [x] T026 Crear los adaptadores Prisma en `apps/api/src/modules/auth/infrastructure/persistence/`:
  - `prisma-accounts.repository.ts`. `incrementFailedAttempts` usa `$queryRaw` con `UPDATE users SET failed_login_count = CASE WHEN failed_login_count + 1 >= 5 THEN 0 ELSE failed_login_count + 1 END, locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN $now + interval '15 minutes' ELSE locked_until END WHERE id = $id AND (locked_until IS NULL OR locked_until <= $now) RETURNING failed_login_count, locked_until`.
  - `prisma-sessions.repository.ts`.
  - `prisma-email-tokens.repository.ts`. `consume` usa `updateMany` con `where { tokenHash, type, usedAt: null, invalidatedAt: null, expiresAt: { gt: now } }` y, si `count = 1`, devuelve la fila.
  - `prisma-email-dispatches.repository.ts`.
  - `prisma-security-events.ts`, cuyo `record` no lanza: captura y registra el error.

  Todos mapean filas a entidades con funciones `toDomain`, igual que `prisma-users.repository.ts`.

### Módulo, guard global y sesión por petición

- [x] T027 Crear `apps/api/src/modules/auth/auth.module.ts`:
  - importa `PassportModule` y `JwtModule.registerAsync`, con `secret` = `jwt.secret` y `signOptions.expiresIn` = `jwt.expiresIn`;
  - enlaza cada token de puerto con su adaptador Prisma o real; `MAILER` se elige con `mail.transport`: `ConsoleMailer` o `SmtpMailer`;
  - provee `MailDispatcher` y `EmailRateLimiter`;
  - provee `JwtStrategy` (`apps/api/src/modules/auth/infrastructure/jwt.strategy.ts`; T030). Hoy la estrategia no está registrada en ningún módulo.

  Registrarlo en `apps/api/src/app.module.ts`.

- [x] T028 Modificar `apps/api/src/main.ts`: `app.use(cookieParser())`; si `trustProxy`, `app.set('trust proxy', 1)` en la instancia de Express; en Swagger, añadir `.addCookieAuth('ucanvas_session')`.
- [x] T029 Registrar `JwtAuthGuard` como `APP_GUARD` en `apps/api/src/app.module.ts`, **después** de `ThrottlerGuard`, y quitar el comentario de placeholder de `apps/api/src/common/guards/jwt-auth.guard.ts`. Añadir `@Public()` a `apps/api/src/modules/health/health.controller.ts`.
- [x] T030 Mover la estrategia a `apps/api/src/modules/auth/infrastructure/jwt.strategy.ts` y borrar `apps/api/src/common/strategies/jwt.strategy.ts` (y la carpeta, si queda vacía). El payload es `{ sub, sid }`. `validate` hace lo siguiente:
  - busca la sesión `sid` con `SESSIONS_REPOSITORY`;
  - si no existe, `!session.isActive(clock.now())` o `session.userId !== sub`, lanza `UnauthorizedException`;
  - si `now - lastActivityAt >= 60 s`, hace `touch(now)` y la guarda;
  - devuelve `{ userId: sub, sessionId: sid }`.

  Actualizar el tipo devuelto por `apps/api/src/common/decorators/current-user.decorator.ts` (exportar la interfaz `AuthenticatedUser`).

- [x] T031 Actualizar `apps/api/test/app.e2e-spec.ts` para el nuevo entorno: definir `APP_WEB_URL`, `MAIL_FROM` y `MAIL_TRANSPORT=console`, y quitar `JWT_REFRESH_SECRET`. Confirmar que `/api/v1/health` sigue respondiendo 200 sin token. Crear el soporte e2e en `apps/api/test/support/`:
  - `create-test-app.ts`: monta `AppModule` con `cookieParser`, el prefijo y el versionado de `main.ts`, y sobrescribe `MAILER` con `CapturingMailer`;
  - `reset-db.ts`: `TRUNCATE` de las tablas de auth y `users`;
  - `extract-token.ts`: saca el token del enlace del último correo capturado.

  Documentar en `apps/api/test/jest-e2e.json` o en el README que el e2e usa `DATABASE_URL` apuntando a `ultimatecanvas_test`.

### UI y cliente web comunes

- [x] T032 [P] Revisar `packages/ui/src/styles/tokens.css` y `packages/ui/src/styles/glass-tokens.css`. Añadir los tokens semánticos que falten para formularios y alertas (por ejemplo `--color-success`, `--color-warning`, `--color-info`, `--color-focus-ring`, `--color-input-bg` y `--color-input-border`), con sus valores de modo oscuro si el archivo de cristal los define.
- [x] T033 [P] Crear el átomo `Input` en `packages/ui/src/atoms/Input/` (`Input.tsx`, `Input.types.ts`, `index.ts`, `Input.stories.tsx`): `forwardRef<HTMLInputElement>`, props nativas más `invalid?: boolean`, que pone `aria-invalid` y el borde de error con token. Exportarlo en `packages/ui/src/atoms/index.ts`.
- [x] T034 [P] Crear el átomo `Checkbox` en `packages/ui/src/atoms/Checkbox/` (mismos archivos): `forwardRef`, `label: ReactNode` y foco visible. Exportarlo en `packages/ui/src/atoms/index.ts`.
- [x] T035 Crear la molécula `FormField` en `packages/ui/src/molecules/FormField/`: props `label`, `htmlFor`, `hint?`, `error?: string | string[]` y `children`. Enlaza `aria-describedby` con los ids de la ayuda y del error, y muestra el error con `role="alert"`. Exportarla en `packages/ui/src/molecules/index.ts`.
- [x] T036 Crear la molécula `PasswordField` en `packages/ui/src/molecules/PasswordField/`: usa `Input` con un botón de mostrar u ocultar (`aria-pressed` y etiquetas "Mostrar contraseña" / "Ocultar contraseña" pasadas como props, sin texto fijo en el paquete). `autoComplete` llega por props (`current-password` / `new-password`). Incluir sus stories y exportarla.
- [x] T037 [P] Crear la molécula `Alert` en `packages/ui/src/molecules/Alert/`: `variant: 'info' | 'success' | 'warning' | 'danger'`, `title?` y `children`; `role="alert"` para `danger` y `warning`, `role="status"` para el resto; colores solo con tokens. Incluir sus stories y exportarla.
- [x] T038 [P] Crear la plantilla `AuthLayout` en `packages/ui/src/templates/AuthLayout/` (tarjeta centrada con `title`, `subtitle?`, `children` y `footer?`, basada en `Card`) y `packages/ui/src/templates/index.ts`. Añadir `export * from './templates';` en `packages/ui/src/index.ts`. Ejecutar `pnpm --filter @ucanvas/ui build` y comprobar en Storybook.
- [x] T039 [P] Crear `apps/web/src/lib/authToken.ts`: almacén del token de acceso en memoria (`getAccessToken`, `setAccessToken(token, expiresIn)`, `clearAccessToken`, `getExpiresAt` y `subscribe(listener)`), sin `localStorage` ni `sessionStorage`.
- [x] T040 Modificar `apps/web/src/lib/apiClient.ts`:
  - eliminar `AUTH_TOKEN_KEY` y la lectura de `localStorage`; tomar el token de `authToken.ts`;
  - enviar `credentials: 'include'`;
  - añadir la cabecera `X-Requested-With: ucanvas` en las peticiones a `/auth/refresh` y `/auth/logout`;
  - hacer que `ApiError` exponga `code?: string` y `rules?: string[]`, leídos de `error.code` y `error.rules` cuando `error` es un objeto;
  - añadir el hook `setUnauthorizedHandler(fn)`, que se invoca ante un 401 en peticiones autenticadas (lo implementa US2).
- [x] T041 Ampliar `apps/web/src/lib/router.ts` con `register: '/register'`, `verifyEmail: '/verify-email'`, `forgotPassword: '/forgot-password'`, `resetPassword: '/reset-password'` y `accountSecurity: '/account/security'`.
- [x] T042 [P] Crear `apps/web/src/features/auth/services/auth.service.ts` con una función por endpoint de contracts/auth-api.md (`register`, `verifyEmail`, `resendVerification`, `login`, `refresh`, `logout`, `forgotPassword`, `resetPassword`, `changePassword`, `me`), tipadas con los tipos de `@ucanvas/shared`. Crear también `apps/web/src/features/auth/index.ts` como barrel.

**Checkpoint**: migración aplicada, `pnpm typecheck` en verde, `/health` público, `/users` responde 401 y los componentes nuevos se ven en Storybook.

---

## Phase 3: User Story 1 - Registro con verificación de correo (Priority: P1) 🎯 MVP

**Goal**: una persona crea su cuenta con correo y contraseña, recibe un enlace de un solo uso válido 24 h y, al abrirlo, la cuenta queda verificada.

**Independent Test**: registrar un correo nuevo, abrir el enlace (log de la API o Mailpit) y comprobar que la cuenta pasa a verificada (`email_verified_at` no nulo) y que el enlace no se puede reutilizar (quickstart § 1).

### Tests for User Story 1

- [x] T043 [P] [US1] Test unitario `apps/api/src/modules/auth/application/use-cases/register.use-case.spec.ts`, con un caso por fila de la tabla de `/auth/register` en contracts/auth-api.md:
  - correo nuevo: crea una cuenta PENDIENTE y envía el correo de verificación;
  - correo con mayúsculas o espacios: queda normalizado;
  - correo PENDIENTE: sustituye `passwordHash`, invalida los tokens previos y emite uno nuevo (FR-032);
  - correo VERIFICADO: no cambia nada y encola `REGISTRATION_ATTEMPT`;
  - política incumplida: `PasswordPolicyViolationError` con todas las reglas;
  - límite de envíos: no envía.
- [x] T044 [P] [US1] Test unitario `apps/api/src/modules/auth/application/use-cases/verify-email.use-case.spec.ts`: token vigente (verifica la cuenta); token usado; token caducado (24 h + 1 ms); token invalidado por uno posterior; token inexistente. Los cuatro últimos lanzan `InvalidLinkError`.
- [x] T045 [P] [US1] Test unitario `apps/api/src/modules/auth/application/use-cases/resend-verification.use-case.spec.ts`: cuenta PENDIENTE (invalida los previos y envía); cuenta verificada, inexistente o con el límite superado (no envía). En todos los casos el resultado es el mismo.

### Implementation for User Story 1

- [x] T046 [US1] Implementar `apps/api/src/modules/auth/application/use-cases/register.use-case.ts` (`execute({ email, password }, ctx)`):
  1. normalizar el correo;
  2. `evaluatePassword` (si hay reglas incumplidas, `PasswordPolicyViolationError`);
  3. **siempre** `hasher.hash(password)`, para igualar el tiempo de respuesta;
  4. según el caso:
     - cuenta inexistente: `create` PENDIENTE, token `EMAIL_VERIFICATION` con validez de 24 h, `rateLimiter.sendLimited(… templates.emailVerification(\`${appWebUrl}/verify-email?token=${raw}\`))`y evento`REGISTERED`;
     - cuenta PENDIENTE: `replacePendingPassword`, `invalidateActive`, token nuevo, envío y evento `REGISTRATION_REPLACED`;
     - cuenta verificada: `sendLimited(REGISTRATION_ATTEMPT, templates.registrationAttempt(...))` y evento `REGISTRATION_ATTEMPT_EXISTING`;
  5. no devolver nada que dependa del caso.
- [x] T047 [US1] Implementar `apps/api/src/modules/auth/application/use-cases/verify-email.use-case.ts`: `tokenGenerator.hash(raw)`, `emailTokens.consume(hash, 'EMAIL_VERIFICATION', now)`; si es nulo, `InvalidLinkError`; si no, `account.verifyEmail(now)`, `save` y evento `EMAIL_VERIFIED`.
- [x] T048 [US1] Implementar `apps/api/src/modules/auth/application/use-cases/resend-verification.use-case.ts`: solo si la cuenta existe y está PENDIENTE, `invalidateActive` + token nuevo + `sendLimited`. Si no, no hace nada. Nunca lanza errores que dependan del caso.
- [x] T049 [P] [US1] Crear los DTO en `apps/api/src/modules/auth/presentation/dto/`: `register.dto.ts` (`implements RegisterDto`, con `@IsEmail`, `@IsString`, `@MaxLength(128)` y `@Transform(trim + lowercase)` en el correo), `email-only.dto.ts`, `token.dto.ts` (`@Matches(/^[A-Za-z0-9_-]{43}$/)`) y `message-response.dto.ts` (`{ message }`), todos con `@ApiProperty`.
- [x] T050 [US1] Crear `apps/api/src/modules/auth/presentation/auth.controller.ts` con `@ApiTags('auth')`, `@Controller('auth')` y un helper `requestContext(req)` que obtiene `{ ip, userAgent }`. Endpoints:
  - `POST register`: `@Public()`, `@Throttle({ default: { limit: 10, ttl: 60_000 } })`, `@HttpCode(202)`, responde `{ message: AUTH_MESSAGES.CHECK_YOUR_EMAIL }`;
  - `POST verify-email`: `@Public()`, mismo `@Throttle`, `@HttpCode(200)`, responde `{ message: AUTH_MESSAGES.EMAIL_VERIFIED }`;
  - `POST resend-verification`: `@Public()`, mismo `@Throttle`, `@HttpCode(202)`.

  Cada endpoint lleva `@ApiOperation` y `@ApiResponse` con los códigos de contracts/auth-api.md. Registrar el controlador y los casos de uso en `auth.module.ts`.

- [x] T051 [US1] Test e2e `apps/api/test/auth-register.e2e-spec.ts`:
  - registro → captura del enlace → `verify-email` 200 → reutilizar el enlace da 400;
  - registrar de nuevo un correo PENDIENTE invalida el primer enlace;
  - registrar un correo verificado devuelve 202 y envía `REGISTRATION_ATTEMPT`;
  - 422 con `rules` para `password123`.
- [x] T052 [P] [US1] Crear `apps/web/src/features/auth/components/PasswordRulesHint.tsx` (lista de reglas con su estado en vivo, usando `passwordSchema` y los mensajes de `AUTH_MESSAGES`) y `apps/web/src/features/auth/components/CheckEmailNotice.tsx` (`Alert` de tipo info con `CHECK_YOUR_EMAIL` y un enlace para volver al login). Solo componen `@ucanvas/ui`.
- [x] T053 [US1] Crear `apps/web/src/features/auth/components/RegisterForm.tsx` y `apps/web/src/features/auth/hooks/useRegister.ts` (mutación de TanStack Query):
  - campos de correo y contraseña (`PasswordField` con `autoComplete="new-password"`) y `PasswordRulesHint`;
  - validación en el cliente con `registerSchema`;
  - con `422`, muestra `rules` en el `FormField`;
  - si va bien, llama a `onSuccess()`.
- [x] T054 [US1] Crear `apps/web/src/pages/RegisterPage.tsx`: `AuthLayout` con título "Crear cuenta". Muestra `RegisterForm` y, tras el éxito, `CheckEmailNotice`. Incluye un enlace a `ROUTES.login`.
- [x] T055 [US1] Crear `apps/web/src/features/auth/components/ResendVerificationForm.tsx` y `apps/web/src/features/auth/hooks/useResendVerification.ts`: un campo de correo; siempre muestra `CHECK_YOUR_EMAIL` tras enviar.
- [x] T056 [US1] Crear `apps/web/src/pages/VerifyEmailPage.tsx`: lee `token` de la query; al montarse hace una sola llamada a `verifyEmail`, protegida contra la doble ejecución de StrictMode con `useRef`; mientras tanto muestra un `Spinner`; si va bien, `Alert` success con un enlace a login; con `INVALID_LINK`, `Alert` danger y `ResendVerificationForm`.
- [x] T057 [US1] Añadir a `apps/web/src/routes/AppRoutes.tsx` las rutas públicas `ROUTES.register` → `RegisterPage` y `ROUTES.verifyEmail` → `VerifyEmailPage`.

**Checkpoint**: US1 funciona por sí sola. Se puede registrar y verificar una cuenta desde la web (quickstart § 1, pasos 1, 2, 4, 5 y 6).

---

## Phase 4: User Story 2 - Inicio de sesión, sesión renovable y cierre de sesión (Priority: P1)

**Goal**: un usuario verificado entra con correo y contraseña; la sesión se renueva mientras está activo, dura 30 días con "mantener sesión iniciada" y se puede cerrar.

**Independent Test**: con una cuenta verificada (seed o US1), iniciar sesión con y sin "mantener sesión iniciada", comprobar la cookie, la renovación y que `logout` invalida la sesión (quickstart § 2).

### Tests for User Story 2

- [x] T058 [P] [US2] Test unitario `apps/api/src/modules/auth/application/use-cases/login.use-case.spec.ts`:
  - correctas: crea la sesión, firma un JWT con `sub` y `sid` y pone el contador a 0;
  - contraseña errónea: `InvalidCredentialsError`;
  - correo inexistente: `InvalidCredentialsError` y `hasher.verify` invocado igualmente contra el hash ficticio;
  - el hash ficticio se calcula una sola vez aunque haya varios inicios de sesión con correos inexistentes;
  - PENDIENTE con contraseña correcta: `EmailNotVerifiedError`;
  - PENDIENTE con contraseña errónea: `InvalidCredentialsError`;
  - `passwordHash` nulo: `InvalidCredentialsError`;
  - `rememberMe` true o false: `expiresAt` correcto.
- [x] T059 [P] [US2] Test unitario `apps/api/src/modules/auth/application/use-cases/refresh-session.use-case.spec.ts`:
  - sesión activa: nuevo token de acceso y `lastActivityAt` actualizado;
  - inactiva 2 h sin `rememberMe`: `SessionExpiredError`;
  - con `rememberMe`, 29 días: activa;
  - con `rememberMe`, 30 días: `SessionExpiredError`;
  - revocada o con hash desconocido: `SessionExpiredError`.
- [x] T060 [P] [US2] Test unitario `apps/api/src/modules/auth/application/use-cases/logout.use-case.spec.ts`: revoca con `LOGOUT`; sin sesión o con hash desconocido no lanza.

### Implementation for User Story 2

- [x] T061 [US2] Crear `apps/api/src/modules/auth/application/services/access-token.service.ts`: `issue(account, session): { accessToken, expiresIn }`, usando `JwtService.signAsync({ sub: account.id, sid: session.id })`. `expiresIn` en segundos se obtiene de `exp - iat` del token firmado (`jwtService.decode`), de modo que siempre coincide con `JWT_EXPIRES_IN`.
- [x] T062 [US2] Implementar `apps/api/src/modules/auth/application/use-cases/login.use-case.ts` (`execute({ email, password, rememberMe }, ctx)`):
  1. normalizar el correo;
  2. cargar la cuenta;
  3. `verify` contra `account.passwordHash` o contra un hash ficticio. El caso de uso guarda en un campo privado la promesa `this.dummyHash = hasher.hash('dummy-password-for-timing-1')`, creada en el constructor, y hace `await this.dummyHash` cuando la necesita. Así se calcula una sola vez y no bloquea el arranque (research R6);
  4. si la cuenta no existe, no tiene hash o la contraseña es errónea, evento `LOGIN_FAILED` (con `metadata.reason`) e `InvalidCredentialsError`;
  5. si la contraseña es correcta pero la cuenta no está verificada, evento `LOGIN_BLOCKED_UNVERIFIED` y `EmailNotVerifiedError`;
  6. si todo va bien, `resetFailedAttempts`, `tokenGenerator.generate()`, `Session.create`, `sessions.create`, evento `LOGIN_SUCCEEDED` y devolver `{ session: AuthSession, cookie: { raw, rememberMe, expiresAt } }`.

  El contador y el bloqueo se añaden en US5 (T093 y T094).

- [x] T063 [US2] Implementar `apps/api/src/modules/auth/application/use-cases/refresh-session.use-case.ts`: `hash(raw)`, `findByTokenHash`; si no existe o no está activa, `SessionExpiredError` (si existe, ha caducado y no está revocada, antes `revoke('EXPIRED', now)` y `save`); si lo está, `touch(now)`, `save`, cargar la cuenta (y fallar si ya no está verificada o no existe) y devolver `AuthSession` + `{ rememberMe, expiresAt }`.
- [x] T064 [US2] Implementar `apps/api/src/modules/auth/application/use-cases/logout.use-case.ts` (revoca con `LOGOUT` la sesión del hash dado, si existe, y registra el evento `LOGOUT`) y `apps/api/src/modules/auth/application/use-cases/get-current-account.use-case.ts` (por `userId` devuelve `AuthUser`; si no existe, `SessionExpiredError`).
- [x] T065 [US2] Crear `apps/api/src/modules/auth/presentation/session-cookie.ts`:
  - `SESSION_COOKIE = 'ucanvas_session'`;
  - `setSessionCookie(res, raw, { rememberMe, expiresAt, secure })` con `httpOnly`, `sameSite: 'strict'`, `path: '/api/v1/auth'`, `secure` = `nodeEnv === 'production'` y `maxAge` solo si `rememberMe`, igual a `expiresAt - now`;
  - `clearSessionCookie(res)`;
  - `readSessionCookie(req)`;
  - `assertCsrfHeader(req)`: si falta `X-Requested-With: ucanvas`, lanza `ForbiddenException`.
- [x] T066 [P] [US2] Crear los DTO `apps/api/src/modules/auth/presentation/dto/login.dto.ts` (`implements LoginDto`, con `rememberMe` `@IsBoolean`), `auth-session-response.dto.ts` y `auth-user-response.dto.ts` (con `static fromDomain`).
- [x] T067 [US2] Añadir a `apps/api/src/modules/auth/presentation/auth.controller.ts`:
  - `POST login`: `@Public()`, `@Throttle` 10 por minuto, `@HttpCode(200)`, usa `@Res({ passthrough: true })` para `setSessionCookie`;
  - `POST refresh`: `@Public()`, `assertCsrfHeader`; si va bien, reemite la cookie cuando `rememberMe`; con `SessionExpiredError`, `clearSessionCookie` y vuelve a lanzar el error;
  - `POST logout`: `@Public()`, `assertCsrfHeader`, `@HttpCode(204)`, siempre llama a `clearSessionCookie`;
  - `GET me`: autenticado, `@ApiBearerAuth()`, usa `@CurrentUser()`.

  Registrar los casos de uso en `auth.module.ts`.

- [x] T068 [US2] Test e2e `apps/api/test/auth-session.e2e-spec.ts`, con una cuenta verificada preparada directamente con Prisma:
  - login: comprobar los atributos de `Set-Cookie` (`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, sin `Max-Age` si `rememberMe=false` y con unos 30 días si es true);
  - `me` con el token responde 200;
  - `refresh` sin `X-Requested-With` responde 403 y con ella 200;
  - `logout` deja `refresh` en 401 y `me` con el token anterior en 401 (revocación inmediata vía `sid`);
  - `/api/v1/users` sin token responde 401.
- [x] T069 [US2] Crear `apps/web/src/features/auth/context/AuthProvider.tsx` y `apps/web/src/features/auth/hooks/useAuth.ts` (contracts/web-routes.md § "Estado de sesión"):
  - estado `status: 'bootstrapping' | 'authenticated' | 'anonymous'` y `user`;
  - al montarse, `refresh()` decide entre `authenticated` y `anonymous`;
  - `login(dto)` llama a `setAccessToken` y fija `user`;
  - `logout()` llama a la API, limpia y difunde el cierre;
  - `BroadcastChannel('ucanvas-auth')` emite y escucha `logout` y `session-ended`;
  - registra en `apiClient.setUnauthorizedHandler` un refresh **único compartido** (una sola promesa en curso): si va bien, reintenta la petición original una vez; si falla, `clearAccessToken`, `status = 'anonymous'` y difunde `session-ended`.

  Envolver la aplicación con `AuthProvider` en `apps/web/src/App.tsx`, dentro de `QueryClientProvider` y `BrowserRouter`.

- [x] T070 [US2] Completar en `apps/web/src/lib/apiClient.ts` el reintento tras 401: si la petición no es a `/auth/*` y hay un handler registrado, `await handler()` y repetir la petición una vez con el token nuevo; si vuelve a fallar, lanzar `ApiError`.
- [x] T071 [US2] Crear `apps/web/src/features/auth/hooks/useSessionKeepAlive.ts`: escucha `pointerdown`, `keydown`, `wheel` y `focus` (con `passive`) y guarda `lastInteractionAt`; programa un temporizador para `expiresAt - 60 s`; al dispararse, si `now - lastInteractionAt < 15 min`, llama a `refresh()` y reprograma; si no, no renueva. Se usa dentro de `AuthProvider` cuando `status === 'authenticated'`.
- [x] T072 [US2] Crear `apps/web/src/features/auth/components/LoginForm.tsx` y `apps/web/src/features/auth/hooks/useLogin.ts`:
  - campos de correo y contraseña (`autoComplete="current-password"`) y `Checkbox` "Mantener sesión iniciada";
  - con `401`, `Alert` danger con `AUTH_MESSAGES.INVALID_CREDENTIALS`;
  - con `403 EMAIL_NOT_VERIFIED`, `Alert` warning y un botón "Reenviar enlace" que llama a `resendVerification(email)`;
  - enlaces a `ROUTES.register` y `ROUTES.forgotPassword`;
  - si va bien, `onSuccess()`.
- [x] T073 [US2] Crear `apps/web/src/pages/LoginPage.tsx`: `AuthLayout` "Iniciar sesión" con `LoginForm`. Si va bien, navega a `ROUTES.home` (el retorno a `returnTo` llega en US3). Si `status === 'authenticated'` al entrar, redirige a `ROUTES.home`. Sustituir el placeholder de `ROUTES.login` en `apps/web/src/routes/AppRoutes.tsx`.
- [x] T074 [US2] Añadir la acción "Cerrar sesión" en `apps/web/src/pages/UsersPage.tsx`, con `Button` variante `ghost` que llama a `useAuth().logout()` y navega a `ROUTES.login`, y mostrar el correo del usuario actual. Es la única página privada existente; si después se crea una cabecera común, mover la acción allí.
- [x] T075 [P] [US2] Tests web `apps/web/src/features/auth/context/AuthProvider.test.tsx`, con `fetch` simulado:
  - arranque con refresh correcto da `authenticated` y con 401 da `anonymous`;
  - dos peticiones que reciben 401 a la vez provocan **un solo** refresh;
  - `logout` limpia el token.

**Checkpoint**: US1 y US2 forman el MVP. Se puede registrar, verificar, iniciar sesión, mantener la sesión y cerrarla.

---

## Phase 5: User Story 3 - Acceso a páginas privadas y retorno tras iniciar sesión (Priority: P2)

**Goal**: sin sesión, las páginas privadas llevan al login sin mostrar contenido y, al entrar, se vuelve a la página original (solo si es de la propia plataforma).

**Independent Test**: sin sesión, abrir `/users?page=2`, iniciar sesión y aterrizar en `/users?page=2`; con `returnTo=//evil.example`, aterrizar en `/` (quickstart § 3).

### Tests for User Story 3

- [x] T076 [P] [US3] Test `apps/web/src/utils/safeReturnTo.test.ts`. Acepta `/users?page=2#x` y `/account/security`. Rechaza (devuelve `/`): `null`, `''`, `users`, `//evil.example`, `/\evil.example`, `https://evil.example`, `javascript:alert(1)`, `/\t/evil` y valores con caracteres de control.
- [x] T077 [P] [US3] Test `apps/web/src/routes/ProtectedRoute.test.tsx`: con `bootstrapping` muestra el spinner y no los hijos; con `anonymous` navega a `/login?returnTo=%2Fusers%3Fpage%3D2`; con `authenticated` muestra los hijos.

### Implementation for User Story 3

- [x] T078 [P] [US3] Implementar `apps/web/src/utils/safeReturnTo.ts` según contracts/web-routes.md § "safeReturnTo": empieza por `/`; no empieza por `//` ni por `/\`; sin `\` ni caracteres de control (`/[\u0000-\u001F\u007F]/`); `new URL(value, window.location.origin).origin === window.location.origin`. Si no cumple, devuelve `'/'`.
- [x] T079 [US3] Reescribir `apps/web/src/routes/ProtectedRoute.tsx`: con `useAuth()`, si `bootstrapping`, `Spinner` centrado; si `anonymous`, `<Navigate to={\`${ROUTES.login}?returnTo=${encodeURIComponent(pathname + search + hash)}\`} replace />`; si no, los hijos. Eliminar el comentario `TODO(auth)`.
- [x] T080 [US3] Modificar `apps/web/src/pages/LoginPage.tsx`: leer `returnTo` de la query; tras iniciar sesión, y también si ya hay sesión al entrar, `navigate(safeReturnTo(returnTo), { replace: true })`.
- [x] T081 [US3] Revisar `apps/web/src/routes/AppRoutes.tsx`: `ROUTES.home` y `ROUTES.users` dentro de `ProtectedRoute`; las rutas de auth (`login`, `register`, `verify-email`, `forgot-password` y `reset-password`) fuera. Añadir una ruta `*` que redirija a `ROUTES.home`.

**Checkpoint**: las páginas privadas están protegidas y el retorno funciona.

---

## Phase 6: User Story 4 - Recuperación de contraseña (Priority: P2)

**Goal**: pedir un enlace válido 60 minutos y de un solo uso, fijar una contraseña nueva y cerrar todas las sesiones.

**Independent Test**: con sesiones en dos navegadores, completar la recuperación y comprobar que ambas quedan fuera en menos de 1 minuto y que solo funciona el último enlace (quickstart § 4).

### Tests for User Story 4

- [x] T082 [P] [US4] Test unitario `apps/api/src/modules/auth/application/use-cases/request-password-reset.use-case.spec.ts`: cuenta existente (invalida los previos, crea un token de 60 min y envía); cuenta inexistente (no envía y no lanza); límite superado (no envía); cuenta PENDIENTE (envía igualmente, porque recuperar no exige verificación previa; documentarlo en el test).
- [x] T083 [P] [US4] Test unitario `apps/api/src/modules/auth/application/use-cases/reset-password.use-case.spec.ts`:
  - éxito: cambia el hash, consume el token, revoca **todas** las sesiones con `PASSWORD_RESET`, encola `PASSWORD_CHANGED` y fija `passwordChangedAt`;
  - política incumplida: `PasswordPolicyViolationError` y el token **sigue** válido;
  - token caducado (60 min), usado o invalidado: `InvalidLinkError`;
  - cuenta PENDIENTE: queda verificada, porque demostró tener el buzón.

### Implementation for User Story 4

- [x] T084 [US4] Implementar `apps/api/src/modules/auth/application/use-cases/request-password-reset.use-case.ts`: normalizar el correo; si la cuenta existe, `invalidateActive(userId, 'PASSWORD_RESET')`, token con validez de 60 min, `sendLimited(PASSWORD_RESET, templates.passwordReset(\`${appWebUrl}/reset-password?token=${raw}\`))`y evento`PASSWORD_RESET_REQUESTED`. Si no existe, no hace nada. El resultado es siempre el mismo.
- [x] T085 [US4] Implementar `apps/api/src/modules/auth/application/use-cases/reset-password.use-case.ts`:
  1. `evaluatePassword` **antes** de tocar el token;
  2. `findValid(hash, 'PASSWORD_RESET')` (si no, `InvalidLinkError`);
  3. `hasher.hash`;
  4. `consume` (si devuelve nulo por una carrera, `InvalidLinkError`);
  5. `account.changePassword(hash, now)`, `resetFailedAttempts()` y `unlock()` (FR-017); si estaba PENDIENTE, `verifyEmail(now)`;
  6. `save`, `sessions.revokeAllForUser(userId, 'PASSWORD_RESET', now)` y `dispatcher.enqueue(templates.passwordChanged(...))` (no limitado), y evento `PASSWORD_RESET_COMPLETED`.
- [x] T086 [P] [US4] Crear el DTO `apps/api/src/modules/auth/presentation/dto/reset-password.dto.ts` (`implements ResetPasswordDto`).
- [x] T087 [US4] Añadir a `apps/api/src/modules/auth/presentation/auth.controller.ts` los endpoints `POST forgot-password` (`@Public()`, `@Throttle` 10 por minuto, `@HttpCode(202)`) y `POST reset-password` (`@Public()`, `@Throttle` 10 por minuto, `@HttpCode(204)`, y `clearSessionCookie` en la respuesta). Registrarlos en `auth.module.ts`.
- [x] T088 [US4] Test e2e `apps/api/test/auth-reset.e2e-spec.ts`: dos sesiones activas → `forgot-password` dos veces (con el reloj avanzado más de 60 s o sobrescribiendo el limitador) → el primer enlace da 400 → el segundo con una contraseña inválida da 422 y el enlace sigue sirviendo → con una válida da 204 → `me` con ambos tokens da 401 → login con la contraseña nueva da 200.
- [x] T089 [US4] Crear `apps/web/src/features/auth/components/ForgotPasswordForm.tsx` y `apps/web/src/features/auth/hooks/useForgotPassword.ts` (siempre muestra `CheckEmailNotice` tras enviar), y `apps/web/src/pages/ForgotPasswordPage.tsx` (`AuthLayout` "Recuperar contraseña").
- [x] T090 [US4] Crear `apps/web/src/features/auth/components/ResetPasswordForm.tsx` y `apps/web/src/features/auth/hooks/useResetPassword.ts`: contraseña nueva, confirmación (debe coincidir; validado en el cliente) y `PasswordRulesHint`; con `422`, muestra las reglas. Crear `apps/web/src/pages/ResetPasswordPage.tsx`: lee `token`; si va bien, `Alert` success "Contraseña cambiada. Hemos cerrado todas tus sesiones." y un enlace a login; con `INVALID_LINK`, `Alert` danger y un enlace a `ROUTES.forgotPassword`.
- [x] T091 [US4] Añadir a `apps/web/src/routes/AppRoutes.tsx` las rutas públicas `ROUTES.forgotPassword` y `ROUTES.resetPassword`.

**Checkpoint**: la recuperación funciona de extremo a extremo y cierra todas las sesiones.

---

## Phase 7: User Story 5 - Bloqueo por intentos fallidos (Priority: P3)

**Goal**: 5 fallos consecutivos bloquean la cuenta 15 minutos, con un único aviso por correo; durante el bloqueo, incluso la contraseña correcta falla con el mensaje genérico.

**Independent Test**: 5 contraseñas erróneas → el 6.º intento con la correcta da 401 → llega un correo de bloqueo → tras 15 minutos (reloj falso) entra (quickstart § 5).

### Tests for User Story 5

- [x] T092 [P] [US5] Test unitario `apps/api/src/modules/auth/application/services/login-attempts.service.spec.ts`:
  - 4 fallos: no bloquea;
  - 5.º fallo: `lockedUntil = now + 15 min`, contador a 0 y **un** correo `LOCKOUT_ALERT` encolado, más el evento `ACCOUNT_LOCKED`;
  - intentos durante el bloqueo: no incrementan ni reenvían;
  - tras el bloqueo: el contador empieza de cero;
  - `recordSuccess`: pone el contador a 0.

  Ampliar `login.use-case.spec.ts` con: bloqueada + contraseña correcta da `InvalidCredentialsError` y no crea sesión.

### Implementation for User Story 5

- [x] T093 [US5] Crear `apps/api/src/modules/auth/application/services/login-attempts.service.ts`:
  - `assertNotLocked(account, now)` devuelve un booleano;
  - `recordFailure(account, now, ctx)`: si la cuenta está bloqueada, no hace nada; si no, llama a `accounts.incrementFailedAttempts(id, now)`. Si el resultado trae `lockedUntil > now` y antes no estaba bloqueada, encola `templates.lockoutAlert(now)` con `dispatcher.enqueue` (sin límite), registra el envío `LOCKOUT_ALERT` y el evento `ACCOUNT_LOCKED`;
  - `recordSuccess(account)` pone el contador a 0.
- [x] T094 [US5] Integrar en `apps/api/src/modules/auth/application/use-cases/login.use-case.ts`: tras cargar la cuenta y **después** de `verify`, para mantener el mismo tiempo de respuesta, si `isLocked(now)`, evento `LOGIN_FAILED` (`reason: 'LOCKED'`) e `InvalidCredentialsError`; si la contraseña es errónea y la cuenta existe, `loginAttempts.recordFailure`. Sustituir `resetFailedAttempts` por `loginAttempts.recordSuccess`.
- [x] T095 [US5] Verificar que `reset-password.use-case.ts` desbloquea (`unlock()` y contador a 0, ya hecho en T085) y añadir el caso "cuenta bloqueada → recuperación → login correcto" en `apps/api/test/auth-reset.e2e-spec.ts`.
- [x] T096 [US5] Test e2e `apps/api/test/auth-lockout.e2e-spec.ts`: 5 logins fallidos → el 6.º con la contraseña correcta da 401 con el **mismo** cuerpo que un fallo normal → `CapturingMailer` tiene exactamente 1 `LOCKOUT_ALERT` → con `lockedUntil` adelantado por SQL (o reloj sobrescrito) el login da 200.

**Checkpoint**: el bloqueo funciona y no revela nada distinto en pantalla.

---

## Phase 8: User Story 6 - Cambio de contraseña con sesión iniciada (Priority: P3)

**Goal**: con sesión iniciada, cambiar la contraseña indicando la actual; se cierran las sesiones de los demás dispositivos (no la actual) y se avisa por correo.

**Independent Test**: con sesiones en dos navegadores, cambiar la contraseña en A: A sigue dentro, B queda fuera en menos de 1 minuto y llega el aviso (quickstart § 6).

### Tests for User Story 6

- [x] T097 [P] [US6] Test unitario `apps/api/src/modules/auth/application/use-cases/change-password.use-case.spec.ts`:
  - éxito: revoca las demás sesiones con `PASSWORD_CHANGED`, mantiene la actual, encola el aviso y fija `passwordChangedAt`;
  - contraseña actual errónea: `InvalidCurrentPasswordError` y `recordFailure`;
  - 5.º fallo: bloquea;
  - cuenta bloqueada: `AccountLockedError` sin verificar la contraseña;
  - contraseña nueva inválida: `PasswordPolicyViolationError` sin cambios.

### Implementation for User Story 6

- [x] T098 [US6] Implementar `apps/api/src/modules/auth/application/use-cases/change-password.use-case.ts` (`execute({ userId, sessionId, currentPassword, newPassword }, ctx)`):
  1. cargar la cuenta;
  2. si `isLocked(now)`, `AccountLockedError`;
  3. `evaluatePassword(newPassword)`;
  4. `verify(currentPassword)`: si es errónea, `loginAttempts.recordFailure`, evento `PASSWORD_CHANGE_FAILED` e `InvalidCurrentPasswordError` (FR-036);
  5. si va bien, `hash`, `changePassword`, `recordSuccess`, `save`, `sessions.revokeAllForUserExcept(userId, sessionId, 'PASSWORD_CHANGED', now)`, `dispatcher.enqueue(templates.passwordChanged(...))` y evento `PASSWORD_CHANGED`.

  Requiere US5 (`LoginAttemptsService`). Si se implementa antes, crear primero T093.

- [x] T099 [P] [US6] Crear el DTO `apps/api/src/modules/auth/presentation/dto/change-password.dto.ts` (`implements ChangePasswordDto`).
- [x] T100 [US6] Añadir a `apps/api/src/modules/auth/presentation/auth.controller.ts` el endpoint `POST change-password`: autenticado, `@ApiBearerAuth()`, `@HttpCode(204)`, usa `@CurrentUser()` para `userId` y `sessionId`; documentar 400, 422 y 423. Registrarlo en `auth.module.ts`.
- [x] T101 [US6] Test e2e `apps/api/test/auth-change-password.e2e-spec.ts`: dos sesiones → cambio desde la 1 da 204 → `me` con la 1 da 200 y con la 2 da 401 → `CapturingMailer` tiene un `PASSWORD_CHANGED` → 5 contraseñas actuales erróneas → la siguiente petición da 423.
- [x] T102 [US6] Crear `apps/web/src/features/auth/components/ChangePasswordForm.tsx` y `apps/web/src/features/auth/hooks/useChangePassword.ts`: contraseña actual, nueva y confirmación, y `PasswordRulesHint`. Con `INVALID_CURRENT_PASSWORD`, error en el campo actual. Con `ACCOUNT_LOCKED`, `Alert` warning. Si va bien, `Alert` success "Contraseña cambiada. Hemos cerrado tu sesión en los demás dispositivos." y limpia el formulario.
- [x] T103 [US6] Crear `apps/web/src/pages/AccountSecurityPage.tsx` con `ChangePasswordForm` y añadir `ROUTES.accountSecurity` dentro de `ProtectedRoute` en `apps/web/src/routes/AppRoutes.tsx`. Añadir un enlace a "Seguridad de la cuenta" junto a "Cerrar sesión" en `apps/web/src/pages/UsersPage.tsx`.

**Checkpoint**: las 6 historias funcionan.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T104 Test e2e de enumeración `apps/api/test/auth-enumeration.e2e-spec.ts` (SC-007). Para `login`, `register`, `resend-verification` y `forgot-password`, con 20 correos registrados y 20 no registrados:
  - estado y cuerpo JSON idénticos;
  - diferencia de medianas de latencia por debajo de 50 ms (umbral configurable por variable de entorno para CI).

  Incluye `login` de una cuenta bloqueada frente a una contraseña errónea.

- [x] T105 Test e2e del límite de correos `apps/api/test/auth-email-rate-limit.e2e-spec.ts` (FR-030, FR-031): 5 `resend-verification` seguidos dan siempre 202 y 1 solo correo capturado; con el reloj o la tabla `email_dispatches` manipulada, como máximo 3 por hora.
- [x] T106 [P] Test que verifica SC-009 en `apps/api/test/auth-secrets.e2e-spec.ts`: tras ejecutar todos los flujos, `security_events.metadata`, `sessions` y `email_tokens` no contienen la contraseña en claro ni el token en claro (búsqueda de cadenas). El log capturado (con `Logger` sobrescrito) no contiene contraseñas.
- [x] T107 [P] Actualizar `apps/api/prisma/seed.ts`: los 3 usuarios demo con `emailVerifiedAt = now`, `passwordHash = argon2('Demo-canvas-2026')` (cumple la política y no es común) y el correo normalizado. Documentar la contraseña de desarrollo en `apps/api/README.md`.
- [x] T108 [P] Actualizar `apps/api/README.md`: nueva sección "Autenticación", con el modelo de sesión (research R2), las variables nuevas, `MAIL_TRANSPORT=console` frente a Mailpit, cómo marcar rutas con `@Public()` y cómo ejecutar el e2e con la base de datos de test. Incluir cómo calcular SC-002 a partir de las líneas `mail.sent` del log (percentil 95 de `latencyMs`) y la limitación conocida: la cola es en memoria y los correos pendientes se pierden si la API se reinicia (plan § Riesgos).
- [x] T109 [P] Actualizar `apps/web/src/README.md` con la feature `auth`, el token en memoria, `ProtectedRoute` y `safeReturnTo`.
- [x] T110 Revisar la documentación Swagger en http://localhost:3000/docs: todos los endpoints de `auth` con ejemplos y códigos de respuesta según contracts/auth-api.md, y `/users` con el candado (`@ApiBearerAuth()` en `apps/api/src/modules/users/presentation/users.controller.ts`).
- [x] T111 [P] Configurar el despliegue en el mismo sitio:
  - en `docker/nginx.conf`, añadir antes de `location /` un bloque `location /api/ { proxy_pass http://api:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }`. La CSP actual (`connect-src 'self'`) ya exige el mismo origen, así que no cambia;
  - cambiar en `docker/nginx.conf` `Referrer-Policy "strict-origin-when-cross-origin"` por `Referrer-Policy "no-referrer"` (research R4);
  - en `docker-compose.yml`, quitar la publicación del puerto `3000` del servicio `api`, para que el navegador solo use el de la web (`8080`), y fijar en `api` `TRUST_PROXY=true` y `APP_WEB_URL`;
  - documentar en `apps/web/.env.example` que `VITE_API_URL` debe ser relativa (`/api/v1`) o del mismo sitio.
- [x] T112 Ejecutar `pnpm typecheck && pnpm lint && pnpm test` y `pnpm --filter @ucanvas/api test:e2e` desde la raíz; corregir lo que falle.
- [ ] T113 Recorrer manualmente [quickstart.md](./quickstart.md) § 1–8 y anotar los resultados. Marcar en `specs/001-user-auth/checklists/requirements.md` cualquier desviación respecto a la spec.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T009 depende de T007 y T008.
- **Foundational (Phase 2)**: depende de Setup y **bloquea todas las historias**.
  - T011 depende de T010.
  - T026 depende de T010, T011 y T018.
  - T027 depende de T018–T026.
  - T029 y T030 dependen de T027.
  - T035–T038 dependen de T033 y T032.
  - T040 depende de T039.
- **US1 (Phase 3)** y **US2 (Phase 4)**: dependen solo de Foundational. Pueden ir en paralelo.
- **US3 (Phase 5)**: necesita `AuthProvider` y `LoginPage` de US2 (T069, T073).
- **US4 (Phase 6)**: depende de Foundational. Su prueba de "cierra sesiones" necesita sesiones, es decir, US2.
- **US5 (Phase 7)**: modifica `login.use-case.ts`, así que depende de US2.
- **US6 (Phase 8)**: necesita US2 (sesión autenticada y `sid`) y `LoginAttemptsService` de US5 (T093).
- **Polish (Phase 9)**: después de las historias deseadas.

### User Story Dependencies

```text
Foundational ──► US1 (P1) ─────────────────────────────┐
             └─► US2 (P1) ──► US3 (P2)                 ├─► Polish
                          ├─► US4 (P2)  (y US1 para el flujo web completo)
                          └─► US5 (P3) ──► US6 (P3) ───┘
```

### Within Each User Story

- Dominio y servicios antes que los casos de uso, los casos de uso antes que el controlador, el controlador antes que el e2e. En la web, el servicio y el hook antes que el formulario, el formulario antes que la página y la página antes que la ruta.
- `auth.controller.ts`, `auth.module.ts` y `AppRoutes.tsx` se modifican en varias historias: esas tareas **no** son [P] entre sí.

### Parallel Opportunities

- Setup: T002–T008 en paralelo, después de T001.
- Foundational: T012, T014–T017, T019–T023 y T025 en paralelo, una vez creados los puertos (T018); T032–T034, T037–T039 y T042 en paralelo con la API.
- Los tests unitarios marcados [P] de cada historia pueden escribirse a la vez.
- Con dos personas: una hace US1 y otra US2 tras Foundational. Después, US3 y US4 en paralelo, y US5 seguida de US6.

---

## Parallel Example: User Story 1

```bash
# Tests unitarios de US1 a la vez:
Task: "T043 register.use-case.spec.ts"
Task: "T044 verify-email.use-case.spec.ts"
Task: "T045 resend-verification.use-case.spec.ts"

# DTO y componentes web mientras se implementan los casos de uso:
Task: "T049 DTOs register/email-only/token/message-response"
Task: "T052 PasswordRulesHint + CheckEmailNotice"
```

## Parallel Example: User Story 2

```bash
Task: "T058 login.use-case.spec.ts"
Task: "T059 refresh-session.use-case.spec.ts"
Task: "T060 logout.use-case.spec.ts"
Task: "T066 DTOs login/auth-session/auth-user"
Task: "T075 AuthProvider.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T076 safeReturnTo.test.ts"
Task: "T077 ProtectedRoute.test.tsx"
Task: "T078 safeReturnTo.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

US1 sola permite crear y verificar cuentas, pero no entrar. El MVP útil es **US1 + US2** (las dos P1).

1. Phase 1 Setup y Phase 2 Foundational.
2. Phase 3 (US1): **validar** quickstart § 1.
3. Phase 4 (US2): **validar** quickstart § 2. **MVP listo**: registro, verificación, inicio de sesión y cierre de sesión.

### Incremental Delivery

4. US3: rutas privadas reales y retorno (quickstart § 3).
5. US4: recuperación (§ 4).
6. US5: bloqueo (§ 5).
7. US6: cambio de contraseña (§ 6).
8. Polish: enumeración, límites, secretos, documentación y seed (§ 7–8).

Cada paso deja la aplicación funcionando. Hacer commit al final de cada tarea o grupo lógico, con Conventional Commits (por ejemplo `feat(api): register and verify email use cases`, `feat(ui): add Input and FormField`, `test(api): lockout e2e`).

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Las restricciones de datos (longitudes, nulos, enums, plazos) están citadas en cada tarea a partir de [data-model.md](./data-model.md). Ante cualquier duda, manda ese documento.
- Los plazos (24 h, 60 min, 15 min, 2 h, 30 días, 60 s) se prueban **siempre** con `FakeClock`; nunca con esperas reales.
- No ampliar el alcance: OAuth, 2FA, cambio de correo, eliminación de cuenta y gestión selectiva de sesiones están fuera (spec § Assumptions).
