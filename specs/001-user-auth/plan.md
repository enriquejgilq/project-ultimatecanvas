# Implementation Plan: Autenticación y protección de cuentas

**Branch**: `001-user-auth` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-user-auth/spec.md`

## Summary

La plataforma pasa a identificar a cada usuario con correo y contraseña. Incluye registro con verificación por correo, sesión de corta duración que se renueva sola, la opción "mantener sesión iniciada" durante 30 días, recuperación y cambio de contraseña, bloqueo por intentos fallidos, protección contra la enumeración de cuentas y el retorno a la página privada que se quería ver.

**Enfoque técnico** (detalle en [research.md](./research.md)):

- **API**: nuevo módulo hexagonal `modules/auth` en NestJS sobre PostgreSQL/Prisma.
  - Contraseñas con Argon2id.
  - Token de acceso JWT de 15 minutos, guardado solo en memoria en el cliente, junto con una sesión opaca revocable en una cookie `HttpOnly` y `SameSite=Strict`. La API comprueba la sesión (`sid`) en cada petición, de modo que revocar es inmediato.
  - Enlaces de un solo uso guardados como hash.
  - Correos asíncronos con límite de envíos guardado en base de datos.
  - Contraseñas comunes comprobadas contra una lista de 100 000 entradas en memoria.
- **Web**: `features/auth` con `AuthProvider`, `ProtectedRoute` real con `returnTo` validado, y páginas de login, registro, verificación, recuperación y seguridad de la cuenta. Las piezas visuales nuevas (Input, Checkbox, FormField, PasswordField, Alert y AuthLayout) van en `packages/ui`.
- **Contratos compartidos**: schemas zod y mensajes en español en `packages/shared`.

## Technical Context

**Language/Version**: TypeScript 5.6 sobre Node.js 20 o superior. La web usa React 18.3.

**Primary Dependencies**:

- API, existentes: NestJS 10, `@nestjs/jwt`, `@nestjs/passport` + `passport-jwt`, `@nestjs/throttler`, `@nestjs/swagger`, Prisma 6, class-validator, helmet, joi.
- API, nuevas: `argon2`, `nodemailer` (+ `@types/nodemailer`) y `cookie-parser` (+ tipos).
- API, se elimina: `bcrypt` (research R1).
- Web: React Router 6, TanStack Query 5. Nuevas en desarrollo: `vitest`, `@testing-library/react`, `jsdom`.
- Shared: zod.

**Storage**: PostgreSQL mediante Prisma. Se amplía la tabla `users` y se crean `sessions`, `email_tokens`, `email_dispatches` y `security_events` ([data-model.md](./data-model.md)).

**Testing**:

- API: Jest (unitarias por caso de uso con dobles en memoria y reloj inyectable) y Jest + supertest (e2e contra una base de datos PostgreSQL de test).
- Web: Vitest + Testing Library (nuevo).

**Target Platform**:

- API Node en contenedor Linux (`docker/api.Dockerfile`).
- Web SPA servida de forma estática; navegadores modernos (las dos últimas versiones de cada uno).
- En desarrollo, el proxy de Vite sirve `/api` en el mismo origen, así que la cookie `SameSite=Strict` funciona sin configurar CORS.

**Project Type**: aplicación web en un monorepo (`apps/api`, `apps/web`, `packages/ui`, `packages/shared`).

**Performance Goals**:

- `login`, `register`, `reset-password` y `change-password`: p95 por debajo de 500 ms (dominado por Argon2, unos 50–100 ms).
- `refresh` y `me`: p95 por debajo de 100 ms.
- Comprobación de sesión por petición: una consulta por clave primaria.

**Constraints**:

- Ningún secreto en el cliente (solo `VITE_*`).
- Sin colores fijos: solo tokens.
- Mensajes y tiempos de respuesta que no revelan si un correo existe (SC-007).
- Revocación efectiva en menos de 1 minuto (SC-005, SC-011).
- Ningún valor en claro de contraseñas o tokens en la base de datos, en los logs (salvo `ConsoleMailer` en desarrollo) ni en los correos (los enlaces son la excepción esperada).
- **Despliegue en el mismo sitio**: en producción, la web y la API se sirven bajo el mismo sitio, idealmente el mismo origen, con un proxy inverso que expone `/api` desde el dominio de la web. Sin esto, la cookie `SameSite=Strict` no se envía y la sesión no se puede renovar. `VITE_API_URL` debe ser relativa (`/api/v1`) o del mismo sitio.

**Scale/Scope**: escala inicial modesta: hasta unos 10 000 usuarios y unos 100 inicios de sesión concurrentes por instancia. 9 endpoints nuevos, 6 páginas web nuevas y 6 componentes de UI nuevos.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

`.specify/memory/constitution.md` sigue siendo la **plantilla sin rellenar**, así que no aporta puertas formales. Como sustituto se evalúan las reglas no negociables de `CLAUDE.md` y las del README de `apps/api`:

| #   | Regla                                                                                                                                                                             | Pre-diseño | Post-diseño | Cómo se cumple                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Todo componente visual reutilizable vive en `packages/ui`                                                                                                                         | ✅         | ✅          | `Input`, `Checkbox`, `FormField`, `PasswordField`, `Alert` y `AuthLayout` van en `packages/ui`. Los formularios de `features/auth/components` solo componen esas piezas.                                                        |
| 2   | `apps/web` solo contiene `features/`, `pages/`, `hooks/`, `lib/`, `utils/` y `routes/`                                                                                            | ✅         | ✅          | Ver la estructura más abajo. `safeReturnTo` va en `utils/` y `authToken` en `lib/`.                                                                                                                                             |
| 3   | `packages/ui` no importa nada de `apps/*` ni hace peticiones                                                                                                                      | ✅         | ✅          | Los componentes nuevos son de presentación.                                                                                                                                                                                     |
| 4   | Cero colores fijos                                                                                                                                                                | ✅         | ✅          | Solo variables de `tokens.css` y `glass-tokens.css`. Si faltan tokens semánticos (por ejemplo `--color-danger`), se añaden a `tokens.css`.                                                                                      |
| 5   | Los tipos compartidos viven en `packages/shared` y no se duplican                                                                                                                 | ✅         | ✅          | `auth.schema.ts` y `constants/auth.ts`. Los DTO de la API los implementan con `implements`.                                                                                                                                     |
| 6   | Nada de secretos en el front                                                                                                                                                      | ✅         | ✅          | El cliente no tiene ninguna variable nueva. El token de acceso vive en memoria y la sesión en una cookie `HttpOnly`.                                                                                                            |
| 7   | Conventional Commits                                                                                                                                                              | ✅         | ✅          | Aplica en la fase de implementación.                                                                                                                                                                                            |
| 8   | Hexagonal (README de la API): el dominio sin Nest ni ORM, los casos de uso lanzan errores de dominio (`AuthDomainError` en este módulo), puertos solo donde el cambio es realista | ✅         | ✅          | Puertos: repositorios, `PasswordHasherPort`, `MailerPort`, `CommonPasswordCheckerPort`, `ClockPort`, `TokenGeneratorPort` y `SecurityEventsPort`. Cada uno tiene un doble en memoria para los tests o más de un adaptador real. |
| 9   | Un módulo no importa las tripas de otro                                                                                                                                           | ✅         | ✅          | `auth` tiene su propio `Account` y su propio repositorio sobre la tabla `users`, y no importa nada de `modules/users` (research R12).                                                                                           |

**Resultado**: PASS, sin violaciones que justificar. **Recomendación**: rellenar la constitución con `/speckit-constitution`, partiendo de estas reglas, para que las próximas funcionalidades tengan puertas formales.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones R1–R15
├── data-model.md        # Fase 1: tablas, estados y schemas compartidos
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   ├── auth-api.md      # Fase 1: endpoints /api/v1/auth
│   └── web-routes.md    # Fase 1: rutas, ProtectedRoute y sesión en el cliente
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
packages/shared/src/
├── schemas/
│   ├── auth.schema.ts                 # NUEVO: register, login, emailOnly, token, reset, change, authSession, authUser, passwordSchema
│   └── user.schema.ts                 # MOD: name nullable
├── constants/
│   ├── auth.ts                        # NUEVO: límites de contraseña, AUTH_ERROR_CODES, AUTH_MESSAGES (es)
│   └── index.ts                       # MOD: re-export
└── index.ts                           # MOD: export auth

packages/ui/src/
├── atoms/
│   ├── Input/                         # NUEVO (+ stories)
│   └── Checkbox/                      # NUEVO (+ stories)
├── molecules/
│   ├── FormField/                     # NUEVO: etiqueta, campo, ayuda y error, con aria-describedby
│   ├── PasswordField/                 # NUEVO: mostrar u ocultar la contraseña
│   └── Alert/                         # NUEVO: info, success, warning, danger
├── templates/
│   ├── AuthLayout/                    # NUEVO: tarjeta centrada para las pantallas de acceso
│   └── index.ts                       # NUEVO
├── styles/tokens.css                  # MOD si faltan tokens semánticos (danger, success…)
└── index.ts                           # MOD: export templates

apps/api/
├── prisma/
│   ├── schema.prisma                  # MOD: User ampliado + Session, EmailToken, EmailDispatch, SecurityEvent
│   ├── migrations/<ts>_auth/          # NUEVO
│   └── seed.ts                        # MOD: usuarios demo verificados con contraseña de desarrollo
├── src/
│   ├── main.ts                        # MOD: cookie-parser, trust proxy, Swagger con cookie auth
│   ├── app.module.ts                  # MOD: AuthModule y JwtAuthGuard como APP_GUARD
│   ├── config/
│   │   ├── env.validation.ts          # MOD: APP_WEB_URL, MAIL_*, SMTP_URL, TRUST_PROXY; quita JWT_REFRESH_*;
│   │   │                              #      MAIL_TRANSPORT=console prohibido en producción
│   │   └── configuration.ts           # MOD
│   ├── common/
│   │   ├── strategies/jwt.strategy.ts # ELIMINAR: se mueve a modules/auth/infrastructure/jwt.strategy.ts
│   │   └── guards/jwt-auth.guard.ts   # MOD: quita el comentario de placeholder
│   ├── modules/health/health.controller.ts   # MOD: @Public()
│   └── modules/auth/                  # NUEVO
│       ├── auth.module.ts
│       ├── domain/
│       │   ├── account.entity.ts      # (+ .spec.ts) estados, bloqueo, verificación
│       │   ├── password-policy.ts     # (+ .spec.ts) reglas → códigos
│       │   ├── session.entity.ts      # (+ .spec.ts) isActive(now): inactividad de 2 h o 30 días
│       │   ├── email-token.entity.ts
│       │   └── auth.errors.ts         # InvalidCredentials, EmailNotVerified, InvalidLink, PasswordPolicyViolation,
│       │                              # InvalidCurrentPassword, AccountLocked, SessionExpired
│       ├── application/
│       │   ├── ports/                 # accounts, sessions, email-tokens, email-dispatches, security-events,
│       │   │                          # password-hasher, common-password-checker, mailer, clock, token-generator
│       │   ├── services/
│       │   │   ├── email-rate-limiter.ts       # FR-030/031 (+ .spec.ts)
│       │   │   └── login-attempts.service.ts   # contador y bloqueo compartidos por login y cambio de contraseña (+ .spec.ts)
│       │   └── use-cases/             # uno por operación, cada uno con su .spec.ts
│       │       ├── register.use-case.ts
│       │       ├── verify-email.use-case.ts
│       │       ├── resend-verification.use-case.ts
│       │       ├── login.use-case.ts
│       │       ├── refresh-session.use-case.ts
│       │       ├── logout.use-case.ts
│       │       ├── request-password-reset.use-case.ts
│       │       ├── reset-password.use-case.ts
│       │       ├── change-password.use-case.ts
│       │       └── get-current-account.use-case.ts
│       ├── infrastructure/
│       │   ├── persistence/           # prisma-*.repository.ts + in-memory-*.repository.ts
│       │   ├── crypto/                # argon2-password-hasher.ts, random-token-generator.ts (sha256)
│       │   ├── passwords/             # file-common-password-checker.ts + common-passwords.txt
│       │   ├── mail/                  # console-mailer.ts, smtp-mailer.ts, mail-dispatcher.ts (cola + reintentos), templates/
│       │   ├── clock/system-clock.ts
│       │   └── jwt.strategy.ts        # valida la sesión sid y marca actividad
│       └── presentation/
│           ├── auth.controller.ts     # @ApiTags('auth'), @Throttle en endpoints anónimos
│           ├── session-cookie.ts      # set y clear de ucanvas_session
│           └── dto/                   # implements de los tipos de @ucanvas/shared
└── test/
    ├── auth.e2e-spec.ts               # NUEVO: flujos completos y enumeración (SC-007)
    └── support/                       # NUEVO: base de datos de test y mailer capturador

apps/web/src/
├── features/auth/
│   ├── components/                    # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm,
│   │                                  # ChangePasswordForm, CheckEmailNotice (componen @ucanvas/ui)
│   ├── context/AuthProvider.tsx       # status, user, acciones, BroadcastChannel
│   ├── hooks/                         # useAuth, useLogin, useRegister, useSessionKeepAlive…
│   ├── services/auth.service.ts
│   └── index.ts
├── pages/
│   ├── LoginPage.tsx  RegisterPage.tsx  VerifyEmailPage.tsx
│   ├── ForgotPasswordPage.tsx  ResetPasswordPage.tsx  AccountSecurityPage.tsx
├── routes/
│   ├── AppRoutes.tsx                  # MOD: rutas nuevas
│   └── ProtectedRoute.tsx             # MOD: implementación real (contracts/web-routes.md)
├── lib/
│   ├── apiClient.ts                   # MOD: token en memoria, credentials, refresh único ante 401
│   ├── authToken.ts                   # NUEVO: almacén del token en memoria
│   └── router.ts                      # MOD: ROUTES nuevas
├── utils/safeReturnTo.ts              # NUEVO (+ .test.ts)
└── main.tsx / App.tsx                 # MOD: envolver con AuthProvider
```

**Structure Decision**: monorepo existente. La lógica de servidor va en un nuevo módulo `apps/api/src/modules/auth`, que sigue el módulo de referencia `users`. La web añade la feature `auth` respetando las carpetas permitidas por CLAUDE.md. Los componentes visuales nuevos van en `packages/ui` y los contratos en `packages/shared`.

## Fases e hitos (orientativo para `/speckit-tasks`)

1. **Base**: schemas y constantes en shared, migración de Prisma, variables de entorno, puertos y adaptadores comunes (hasher, generador de tokens, reloj, mailer y dispatcher), guard global y `@Public()`.
2. **US1 + US2 (MVP P1)**: registro, verificación, reenvío, login, refresh, logout y `me`. En la web: `AuthProvider`, `apiClient`, login, registro, verificación y componentes de UI.
3. **US3 (P2)**: `ProtectedRoute` real y `safeReturnTo`.
4. **US4 (P2)**: recuperación de contraseña, extremo a extremo.
5. **US5 (P3)**: bloqueo y aviso (`LoginAttemptsService`).
6. **US6 (P3)**: cambio de contraseña y página de seguridad.
7. **Transversal**: límite de correos, eventos de seguridad, test de enumeración, Swagger, `.env.example`, README de la API y seed.

## Riesgos y aplazados

| Tema                                                | Decisión actual                                               | Riesgo / siguiente paso                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cola de correos en proceso                          | Reintentos en memoria (R7)                                    | Un correo se pierde si la API se reinicia durante el envío. Siguiente paso: tabla outbox con worker.                                              |
| Retención de `security_events` y `email_dispatches` | Sin purga automática                                          | Definir retención (sugerido: 12 meses y 24 h) y una tarea programada.                                                                             |
| Rotación del refresh token                          | No se rota (R2)                                               | Reevaluar si cambia el modelo de amenazas.                                                                                                        |
| Bloqueo por cuenta (Q1)                             | Permite bloquear a otro usuario a propósito (DoS dirigido)    | Mitigado con el límite de 10 peticiones por minuto por IP y con la recuperación, que levanta el bloqueo. Vigilar `ACCOUNT_LOCKED` en los eventos. |
| Web y API en sitios distintos                       | No soportado (cookie `SameSite=Strict`)                       | Si algún día hace falta, cambiar a `SameSite=None; Secure` con CORS estricto y token CSRF.                                                        |
| Navegadores que restauran sesiones                  | La cookie de sesión puede sobrevivir al "cerrar el navegador" | La inactividad de 2 h comprobada en el servidor la limita.                                                                                        |
| `POST /users` crea cuentas sin contraseña           | Esas cuentas no pueden iniciar sesión                         | Queda protegido por el guard. Revisar este endpoint cuando existan roles.                                                                         |

## Complexity Tracking

Sin violaciones de las reglas del proyecto; no aplica.
