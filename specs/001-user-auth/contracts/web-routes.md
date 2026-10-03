# Contract: Rutas web y comportamiento de sesión en el cliente

**Feature**: [spec.md](../spec.md) | **API**: [auth-api.md](./auth-api.md)

## Rutas (`apps/web/src/lib/router.ts` → `ROUTES`)

| Ruta                                                         | Acceso                                             | Página                | Comportamiento                                                                                                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login?returnTo=`                                           | pública (con sesión → redirige a `returnTo` o `/`) | `LoginPage`           | Correo, contraseña y casilla "Mantener sesión iniciada". Con `401` muestra el mensaje genérico. Con `403 EMAIL_NOT_VERIFIED` ofrece "Reenviar enlace". Tras entrar navega a `safeReturnTo(returnTo)`. |
| `/register`                                                  | pública                                            | `RegisterPage`        | Correo y contraseña, con validación de la política en vivo (`passwordSchema`). Tras `202` muestra la pantalla "Revisa tu correo". Muestra los errores `422 rules` junto al campo.                     |
| `/verify-email?token=`                                       | pública                                            | `VerifyEmailPage`     | Al montarse hace `POST /auth/verify-email`. Si va bien, enlaza a `/login`. Con `INVALID_LINK` ofrece un formulario para reenviar.                                                                     |
| `/forgot-password`                                           | pública                                            | `ForgotPasswordPage`  | Pide el correo y siempre muestra `CHECK_YOUR_EMAIL`.                                                                                                                                                  |
| `/reset-password?token=`                                     | pública                                            | `ResetPasswordPage`   | Contraseña nueva y su confirmación. Si va bien, avisa de que se cerraron todas las sesiones y lleva a `/login`. Con `INVALID_LINK` enlaza a `/forgot-password`.                                       |
| `/account/security`                                          | **privada**                                        | `AccountSecurityPage` | Formulario de cambio de contraseña (actual, nueva y confirmación). Si va bien, avisa de que se cerró la sesión en los demás dispositivos.                                                             |
| `/`, `/users`, y toda ruta futura dentro de `ProtectedRoute` | **privada**                                        | —                     | Ver "ProtectedRoute".                                                                                                                                                                                 |

## ProtectedRoute

1. Mientras se resuelve el estado inicial (`bootstrapping`), muestra un `Spinner` y **ningún** contenido privado (FR-026).
2. Sin sesión, navega a `/login?returnTo=${encodeURIComponent(pathname + search + hash)}` con `replace`.
3. Con sesión, renderiza los hijos.

## `safeReturnTo(value: string | null): string`

Devuelve `value` solo si cumple todo lo siguiente; si no, devuelve `/`:

- empieza por `/`;
- no empieza por `//` ni por `/\`;
- no contiene `\` ni caracteres de control;
- al resolverse con `new URL(value, window.location.origin)` mantiene el mismo `origin`.

## Estado de sesión en el cliente (`features/auth`)

- **`AuthProvider`** (contexto): expone `status: 'bootstrapping' | 'authenticated' | 'anonymous'`, `user`, `login()`, `logout()`, `register()` y demás.
- **Arranque de la aplicación**: llama a `POST /auth/refresh`. Si va bien, pasa a `authenticated`; si no, a `anonymous`. Así funcionan tanto "mantener sesión iniciada" como la recarga de la página.
- **Token de acceso**: vive **solo en memoria** (`lib/authToken.ts`). Se elimina el uso de `localStorage` (`auth_token`) en `apiClient`.
- **`apiClient`**:
  - Usa `credentials: 'include'` en las llamadas a `/auth/*`.
  - Ante un `401` en una petición autenticada, hace un único `refresh` compartido entre peticiones simultáneas y reintenta una vez. Si el refresh falla, limpia el estado y `ProtectedRoute` lleva a `/login?returnTo=…`, de modo que el usuario vuelve a donde estaba.
- **Renovación proactiva**: unos 60 s antes de `expiresIn`, renueva **solo si** hubo actividad (`pointerdown`, `keydown`, `wheel`, `focus`) en los últimos 15 minutos. Si no, deja caducar el token de acceso, y el servidor aplica el corte de 2 h por inactividad.
- **Varias pestañas**: un `BroadcastChannel('ucanvas-auth')` comunica `logout` y `session-ended` a las demás pestañas para que pasen a `anonymous`.
