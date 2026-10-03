# Quickstart: validar la autenticación de principio a fin

**Feature**: [spec.md](./spec.md) | **API**: [contracts/auth-api.md](./contracts/auth-api.md) | **Web**: [contracts/web-routes.md](./contracts/web-routes.md)

Guía para comprobar, una vez implementada, que la funcionalidad cumple la spec. No contiene código de implementación.

## Prerrequisitos

- Node 20 o superior, pnpm 9 y PostgreSQL local en marcha.
- Variables nuevas en `apps/api/.env` (ver `.env.example` actualizado):

  | Variable         | Valor en desarrollo                                                         |
  | ---------------- | --------------------------------------------------------------------------- |
  | `APP_WEB_URL`    | `http://localhost:5173` (base de los enlaces de los correos)                |
  | `MAIL_TRANSPORT` | `console` (los correos y sus enlaces aparecen en el log de la API) o `smtp` |
  | `SMTP_URL`       | solo con `smtp`, por ejemplo `smtp://localhost:1025` (Mailpit)              |
  | `MAIL_FROM`      | `UltimateCanvas <no-reply@localhost>`                                       |
  | `TRUST_PROXY`    | `false`                                                                     |

  `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` dejan de usarse (research R2).

- Opcional, para ver los correos en una bandeja web: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit` y abrir http://localhost:8025.

## Puesta en marcha

```bash
pnpm install
pnpm --filter @ucanvas/api db:migrate      # aplica la migración de auth
pnpm --filter @ucanvas/api db:seed         # usuarios demo verificados con contraseña de desarrollo
pnpm build                                 # compila shared y ui la primera vez
pnpm dev
```

Web: http://localhost:5173 · Swagger: http://localhost:3000/docs (sección `auth`).

## Pruebas automáticas

```bash
pnpm --filter @ucanvas/api test            # casos de uso con reloj, mailer y repos falsos
pnpm --filter @ucanvas/api test:e2e        # requiere DATABASE_URL de test (ultimatecanvas_test)
pnpm --filter @ucanvas/web test            # safeReturnTo, ProtectedRoute, renovación de sesión
pnpm typecheck && pnpm lint
```

## Escenarios manuales

Cada escenario indica la historia (US) o requisito que valida y el resultado esperado.

### 1. Registro y verificación (US1, FR-001 a FR-009, FR-032)

1. Ve a `/register` e intenta usar `password123`. **Esperado**: rechazo por "demasiado común". Con `abcdefghij`, rechazo por "falta un número".
2. Regístrate con `Ana@Example.com ` y una contraseña válida. **Esperado**: pantalla "Revisa tu correo"; el enlace aparece en el log de la API o en Mailpit.
3. Antes de verificar, intenta iniciar sesión. **Esperado**: mensaje "Verifica tu correo…" con la opción de reenviar.
4. Regístrate otra vez con `ana@example.com` y otra contraseña. **Esperado**: mismo mensaje. El primer enlace deja de funcionar (`INVALID_LINK`) y el nuevo activa la cuenta con la **segunda** contraseña.
5. Abre de nuevo el enlace ya usado. **Esperado**: `INVALID_LINK`.
6. Regístrate con el correo ya verificado. **Esperado**: mismo mensaje en pantalla y un correo "Alguien intentó registrarse con tu correo".

### 2. Sesión (US2, FR-010 a FR-013)

1. Inicia sesión **sin** "mantener sesión iniciada", cierra el navegador por completo y vuelve a abrirlo. **Esperado**: hay que iniciar sesión otra vez.
2. Inicia sesión **con** "mantener sesión iniciada", cierra el navegador y vuelve a abrirlo. **Esperado**: sigues dentro.
3. Usa la aplicación más de 15 minutos con interacción. **Esperado**: no se piden credenciales; en la pestaña Red se ven llamadas a `/auth/refresh`.
4. Cierra sesión y pulsa "atrás" en el navegador. **Esperado**: no se ve contenido privado.
5. Las reglas de 2 h y 30 días se validan en los tests con reloj inyectable; no hace falta esperar.

### 3. Páginas privadas y retorno (US3, FR-026 a FR-028)

1. Sin sesión, abre `/users?page=2`. **Esperado**: redirección a `/login?returnTo=%2Fusers%3Fpage%3D2` sin ver datos. Tras entrar, vuelves a `/users?page=2`.
2. Abre `/login?returnTo=https://evil.example` o `//evil.example` e inicia sesión. **Esperado**: vas a `/`.

### 4. Recuperación (US4, FR-014 a FR-017)

1. Inicia sesión en dos navegadores distintos.
2. En `/forgot-password` pide el enlace dos veces seguidas (con más de 60 s entre ellas). **Esperado**: el mismo mensaje las dos veces; solo funciona el segundo enlace.
3. Usa el enlace con una contraseña inválida. **Esperado**: error de política y el enlace sigue siendo válido.
4. Usa el enlace con una contraseña válida. **Esperado**: los dos navegadores pierden la sesión en menos de 1 minuto (SC-005) y llega el correo "Tu contraseña ha cambiado".
5. Pide recuperación con un correo inexistente. **Esperado**: el mismo mensaje y ningún correo.

### 5. Bloqueo (US5, FR-018 a FR-021)

1. Falla la contraseña 5 veces. **Esperado**: el 5.º fallo muestra el mensaje genérico, llega **un** correo de bloqueo, y el 6.º intento con la contraseña **correcta** también se rechaza con el mismo mensaje.
2. Completa una recuperación. **Esperado**: el bloqueo se levanta y puedes entrar con la nueva contraseña.

### 6. Cambio de contraseña (US6, FR-033 a FR-036)

1. Con sesión en dos navegadores, cambia la contraseña desde `/account/security` en el navegador A. **Esperado**: A sigue dentro, B pierde la sesión en menos de 1 minuto, y llega el aviso por correo.
2. Introduce una contraseña actual errónea 5 veces. **Esperado**: la cuenta queda bloqueada y llega el aviso; el siguiente intento muestra "Demasiados intentos…".

### 7. Límite de correos (FR-030, FR-031)

1. Pulsa "Reenviar enlace" 5 veces en menos de un minuto. **Esperado**: siempre el mismo mensaje, pero solo **1** correo enviado; a lo largo de una hora, como máximo 3.

### 8. Enumeración y secretos (FR-022 a FR-024, SC-007, SC-009)

1. El test e2e de enumeración compara mensajes, códigos y la mediana de latencia entre correos registrados y no registrados en login, registro, reenvío y recuperación. **Esperado**: respuestas idénticas y una diferencia de medianas menor que el umbral configurado.
2. Revisa `security_events` (`pnpm --filter @ucanvas/api db:studio`) y el log de la API. **Esperado**: ninguna contraseña ni token en claro; solo hashes en `sessions` y `email_tokens`. La única excepción son las líneas de `ConsoleMailer`, que muestran el enlace a propósito y que la validación del entorno prohíbe cuando `NODE_ENV=production`.
