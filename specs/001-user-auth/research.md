# Research: Autenticación y protección de cuentas

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-02

Cada decisión resuelve una incógnita del Technical Context o una práctica necesaria para cumplir un requisito de la spec.

---

## R1. Hash de contraseñas

- **Decision**: Argon2id con el paquete `argon2` y los parámetros mínimos de OWASP (`memoryCost: 19456` KiB, `timeCost: 2`, `parallelism: 1`). Se encapsula tras un puerto `PasswordHasherPort` con `hash()` y `verify()`. Se elimina la dependencia `bcrypt`, hoy sin usar.
- **Rationale**: FR-006 permite contraseñas de hasta 128 caracteres y bcrypt trunca en silencio a partir de 72 bytes, así que dos contraseñas con el mismo prefijo valdrían igual. Argon2id es la recomendación actual de OWASP, incluye sal por hash (FR-008) y su coste ronda los 50–100 ms, lo bastante para frenar ataques sin degradar el inicio de sesión.
- **Alternatives considered**: bcrypt (ya instalado; descartado por el límite de 72 bytes). Prehash SHA-256 + bcrypt (añade complejidad y el riesgo conocido de bytes nulos). scrypt nativo de Node (válido, pero menos estándar en las guías actuales).

## R2. Modelo de sesión: token de acceso + sesión revocable

- **Decision**:
  - **Token de acceso**: JWT firmado con `JWT_SECRET`, válido 15 minutos (`JWT_EXPIRES_IN`). Lleva `sub` (userId) y `sid` (id de sesión). El cliente lo guarda **solo en memoria** y lo envía como `Authorization: Bearer`.
  - **Token de sesión (refresh)**: valor aleatorio opaco de 256 bits en una cookie `ucanvas_session` con `HttpOnly`, `Secure` (en producción), `SameSite=Strict` y `Path=/api/v1/auth`. En la base de datos solo se guarda su SHA-256.
    - Sin "mantener sesión iniciada": cookie de sesión, sin `Max-Age`, que el navegador borra al cerrarse.
    - Con "mantener sesión iniciada": cookie persistente con `Max-Age` = tiempo restante hasta `expiresAt` (30 días desde el inicio de sesión).
  - **Renovación**: `POST /auth/refresh` valida la cookie y la sesión. Comprueba que no esté revocada, que no haya caducado (`expiresAt`) y, si no es "mantener sesión", que `lastActivityAt` sea de hace menos de 2 horas. Entonces actualiza `lastActivityAt` y emite un nuevo token de acceso.
  - **Revocación inmediata**: `JwtStrategy.validate` comprueba en cada petición que la sesión `sid` sigue activa, con una consulta por clave primaria. También actualiza `lastActivityAt` como mucho una vez por minuto para no escribir en cada petición.
- **Rationale**:
  - SC-005 y SC-011 exigen que una sesión revocada deje de dar acceso en menos de 1 minuto. Un JWT sin estado seguiría siendo válido hasta 15 minutos más, de ahí la comprobación de `sid`.
  - Guardar el token de acceso en memoria y no en `localStorage`, donde lo deja hoy `apiClient`, evita que un XSS pueda leerlo.
  - `SameSite=Strict` junto con el `Path` restringido protegen el refresh de CSRF.
  - La cookie de sesión del navegador implementa "al cerrar el navegador" (FR-011), y los 2 h de inactividad que se comprueban en el servidor cubren el caso de navegadores que restauran sesiones.
- **Alternatives considered**:
  - **Rotar el refresh token en cada uso**: descartado por ahora. Con varias pestañas renovando a la vez provoca carreras y falsos positivos de reutilización. Como el token es revocable en el servidor, va en una cookie `HttpOnly` y está ligado a una sesión con inactividad limitada, el beneficio adicional es pequeño. Se puede añadir más adelante sin cambiar el contrato.
  - **Solo cookie de sesión del servidor, sin JWT**: válido, pero el proyecto ya incluye passport-jwt y Swagger con `addBearerAuth`. Se mantiene el modelo Bearer para la API.
  - **JWT de refresh con `JWT_REFRESH_SECRET`**: descartado porque un JWT no se puede revocar sin consultar la base de datos de todos modos. Las variables `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` se retiran.

## R3. Qué cuenta como "actividad" del usuario

- **Decision**: el cliente renueva el token de acceso de forma proactiva unos 60 s antes de que caduque, **solo si** el usuario interactuó con la página (puntero, teclado o foco) en los últimos 15 minutos. Además, cualquier petición autenticada cuenta como actividad en el servidor (R2).
- **Rationale**: el usuario puede estar dibujando en el lienzo sin hacer peticiones y no debe perder la sesión (SC-004). Una pestaña abandonada, en cambio, no debe mantener la sesión viva indefinidamente.
- **Alternatives considered**: renovar siempre en segundo plano (haría inútil el límite de inactividad). Renovar solo ante una respuesta 401 (la pestaña inactiva no renueva, pero el usuario que solo dibuja perdería la sesión).

## R4. Enlaces de verificación y recuperación

- **Decision**: token aleatorio de 32 bytes codificado en base64url. Se guarda solo su SHA-256 en `email_tokens`, junto con `type`, `expiresAt`, `usedAt` e `invalidatedAt`. Emitir un token nuevo marca como `invalidatedAt` los vigentes del mismo tipo y usuario (FR-005, FR-015). Para consumirlo, una única sentencia `UPDATE … WHERE usedAt IS NULL AND invalidatedAt IS NULL AND expiresAt > now()` garantiza el uso único incluso con peticiones concurrentes.
  - Los enlaces apuntan a la **web** (`{APP_WEB_URL}/verify-email?token=…` y `/reset-password?token=…`). La página envía el token a la API con `POST`.
- **Rationale**:
  - Un hash basta porque el token tiene 256 bits de entropía; no hace falta una función lenta.
  - Consumir con `POST` y no con un `GET` directo a la API evita que los escáneres de enlaces de los proveedores de correo, que abren las URLs, gasten el enlace de un solo uso.
  - Las páginas `/verify-email` y `/reset-password` las sirve nginx (`docker/nginx.conf`), no la API, así que la cabecera de `helmet` no les aplica. Se endurece `Referrer-Policy` en nginx a `no-referrer`, para que el token de la URL nunca salga en la cabecera `Referer`, ni siquiera hacia el propio origen. En desarrollo, Vite no envía esa cabecera; el valor por defecto de los navegadores (`strict-origin-when-cross-origin`) ya impide que el token llegue a otros dominios.
- **Alternatives considered**: JWT firmados como enlace (no se pueden invalidar ni ser de un solo uso sin estado). Códigos de 6 dígitos (requerirían su propio límite contra fuerza bruta).

## R5. Contraseñas comunes

- **Decision**: la API incluye la lista pública de las 100 000 contraseñas filtradas más comunes (`common-passwords.txt`, derivada de SecLists o NCSC). Se carga en memoria como un `Set` en minúsculas al arrancar. La comprobación es solo del servidor y se expone tras un `CommonPasswordCheckerPort`. El cliente valida solo longitud, letras y números (schema compartido) para dar respuesta inmediata.
- **Rationale**: FR-007 pide al menos 10 000 entradas y no depender de servicios externos en tiempo real. 100 000 entradas ocupan unos 1 MB en disco y unos 5 MB en memoria, aceptable. Enviar la lista al navegador inflaría el bundle.
- **Alternatives considered**: la API k-anonymity de HIBP (es un servicio externo en tiempo real, contra los supuestos de la spec). zxcvbn (mide fuerza, no "lista de comunes", y pesa mucho en el cliente).

## R6. No revelar si un correo está registrado (FR-022 a FR-025, SC-007)

- **Decision**:
  - **Inicio de sesión con un correo inexistente**: se ejecuta `argon2.verify` contra un hash ficticio precalculado al arrancar, para igualar el tiempo. La respuesta es siempre `401` con el mismo mensaje genérico, también si la cuenta está bloqueada.
  - **Registro, reenvío de verificación y recuperación**: siempre responden `202` con el mismo mensaje. El trabajo costoso que depende de si la cuenta existe (hash de la contraseña en el registro) se hace en ambas ramas, y **el envío de correos es asíncrono** (R7), así que la latencia de la respuesta no depende del SMTP.
  - **Cuenta no verificada con contraseña correcta**: devuelve `403 EMAIL_NOT_VERIFIED`. Solo lo ve quien conoce la contraseña, así que no permite enumerar cuentas.
  - **Errores de dominio**: los de autenticación llevan un `code` estable, por ejemplo `INVALID_CREDENTIALS`, y mensajes en español definidos en `@ucanvas/shared`.
- **Rationale**: es la forma estándar de evitar la enumeración tanto por el contenido de la respuesta como por el tiempo que tarda.
- **Alternatives considered**: añadir un retardo aleatorio fijo (no iguala de verdad las distribuciones y empeora la experiencia).

## R7. Envío de correos

- **Decision**: puerto `MailerPort` con dos adaptadores:
  - `ConsoleMailer`: escribe asunto y enlace en el log; se usa por defecto en desarrollo y en tests.
  - `SmtpMailer`: usa `nodemailer`; se usa en producción y opcionalmente en local con Mailpit.
  - Se selecciona con `MAIL_TRANSPORT=console|smtp`. Los envíos pasan por una cola en proceso (`MailDispatcher`) que responde de inmediato y reintenta 3 veces con espera exponencial (1 s, 5 s, 25 s), registrando los fallos.
  - Plantillas en español, en texto plano y HTML sencillo, dentro de `infrastructure/mail/templates`.
- **Rationale**: desacopla la latencia (R6), permite probar sin SMTP real y cumple SC-002 en condiciones normales.
- **Alternatives considered**: tabla outbox con worker (envío duradero ante reinicios; queda **aplazado** y registrado como riesgo). BullMQ con Redis (añade infraestructura que el proyecto aún no tiene).

## R8. Límite de envíos de correo (FR-030, FR-031)

- **Decision**: tabla `email_dispatches` (`email` normalizado, `kind`, `createdAt`) consultada antes de cada envío de `EMAIL_VERIFICATION`, `PASSWORD_RESET` y `REGISTRATION_ATTEMPT`. Si ya hay 3 envíos del mismo tipo en la última hora, o uno en los últimos 60 s, no se envía y la respuesta HTTP es idéntica. Los avisos de bloqueo y de cambio de contraseña no se limitan, porque los dispara el propio sistema una vez por evento.
- **Rationale**: debe persistir entre reinicios y funcionar con varias instancias. El aviso "alguien intentó registrarse con tu correo" (FR-025) también se limita, porque si no sería un vector para inundar el buzón de alguien.
- **Alternatives considered**: `@nestjs/throttler` por correo (vive en memoria por instancia y responde 429, lo que revelaría el límite).

## R9. Bloqueo de cuenta (FR-018 a FR-021, FR-036)

- **Decision**: columnas `failedLoginCount` y `lockedUntil` en `users`. En cada fallo, una sentencia atómica `UPDATE … SET failedLoginCount = failedLoginCount + 1 … RETURNING` evita perder incrementos con intentos concurrentes. Al llegar a 5 se fija `lockedUntil = now + 15 min`, se pone el contador a 0 y se encola **un** aviso por correo.
  - Mientras la cuenta está bloqueada, los intentos se rechazan sin contar.
  - Un inicio de sesión correcto pone el contador a 0.
  - Completar la recuperación de contraseña pone `lockedUntil = null` (FR-017).
  - Una contraseña actual errónea en el cambio de contraseña usa el mismo contador.
- **Rationale**: es lo más simple que cumple la spec y la aclaración Q1 (bloqueo por cuenta).
- **Alternatives considered**: guardar los contadores en memoria o Redis (no persisten y no comparten estado entre instancias).

## R10. Límite de peticiones por IP

- **Decision**: además del límite global actual de 100 peticiones por minuto, `@Throttle` más estricto en los endpoints de autenticación anónimos: 10 por minuto por IP en `login`, `register`, `forgot-password`, `resend-verification`, `reset-password` y `verify-email`. En producción, Express necesita `trust proxy` configurado (`TRUST_PROXY`) para que la IP real sea correcta detrás de un balanceador.
- **Rationale**: complementa el bloqueo por cuenta frente a ataques que reparten intentos entre muchos correos (password spraying) y frente al abuso del registro.
- **Alternatives considered**: CAPTCHA (fuera de alcance; posible mejora futura).

## R11. Página de retorno tras iniciar sesión (FR-026 a FR-028)

- **Decision**: `ProtectedRoute` redirige a `/login?returnTo=<ruta+query codificada>`. Tras iniciar sesión, `safeReturnTo()` (en `apps/web/src/utils`) acepta solo valores que empiezan por `/`, no empiezan por `//` ni `/\` y no contienen esquema. Si no cumple, usa `/`. El estado de navegación de React Router se usa como complemento, pero la query permite que el destino sobreviva a una recarga de la página.
- **Rationale**: evita redirecciones a sitios externos (FR-028) y conserva los parámetros (US3, escenario 2).
- **Alternatives considered**: solo `location.state` (se pierde al recargar o al abrir el login en una pestaña nueva).

## R12. Encaje con el módulo `users` existente

- **Decision**:
  - Nuevo módulo hexagonal `modules/auth` con su propia entidad de dominio `Account` (credenciales, verificación y bloqueo) sobre la **misma tabla `users`**, mediante su propio repositorio Prisma. El módulo `users` no cambia de comportamiento.
  - `name` pasa a ser opcional (nullable), porque el registro solo pide correo y contraseña. El schema compartido `userSchema` refleja `name: string | null`.
  - `JwtAuthGuard` pasa a ser un `APP_GUARD` global. `health` y los endpoints anónimos de `auth` se marcan con `@Public()`, y los de `users` quedan protegidos.
  - El seed de desarrollo da a los 3 usuarios de ejemplo una contraseña de desarrollo válida y los marca como verificados. Esto resuelve el supuesto de la spec sobre usuarios existentes.
- **Rationale**: respeta la regla del README de la API (los módulos no importan las tripas de otros) y evita una tabla 1:1 innecesaria.
- **Alternatives considered**: tabla `credentials` separada 1:1 (más joins sin beneficio claro). Ampliar la entidad `User` del módulo `users` (mezclaría el perfil con la seguridad y obligaría a cambiar todos sus tests).

## R13. Registro de eventos de seguridad (FR-029)

- **Decision**: tabla `security_events` (`type`, `userId?`, `email?` normalizado, `ip`, `userAgent`, `createdAt`, `metadata` JSON) escrita a través de un `SecurityEventsPort`. La escritura no bloquea la respuesta (best effort, con el fallo registrado en el log). Nunca se guardan contraseñas, tokens ni enlaces.
- **Rationale**: permite auditar y probar SC-009. La retención (por ejemplo 12 meses) y la purga quedan **aplazadas** (ver Deferred en el plan).
- **Alternatives considered**: solo logs estructurados (más difíciles de consultar desde la aplicación y de probar).

## R14. Componentes de interfaz necesarios

- **Decision**: añadir a `packages/ui`, con sus historias de Storybook:
  - Átomos: `Input`, `Checkbox`.
  - Moléculas: `FormField` (etiqueta, campo, ayuda y error), `PasswordField` (mostrar/ocultar contraseña), `Alert`.
  - Plantillas: `AuthLayout`.

  Todo usa tokens CSS existentes, sin colores fijos. Los formularios específicos (`LoginForm`, etc.) viven en `apps/web/src/features/auth/components` y solo componen piezas de `@ucanvas/ui`.

- **Rationale**: cumple la regla de CLAUDE.md de que todo componente visual reutilizable vive en `packages/ui`, siguiendo el patrón que ya usa `features/health/components`.
- **Alternatives considered**: crear los inputs dentro de `apps/web` (lo prohíbe CLAUDE.md).

## R15. Pruebas

- **Decision**:
  - **API, unitarias**: un `.spec.ts` por caso de uso, con repositorios en memoria y dobles de `ClockPort`, `MailerPort`, `PasswordHasherPort` y `CommonPasswordCheckerPort`, sin `TestingModule`, siguiendo el patrón de `users`.
  - **API, e2e**: con supertest contra una base de datos PostgreSQL de test (`DATABASE_URL` apuntando a `ultimatecanvas_test`) y `MAIL_TRANSPORT=console` con un mailer capturador.
  - **Web**: se añade Vitest con Testing Library para `safeReturnTo`, `ProtectedRoute` y la lógica de renovación de sesión.
  - **SC-007**: test e2e que compara mensajes, códigos y latencia media entre correos registrados y no registrados (diferencia de medianas por debajo de un umbral).
- **Rationale**: la mayor parte de las reglas temporales (24 h, 60 min, 15 min, 2 h, 30 días) se prueban de forma determinista con un reloj inyectable.
- **Alternatives considered**: tests e2e con navegador (Playwright); útiles más adelante, no imprescindibles para esta funcionalidad.
