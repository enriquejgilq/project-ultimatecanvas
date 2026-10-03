# Data Model: Autenticación y protección de cuentas

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Date**: 2026-10-02

Persistencia en PostgreSQL. Todas las fechas se guardan en UTC. Los nombres de columna siguen la convención actual de `schema.prisma`: camelCase en el modelo y `@map` a snake_case.

## Diagrama

```text
users 1 ──── * sessions
users 1 ──── * email_tokens
users 1 ──── * security_events   (userId opcional)
email_dispatches                  (por dirección de correo, sin FK: también registra direcciones sin cuenta)
```

---

## 1. `users` (tabla existente, ampliada)

Entidad de dominio en el módulo auth: **`Account`**. El módulo `users` sigue usando su propia entidad `User`, que ignora los campos nuevos.

| Campo                 | Tipo                  | Reglas                                                                                                                            |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id                    | uuid PK               | existente                                                                                                                         |
| email                 | text, **unique**      | Se guarda **normalizado**: `trim()` + minúsculas (FR-002).                                                                        |
| name                  | text, **nullable**    | Antes obligatorio; el registro no lo pide.                                                                                        |
| passwordHash          | text, nullable        | Hash Argon2id (FR-008). Es `null` en cuentas creadas sin contraseña, por ejemplo con `POST /users`, que no pueden iniciar sesión. |
| emailVerifiedAt       | timestamptz, nullable | `null` = cuenta **pendiente**.                                                                                                    |
| failedLoginCount      | int, default 0        | Fallos consecutivos de inicio de sesión o de contraseña actual (FR-018, FR-036).                                                  |
| lockedUntil           | timestamptz, nullable | Bloqueada si `lockedUntil > now`.                                                                                                 |
| passwordChangedAt     | timestamptz, nullable | Auditoría y aviso por correo (FR-035).                                                                                            |
| createdAt / updatedAt | timestamptz           | existentes                                                                                                                        |

**Reglas de validación (dominio `Account`)**

- Contraseña (`PasswordPolicy`): de 10 a 128 caracteres, al menos una letra (`\p{L}`) y al menos un dígito (`\p{N}`), y no presente en la lista de contraseñas comunes (comparación en minúsculas). Cada regla incumplida produce un código: `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_NEEDS_LETTER`, `PASSWORD_NEEDS_NUMBER`, `PASSWORD_TOO_COMMON` (FR-009).
- Correo: formato válido según `z.string().email()` tras normalizar.

**Estados y transiciones**

```text
                 register(email nuevo)
  (no existe) ─────────────────────────► PENDIENTE
                                          │  ▲
       register(mismo email) ─────────────┘  │  sustituye passwordHash,
       (FR-032)                               │  invalida enlaces, envía uno nuevo
                                          │
                 verifyEmail(token válido)│
                                          ▼
                                       VERIFICADA ◄──────────────────────────┐
                                          │                                  │
        5 fallos consecutivos             │                                  │ lockedUntil vencido
        (login o contraseña actual)       ▼                                  │ o resetPassword()
                                    VERIFICADA + BLOQUEADA ──────────────────┘
                                    (lockedUntil = now + 15 min,
                                     failedLoginCount = 0,
                                     1 aviso por correo)
```

- **PENDIENTE**: no puede iniciar sesión (`403 EMAIL_NOT_VERIFIED` si la contraseña es correcta). No hay limpieza automática (supuesto de la spec).
- **BLOQUEADA**: es un estado ortogonal, se calcula con `lockedUntil > now` y no se guarda como enum. Los intentos durante el bloqueo no incrementan el contador.

**Métodos de dominio de `Account`** (TypeScript puro, sin dependencias de Nest ni de Prisma)

- `isVerified()`, `isLocked(now)`
- `verifyEmail(now)`
- `replacePendingPassword(hash)`: solo si la cuenta está PENDIENTE.
- `registerFailedAttempt(now)`: devuelve `{ lockedNow: boolean }`. La persistencia se hace con un incremento atómico en el repositorio (research R9).
- `resetFailedAttempts()`
- `changePassword(hash, now)`
- `unlock()`

---

## 2. `sessions` (nueva)

| Campo          | Tipo                                                           | Reglas                                                                                                       |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| id             | uuid PK                                                        | Va en el claim `sid` del token de acceso.                                                                    |
| userId         | uuid FK → users.id, `onDelete: Cascade`                        | índice                                                                                                       |
| tokenHash      | text, **unique**                                               | SHA-256 del token opaco de la cookie. El valor en claro nunca se guarda.                                     |
| rememberMe     | boolean                                                        |                                                                                                              |
| createdAt      | timestamptz                                                    |                                                                                                              |
| lastActivityAt | timestamptz                                                    | Se actualiza en `refresh` y, como mucho una vez por minuto, en peticiones autenticadas.                      |
| expiresAt      | timestamptz, nullable                                          | Con `rememberMe`: `createdAt + 30 días` (FR-012). Sin `rememberMe`: `null`, porque la limita la inactividad. |
| revokedAt      | timestamptz, nullable                                          |                                                                                                              |
| revokedReason  | enum `LOGOUT \| PASSWORD_RESET \| PASSWORD_CHANGED \| EXPIRED` |                                                                                                              |
| userAgent      | text, nullable                                                 | Para auditoría y avisos.                                                                                     |
| ip             | text, nullable                                                 |                                                                                                              |

**Una sesión está activa** si `revokedAt IS NULL` y además:

- con `rememberMe`: `now < expiresAt`;
- sin `rememberMe`: `now - lastActivityAt < 2 h` (FR-011, aclaración Q3).

**Operaciones**

- `revokeAllForUser(userId, reason)`: en la recuperación de contraseña (FR-016).
- `revokeAllForUserExcept(userId, keepSessionId, reason)`: en el cambio de contraseña (FR-034).
- `revoke(sessionId, LOGOUT)`: en el cierre de sesión (FR-013).

Índices: `(userId)` y `(userId, revokedAt)`.

---

## 3. `email_tokens` (nueva)

| Campo         | Tipo                                        | Reglas                                                                                              |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| id            | uuid PK                                     |                                                                                                     |
| userId        | uuid FK → users.id, `onDelete: Cascade`     |                                                                                                     |
| type          | enum `EMAIL_VERIFICATION \| PASSWORD_RESET` |                                                                                                     |
| tokenHash     | text, **unique**                            | SHA-256 del token de 32 bytes.                                                                      |
| expiresAt     | timestamptz                                 | `EMAIL_VERIFICATION`: `createdAt + 24 h` (FR-003). `PASSWORD_RESET`: `createdAt + 60 min` (FR-014). |
| usedAt        | timestamptz, nullable                       | Uso único.                                                                                          |
| invalidatedAt | timestamptz, nullable                       | Se rellena al emitir otro token del mismo tipo (FR-005, FR-015, FR-032).                            |
| createdAt     | timestamptz                                 |                                                                                                     |

**Un token es válido** si `usedAt IS NULL`, `invalidatedAt IS NULL` y `now < expiresAt`. Se consume con un `UPDATE` condicional atómico (research R4).

**Ciclo de vida**: `VIGENTE → USADO | CADUCADO | INVALIDADO`, todos finales.

Índice: `(userId, type)`.

**Nota sobre FR-009 / US4-5**: si la contraseña nueva de una recuperación no cumple la política, el token **no** se consume (la validación va antes del `UPDATE`).

---

## 4. `email_dispatches` (nueva)

Registro de envíos para aplicar el límite de FR-030 y FR-031.

| Campo     | Tipo                                                                                                     | Reglas      |
| --------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| id        | uuid PK                                                                                                  |             |
| email     | text                                                                                                     | normalizado |
| kind      | enum `EMAIL_VERIFICATION \| PASSWORD_RESET \| REGISTRATION_ATTEMPT \| LOCKOUT_ALERT \| PASSWORD_CHANGED` |             |
| createdAt | timestamptz                                                                                              |             |

**Regla de límite**, solo para `EMAIL_VERIFICATION`, `PASSWORD_RESET` y `REGISTRATION_ATTEMPT`: se permite enviar si en la última hora hay menos de 3 envíos de ese `kind` para ese `email` **y** ninguno en los últimos 60 s. Si no se cumple, se omite el envío en silencio.

Índice: `(email, kind, createdAt DESC)`. Las filas de más de 24 h se pueden purgar (tarea de mantenimiento aplazada).

---

## 5. `security_events` (nueva)

| Campo     | Tipo                                                                                                                                                                                                                                                                                                                 | Reglas                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| id        | uuid PK                                                                                                                                                                                                                                                                                                              |                                                                                                                                       |
| type      | enum `REGISTERED \| REGISTRATION_REPLACED \| REGISTRATION_ATTEMPT_EXISTING \| EMAIL_VERIFIED \| LOGIN_SUCCEEDED \| LOGIN_FAILED \| LOGIN_BLOCKED_UNVERIFIED \| ACCOUNT_LOCKED \| PASSWORD_RESET_REQUESTED \| PASSWORD_RESET_COMPLETED \| PASSWORD_CHANGED \| PASSWORD_CHANGE_FAILED \| LOGOUT \| EMAIL_RATE_LIMITED` |                                                                                                                                       |
| userId    | uuid, nullable, FK → users.id, `onDelete: SetNull`                                                                                                                                                                                                                                                                   | `null` si el correo no corresponde a ninguna cuenta.                                                                                  |
| email     | text, nullable                                                                                                                                                                                                                                                                                                       | normalizado                                                                                                                           |
| ip        | text, nullable                                                                                                                                                                                                                                                                                                       |                                                                                                                                       |
| userAgent | text, nullable                                                                                                                                                                                                                                                                                                       |                                                                                                                                       |
| metadata  | jsonb, nullable                                                                                                                                                                                                                                                                                                      | Por ejemplo `{ reason: 'WRONG_PASSWORD' \| 'LOCKED' \| 'UNKNOWN_EMAIL' }`. **Nunca** contraseñas, tokens ni enlaces (FR-029, SC-009). |
| createdAt | timestamptz                                                                                                                                                                                                                                                                                                          |                                                                                                                                       |

Índices: `(userId, createdAt DESC)` y `(type, createdAt DESC)`.

---

## Contratos compartidos (`packages/shared`)

Schemas zod nuevos en `packages/shared/src/schemas/auth.schema.ts`. Los DTO de la API los implementan con `implements`, sin duplicar la forma de los datos.

| Schema                 | Forma                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `passwordSchema`       | string de 10 a 128 caracteres, con al menos una letra y un número (sin la lista de comunes, que es solo del servidor) |
| `registerSchema`       | `{ email, password }`                                                                                                 |
| `loginSchema`          | `{ email, password, rememberMe: boolean }`                                                                            |
| `emailOnlySchema`      | `{ email }`: para reenviar verificación y pedir recuperación                                                          |
| `tokenSchema`          | `{ token: string (43 caracteres base64url) }`                                                                         |
| `resetPasswordSchema`  | `{ token, newPassword }`                                                                                              |
| `changePasswordSchema` | `{ currentPassword, newPassword }`                                                                                    |
| `authSessionSchema`    | `{ accessToken, expiresIn (segundos), user: AuthUser }`                                                               |
| `authUserSchema`       | `{ id, email, name: string \| null, emailVerified: true }`                                                            |

Constantes en `packages/shared/src/constants/auth.ts`:

- `PASSWORD_MIN_LENGTH = 10`, `PASSWORD_MAX_LENGTH = 128`
- `AUTH_ERROR_CODES`
- `AUTH_MESSAGES`: textos en español idénticos para el cliente y la API, por ejemplo `INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.'` y `CHECK_YOUR_EMAIL: 'Si los datos son correctos, recibirás un correo en unos minutos.'`.

`userSchema.name` cambia a `z.string().min(1).max(120).nullable()`.
