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

## Auth

`routes/ProtectedRoute.tsx` es un no-op por ahora (deja pasar siempre, marcado
con `TODO(auth)`). Reemplazar por el estado de sesión real cuando exista la
feature de auth (el API ya trae `JwtAuthGuard` listo del lado del backend).
