# apps/web/src

Estructura de `apps/web` para este monorepo. A diferencia del layout genérico de
la skill `frontend-architecture`, aquí **no existe `src/components/`**: toda la
capa de Atomic Design (atoms/molecules/organisms/templates) vive en
`packages/ui` y se consume vía `@ucanvas/ui`. `apps/web` es solo consumidor.

```
src/
├── features/<dominio>/   # lógica de negocio por dominio
│   ├── components/       # componentes que SOLO usa esta feature
│   ├── hooks/             # hooks de datos (react-query) y de UI de la feature
│   ├── services/          # *.service.ts — llamadas al API vía apiClient
│   └── index.ts           # API pública de la feature (lo único que se importa desde fuera)
├── pages/                 # 1 componente por ruta; compone templates de @ucanvas/ui + features
├── hooks/                 # hooks genéricos: useDebounce, useLocalStorage, etc.
├── lib/                   # configuración de librerías
│   ├── apiClient.ts       # único cliente HTTP; nadie más hace fetch directo
│   ├── queryClient.ts     # instancia de TanStack QueryClient
│   └── router.ts          # constantes de rutas (ROUTES)
├── routes/                # AppRoutes + ProtectedRoute
└── utils/                 # funciones puras
```

## Regla de import más importante

**`features/A` nunca importa de `features/B`.** Si dos features necesitan lo
mismo (un componente visual, un hook, un tipo), no se importa entre features:
se promueve.

- Componente visual reutilizable → `packages/ui` (atom/molecule/organism).
- Tipo o schema compartido con el API → `packages/shared`.
- Hook genérico sin lógica de negocio (debounce, localStorage) → `src/hooks`.

Cada feature expone su API pública únicamente a través de su `index.ts`. Nada
externo importa un archivo interno de `features/<dominio>/hooks/*` o
`.../services/*` directamente.

Otras reglas de import:

- `pages/` puede importar de `features/*`, `@ucanvas/ui` y `@ucanvas/shared`. Nadie importa de `pages/`.
- `features/*` puede importar de `@ucanvas/ui`, `@ucanvas/shared`, `src/lib`, `src/hooks`, `src/utils` — nunca de otra feature ni de `pages/`.
- `@ucanvas/ui` no importa nada de `apps/web` (no conoce features, no hace fetch).

## Capa de datos

- Todo fetch pasa por `lib/apiClient.ts`. Desempaqueta el contrato
  `{ success, data, error }` del API y lanza `ApiError` en caso de fallo.
- Cada feature con datos remotos tiene su `*.service.ts` (usa `apiClient`) y su
  hook (`useX`, con TanStack Query) que lo consume. Los componentes nunca
  llaman al API directo.
- Ver `features/users/` como referencia completa del patrón:
  `users.service.ts` → `useUsers()` → `UsersPage` (loading / empty / error).

## Path aliases

`@/features`, `@/pages`, `@/hooks`, `@/lib`, `@/utils`, `@/routes` — configurados
en `vite.config.ts` y `tsconfig.app.json`. No existe `@/components`: los
componentes visuales se importan como `@ucanvas/ui`.

## Auth (`features/auth`)

Spec: `specs/001-user-auth/` (contrato web en `contracts/web-routes.md`).

- **Sesión**: `AuthProvider` (envuelve la app en `App.tsx`) expone vía `useAuth()`
  `status: 'bootstrapping' | 'authenticated' | 'anonymous'`, `user`, `login()`,
  `logout()` y `renewSession()`. Al arrancar llama a `POST /auth/refresh`: si la
  cookie de sesión (`HttpOnly`) sigue viva, la sesión se recupera sin pedir credenciales.
- **Token de acceso solo en memoria** (`lib/authToken.ts`). Nunca en
  `localStorage`/`sessionStorage`. `apiClient` lo adjunta como `Bearer`, envía
  `credentials: 'include'` y `X-Requested-With: ucanvas`.
- **Renovación**: ante un 401 en una petición autenticada, `apiClient` pide un único
  refresh compartido (aunque fallen varias peticiones a la vez) y reintenta una vez.
  `useSessionKeepAlive` renueva ~60 s antes de caducar **solo si** hubo interacción
  (puntero, teclado, rueda, foco) en los últimos 15 min; una pestaña abandonada caduca
  y el servidor aplica el corte de 2 h de inactividad.
- **Varias pestañas**: `BroadcastChannel('ucanvas-auth')` propaga `login`, `logout`
  y `session-ended`.
- **Rutas privadas**: todo lo que va dentro de `routes/ProtectedRoute.tsx`. Sin
  sesión redirige a `/login?returnTo=<ruta+query+hash>`; tras iniciar sesión se
  vuelve allí pasando por `utils/safeReturnTo.ts`, que solo acepta rutas del propio
  origen (nada de `//otro.sitio`, `https://…`, `/\…`).
- Los textos (mensajes de error genéricos, reglas de contraseña) salen de
  `AUTH_MESSAGES` / `PASSWORD_RULE_MESSAGES` en `@ucanvas/shared`, los mismos que usa el API.

## Tests

`pnpm --filter @ucanvas/web test` (Vitest + Testing Library, entorno jsdom). Los tests
viven junto al código (`*.test.ts[x]`); el setup está fuera de `src/`, en `test/setup.ts`.
