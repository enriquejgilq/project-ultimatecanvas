# Contract: Auth API (`/api/v1/auth`)

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

Todas las respuestas usan el sobre existente `ApiResponse<T>` de `@ucanvas/shared`:

```json
{ "success": true,  "data": { },   "error": null }
{ "success": false, "data": null, "error": { "code": "INVALID_CREDENTIALS", "message": "Correo o contraseña incorrectos." } }
```

> **Cambio en el sobre de error**: los errores de autenticación devuelven `error` como objeto `{ code, message }` (compatible con el tipo actual `string | Record<string, unknown>`). Los errores de validación de la política de contraseña añaden `rules: PasswordRuleCode[]`.

**Cookie de sesión**: `ucanvas_session`, con `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth` y `Secure` en producción. Sin `Max-Age` cuando `rememberMe = false`; con `Max-Age` hasta `expiresAt` cuando `rememberMe = true`.

**Límite por IP**: 10 peticiones por minuto en los endpoints marcados con ⏱. Al superarlo se responde `429`; es un límite por IP, no por correo, así que no revela nada sobre las cuentas.

**Mensajes genéricos** (`AUTH_MESSAGES`):

- `CHECK_YOUR_EMAIL`: "Si los datos son correctos, recibirás un correo en unos minutos."
- `INVALID_CREDENTIALS`: "Correo o contraseña incorrectos."
- `INVALID_LINK`: "El enlace no es válido o ha caducado. Puedes pedir uno nuevo."

---

## POST `/auth/register` ⏱ — público

Body: `{ "email": string, "password": string }` (`registerSchema`)

| Caso                                             | Respuesta                                                | Efecto                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Correo nuevo y contraseña válida                 | `202 { message: CHECK_YOUR_EMAIL }`                      | Crea la cuenta PENDIENTE, emite el token de verificación y encola el correo (sujeto al límite de FR-030). |
| Correo con cuenta PENDIENTE y contraseña válida  | `202` idéntico                                           | Sustituye el hash, invalida los tokens previos, emite uno nuevo y encola el correo (FR-032).              |
| Correo con cuenta VERIFICADA y contraseña válida | `202` idéntico                                           | No cambia la cuenta. Encola el aviso `REGISTRATION_ATTEMPT` al dueño (FR-025, sujeto al límite).          |
| Contraseña que no cumple la política             | `422 { code: "PASSWORD_POLICY", message, rules: [...] }` | Nada. Se valida **antes** de consultar el correo, así que no revela nada.                                 |
| Body mal formado o correo inválido               | `400`                                                    | Nada.                                                                                                     |

## POST `/auth/verify-email` ⏱ — público

Body: `{ "token": string }`

| Caso                                            | Respuesta                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Token vigente                                   | `200 { message: "Tu correo está verificado. Ya puedes iniciar sesión." }`. La cuenta pasa a VERIFICADA y el token queda usado. |
| Token usado, caducado, invalidado o inexistente | `400 { code: "INVALID_LINK", message: INVALID_LINK }`                                                                          |

## POST `/auth/resend-verification` ⏱ — público

Body: `{ "email": string }`. Siempre responde `202 { message: CHECK_YOUR_EMAIL }`. Solo envía si la cuenta existe, está PENDIENTE y no se ha superado el límite; en ese caso invalida los tokens previos.

## POST `/auth/login` ⏱ — público

Body: `{ "email": string, "password": string, "rememberMe": boolean }`

| Caso                                                      | Respuesta                                                                                                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credenciales correctas, cuenta VERIFICADA, sin bloqueo    | `200 AuthSession` + `Set-Cookie: ucanvas_session`. Pone el contador de fallos a 0.                                                                                                                             |
| Correo inexistente, contraseña errónea o cuenta bloqueada | `401 { code: "INVALID_CREDENTIALS" }`, con mensaje y tiempo de respuesta indistinguibles entre sí. Si la contraseña es errónea y la cuenta no está bloqueada, suma un fallo; al 5.º, bloquea y envía el aviso. |
| Contraseña correcta, cuenta PENDIENTE                     | `403 { code: "EMAIL_NOT_VERIFIED", message: "Verifica tu correo para entrar. Te podemos reenviar el enlace." }`                                                                                                |

`AuthSession`: `{ "accessToken": string, "expiresIn": number /* segundos; 900 con la configuración por defecto */, "user": { "id", "email", "name", "emailVerified": true } }`

## POST `/auth/refresh` — público (requiere la cookie)

Sin body. Cabecera obligatoria `X-Requested-With: ucanvas`, como defensa adicional contra CSRF.

| Caso                                                          | Respuesta                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cookie válida y sesión activa                                 | `200 AuthSession`. Actualiza `lastActivityAt`. Con `rememberMe`, se reemite la cookie con el `Max-Age` restante. |
| Sin cookie, o sesión revocada, caducada o inactiva más de 2 h | `401 { code: "SESSION_EXPIRED" }` + cookie borrada.                                                              |

## POST `/auth/logout` — público (usa la cookie si existe)

Cabecera `X-Requested-With: ucanvas`. Revoca la sesión de la cookie (`LOGOUT`) y borra la cookie. Siempre responde `204`, aunque no hubiera sesión.

## POST `/auth/forgot-password` ⏱ — público

Body: `{ "email": string }`. Siempre responde `202 { message: CHECK_YOUR_EMAIL }`. Si la cuenta existe y no se ha superado el límite: invalida los tokens de recuperación previos, emite uno nuevo (60 min) y encola el correo.

## POST `/auth/reset-password` ⏱ — público

Body: `{ "token": string, "newPassword": string }`

| Caso                                 | Respuesta                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token vigente y contraseña válida    | `204`. Cambia el hash, consume el token, revoca **todas** las sesiones (`PASSWORD_RESET`), levanta el bloqueo, pone el contador a 0 y encola el aviso `PASSWORD_CHANGED`. |
| Contraseña que no cumple la política | `422 PASSWORD_POLICY`. El token **no** se consume.                                                                                                                        |
| Token no válido                      | `400 INVALID_LINK`                                                                                                                                                        |

## POST `/auth/change-password` — **autenticado** (Bearer)

Body: `{ "currentPassword": string, "newPassword": string }`

| Caso                                       | Respuesta                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contraseña actual correcta y nueva válida  | `204`. Cambia el hash, revoca todas las sesiones **excepto** la del `sid` actual (`PASSWORD_CHANGED`), pone el contador a 0 y encola el aviso.                                                                      |
| Contraseña actual errónea                  | `400 { code: "INVALID_CURRENT_PASSWORD", message: "La contraseña actual no es correcta." }`. Suma un fallo; al 5.º, bloquea y envía el aviso. Se usa 400 y no 401 para que el cliente no intente renovar la sesión. |
| Cuenta bloqueada                           | `423 { code: "ACCOUNT_LOCKED", message: "Demasiados intentos. Vuelve a intentarlo en unos minutos." }`. El usuario ya está autenticado, así que no hay riesgo de enumeración.                                       |
| Contraseña nueva que no cumple la política | `422 PASSWORD_POLICY`                                                                                                                                                                                               |

## GET `/auth/me` — **autenticado**

`200 AuthUser`, o `401` si el token no es válido o la sesión `sid` ya no está activa.

---

## Cambios en endpoints existentes

- `JwtAuthGuard` pasa a ser global.
- `GET /health` y todos los endpoints de `/auth` marcados como públicos llevan `@Public()`.
- `/users/*` pasa a requerir autenticación (`401` sin un token válido).
- `JwtStrategy.validate` comprueba que la sesión `sid` sigue activa (research R2).

## Contenido de los correos (todos en español)

| Tipo                 | Asunto                                                | Incluye                                                                                                 |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| EMAIL_VERIFICATION   | "Confirma tu correo en UltimateCanvas"                | Enlace `{APP_WEB_URL}/verify-email?token=…` y aviso de que caduca en 24 h.                              |
| REGISTRATION_ATTEMPT | "Alguien intentó registrarse con tu correo"           | Enlaces a iniciar sesión y a recuperar contraseña. Ningún token.                                        |
| PASSWORD_RESET       | "Restablece tu contraseña"                            | Enlace `{APP_WEB_URL}/reset-password?token=…`, aviso de 60 min y de que se cerrarán todas las sesiones. |
| LOCKOUT_ALERT        | "Hemos bloqueado temporalmente el acceso a tu cuenta" | Hora del bloqueo, duración de 15 min y recomendación de cambiar la contraseña si no fuiste tú.          |
| PASSWORD_CHANGED     | "Tu contraseña ha cambiado"                           | Hora del cambio y enlace a recuperación por si no fuiste tú.                                            |
