# Guía de arquitectura del frontend

> Obligatoria para todo código en `apps/web` y `packages/ui`. Desarrolla las skills `frontend-architecture` (Atomic Design + features) y `liquid-glass-ui` con las reglas propias de este proyecto: design system en un paquete aparte, grupo activo, permisos, límites de plan, contrato del API y estados de UI.
> Los estados de carga, vacío, error y éxito tienen su propia guía obligatoria: **`estados-ui.md`**.

---

## 1. La idea en una imagen

```
apps/web
  pages/          → compone una ruta: template + features. Casi sin lógica.
     │
     ▼
  features/<x>/   → LÓGICA DE NEGOCIO. Contenedores que usan hooks + vistas que reciben props.
     │      hooks/ ──▶ services/ ──▶ lib/apiClient ──▶ API
     ▼
packages/ui (@ucanvas/ui)
                  → UI PURA y reutilizable (Atomic Design). Sin fetching, sin negocio, sin conocer el API.
     atoms ◀── molecules ◀── organisms ◀── templates
```

**Los datos bajan por props; los eventos suben por callbacks.** Solo las features hablan con el API, y siempre a través de hooks.

A diferencia del layout genérico de la skill `frontend-architecture`, **`apps/web/src/components/` no existe**: toda la capa de Atomic Design vive en `packages/ui` y `apps/web` solo la consume con `import { Button } from '@ucanvas/ui'`.

## 2. Estructura

```
packages/ui/src/                 # design system (@ucanvas/ui)
├── atoms/                       # Button, Input, Checkbox, Spinner, (Label, Badge, Avatar, Skeleton…)
├── molecules/                   # FormField, PasswordField, Card, Alert, (EmptyState, ErrorState, UsageMeter…)
├── organisms/                   # DataTable, (Navbar, Sidebar, ConfirmDialog, Toaster…)
├── templates/                   # AuthLayout, (MainLayout, ForbiddenPage, NotFoundPage…)
├── styles/                      # tokens.css, glass-tokens.css, index.css
└── index.ts                     # API pública del paquete

apps/web/src/
├── main.tsx / App.tsx           # importa '@ucanvas/ui/style.css'
├── routes/                      # definición de rutas, guards (ProtectedRoute, PermissionRoute)
├── pages/                       # una página por ruta: CanvasBoardPage.tsx
├── features/                    # una carpeta por dominio, espejo de los módulos del API
│   └── canvas/
│       ├── components/          # componentes que solo usa esta feature
│       │   └── CanvasList/
│       │       ├── CanvasList.tsx         # CONTENEDOR: usa hooks, decide el estado
│       │       ├── CanvasListView.tsx     # VISTA: solo props, renderiza cada estado
│       │       ├── CanvasListView.stories.tsx
│       │       └── index.ts
│       ├── hooks/               # useCanvases, useCreateCanvas, canvasKeys
│       ├── services/            # canvas.service.ts
│       ├── context/             # providers propios de la feature (solo si hacen falta, p. ej. AuthProvider)
│       ├── types/               # tipos propios (los compartidos vienen de packages/shared)
│       ├── constants.ts         # textos y configuraciones de la feature
│       └── index.ts             # API pública de la feature
├── hooks/                       # hooks genéricos: useDebounce, useUnsavedChangesGuard, useToast
├── lib/                         # apiClient, queryClient, router, workspace context, view-state
└── utils/                       # funciones puras: formatDate, formatRelative, pluralize

apps/web/test/                   # setup de pruebas, handlers de MSW, mocks y utilidades de render
```

Los nombres entre paréntesis son componentes previstos que todavía no existen; se crean en `packages/ui` cuando la primera fase los necesite.

### Nombres

| Qué                    | Convención                      | Ejemplo                     |
| ---------------------- | ------------------------------- | --------------------------- |
| Componente             | Carpeta y archivo en PascalCase | `CanvasCard/CanvasCard.tsx` |
| Vista de un contenedor | `<Nombre>View`                  | `CanvasListView.tsx`        |
| Historia               | `<Nombre>.stories.tsx`          | `CanvasCard.stories.tsx`    |
| Hook                   | `use` + camelCase               | `useCanvases.ts`            |
| Servicio               | `<dominio>.service.ts`          | `canvas.service.ts`         |
| Página                 | `<Nombre>Page.tsx`              | `CanvasBoardPage.tsx`       |
| Utilidad               | camelCase                       | `formatRelative.ts`         |

## 3. ¿Dónde va este componente?

1. **¿Tiene lógica de negocio o pide datos?** → `apps/web/src/features/<dominio>/components/`.
2. **¿Es UI pura que serviría en cualquier proyecto?** → `packages/ui/src/`:
   - Un elemento indivisible → `atoms/`
   - Combina 2 o 3 átomos con un propósito → `molecules/`
   - Una sección completa de UI → `organisms/`
   - La disposición de una página → `templates/`
3. **¿Es una ruta?** → `apps/web/src/pages/`.
4. **¿Lo usan dos o más features?** → Quítale la lógica de negocio, muévelo a `packages/ui` y pásale los datos por props.

## 4. Reglas de importación

Dentro de `packages/ui`:

| Desde ↓ / Importa → | atoms | molecules | organisms | templates |
| ------------------- | :---: | :-------: | :-------: | :-------: |
| **atoms**           |  ✅   |    ❌     |    ❌     |    ❌     |
| **molecules**       |  ✅   |    ✅     |    ❌     |    ❌     |
| **organisms**       |  ✅   |    ✅     |    ✅     |    ❌     |
| **templates**       |  ✅   |    ✅     |    ✅     |    ✅     |

- `packages/ui` **nunca** importa de `apps/*`, no hace fetch y no conoce el API ni `ApiError`. Puede importar tipos de `@ucanvas/shared` si los necesita.

Dentro de `apps/web`:

| Desde ↓ / Importa → | `@ucanvas/ui` |        features        | pages | lib | hooks |
| ------------------- | :-----------: | :--------------------: | :---: | :-: | :---: |
| **features/A**      |      ✅       |         solo A         |  ❌   | ✅  |  ✅   |
| **pages**           |      ✅       | ✅ (por su `index.ts`) |  ❌   | ✅  |  ✅   |

- Una feature no importa de otra. Lo compartido se promueve a `packages/ui` (UI), `hooks/` o `lib/` (lógica de la app) o `packages/shared` (tipos y esquemas).
- Desde fuera de una feature solo se importa su `index.ts`: `import { CanvasList } from '@/features/canvas'`.
- Estas reglas se hacen cumplir con ESLint (`import/no-restricted-paths` o `eslint-plugin-boundaries`), de modo que una violación rompe el lint.

## 5. Componentes reutilizables (`packages/ui`)

Cada componente:

1. Vive en su carpeta con `Componente.tsx`, `Componente.types.ts`, `Componente.stories.tsx`, `Componente.test.tsx` (si tiene lógica) e `index.ts`, y se exporta desde el `index.ts` de su nivel.
2. Tipa sus variantes con uniones (`variant?: 'primary' | 'secondary' | 'ghost' | 'danger'`), no con varios booleanos.
3. Extiende los atributos nativos (`ButtonHTMLAttributes`) y pasa `...rest`.
4. Usa `forwardRef` si es un átomo interactivo.
5. Prefiere la composición (`Card.Header`, `Card.Body`) antes que muchas props.
6. No pide datos ni usa estado global. Recibe datos por props y emite eventos por callbacks.
7. Usa solo tokens de diseño; cero colores, espaciados o radios fijos.
8. Implementa todos sus estados (ver `estados-ui.md`): los de datos manejan carga, vacío y error; los interactivos manejan hover, focus-visible, disabled y, si aplica, cargando.

## 6. Patrón contenedor + vista en las features

Todo componente de feature que muestra datos se divide en dos:

- **Contenedor** (`CanvasList.tsx`): llama a los hooks, traduce el resultado de la consulta a un estado y le pasa todo a la vista. No tiene marcado propio.
- **Vista** (`CanvasListView.tsx`): recibe el estado y los callbacks por props y renderiza cada estado. No llama a hooks de datos.

Así, cada estado de la vista se puede ver en Storybook y probar sin un API real.

```tsx
// features/canvas/components/CanvasList/CanvasList.tsx  (contenedor)
export function CanvasList() {
  const query = useCanvases({ status: 'ACTIVE' });
  const canCreate = usePermission('canvas:create');
  const navigate = useNavigate();

  return (
    <CanvasListView
      state={toViewState(query, (d) => d.items.length === 0)}
      canCreate={canCreate}
      onRetry={query.refetch}
      onCreate={() => navigate('/canvases/new')}
      onOpen={(id) => navigate(`/canvases/${id}`)}
    />
  );
}
```

```tsx
// features/canvas/components/CanvasList/CanvasListView.tsx  (vista)
interface CanvasListViewProps {
  state: ViewState<Page<CanvasSummary>>;
  canCreate: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
}

export function CanvasListView({
  state,
  canCreate,
  onRetry,
  onCreate,
  onOpen,
}: CanvasListViewProps) {
  switch (state.status) {
    case 'loading':
      return <CanvasListSkeleton />;
    case 'error':
      return <ErrorState {...describeError(state.error)} onRetry={onRetry} />;
    case 'empty':
      return (
        <EmptyState
          title="Todavía no hay canvas en este grupo"
          description="El Lean Canvas te ayuda a ver tu modelo de negocio en una sola página y detectar sus riesgos."
          action={canCreate ? { label: 'Crear mi primer canvas', onClick: onCreate } : undefined}
        />
      );
    case 'success':
      return (
        <div aria-busy={state.isRefreshing}>
          {state.data.items.map((c) => (
            <CanvasSummaryCard key={c.id} canvas={c} onOpen={() => onOpen(c.id)} />
          ))}
        </div>
      );
  }
}
```

`ViewState` y `toViewState` se definen en `lib/view-state.ts`, y `describeError` (que traduce un `ApiError` a las props de `ErrorState`) en `lib/describeError.ts` (ver `estados-ui.md`). `EmptyState` y `ErrorState` vienen de `@ucanvas/ui` y no conocen `ApiError`.

## 7. Capa de datos

### 7.1 `lib/apiClient.ts`: el único que llama al API

Responsabilidades:

- Base URL desde `VITE_API_URL` (por defecto `/api/v1`).
- Agrega `Authorization` con el token de acceso en memoria y `X-Workspace-Id` con el grupo activo.
- Ante un `401`, intenta renovar la sesión **una sola vez** (una sola petición de renovación en vuelo, compartida) y reintenta la petición original; si falla, limpia la sesión y redirige al login conservando la ruta actual.
- Desenvuelve `{ success, data, error, meta }`: devuelve `data` y `meta`, o lanza `ApiError`.
- Ante un error de red lanza `ApiError` con `code: 'NETWORK_ERROR'`.

```typescript
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly fields?: Record<string, string[]>,
    public readonly details?: Record<string, unknown>,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}
```

### 7.2 `services/`: llamadas tipadas por dominio

```typescript
// features/canvas/services/canvas.service.ts
export const canvasService = {
  list: (params: ListCanvasParams) => apiClient.get<Page<CanvasSummary>>('/canvases', { params }),
  get: (id: string) => apiClient.get<Canvas>(`/canvases/${id}`),
  create: (input: CreateCanvasInput) => apiClient.post<Canvas>('/canvases', input),
  updateCard: (cardId: string, input: UpdateCardInput) =>
    apiClient.patch<CanvasCard>(`/cards/${cardId}`, input),
};
```

Los servicios no tienen estado ni lógica de UI: solo construyen la petición.

### 7.3 `hooks/`: react-query

```typescript
// features/canvas/hooks/canvasKeys.ts
export const canvasKeys = {
  all: (ws: string) => ['ws', ws, 'canvas'] as const,
  list: (ws: string, params: ListCanvasParams) => [...canvasKeys.all(ws), 'list', params] as const,
  detail: (ws: string, id: string) => [...canvasKeys.all(ws), 'detail', id] as const,
};
```

```typescript
// features/canvas/hooks/useCanvases.ts
export function useCanvases(params: ListCanvasParams) {
  const ws = useActiveWorkspaceId();
  return useQuery({
    queryKey: canvasKeys.list(ws, params),
    queryFn: () => canvasService.list(params),
    placeholderData: keepPreviousData, // al paginar o filtrar no vuelve el skeleton
  });
}

export function useCreateCanvas() {
  const ws = useActiveWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: canvasService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: canvasKeys.all(ws) }),
  });
}
```

Reglas:

- **Toda query key de datos de grupo empieza con `['ws', workspaceId, …]`.** Así nunca se mezcla la caché de dos grupos.
- Cada feature centraliza sus keys en `<dominio>Keys`.
- Configuración por defecto en `lib/queryClient.ts`: `staleTime` de 30 segundos, un reintento solo en errores de red o 5xx (nunca en 4xx) y `refetchOnWindowFocus: true`.
- Después de una mutación se invalidan las keys afectadas. Si la respuesta trae el recurso actualizado, se escribe en la caché con `setQueryData` en lugar de volver a pedirlo.
- Las acciones rápidas y frecuentes (marcar supuesto, completar tarea) usan actualización optimista con reversión en `onError` (ver `estados-ui.md`).
- El manejo global de errores en `lib/queryClient.ts` (`QueryCache` y `MutationCache` con `onError`) reacciona a `PLAN_LIMIT_REACHED`, `FEATURE_NOT_IN_PLAN`, `FORBIDDEN` y `WORKSPACE_NOT_FOUND`, para no repetir esa lógica en cada hook.

## 8. Grupo activo

- `lib/workspace/WorkspaceProvider.tsx` expone `useActiveWorkspaceId()` y `useSwitchWorkspace()`.
- El grupo activo se guarda por pestaña en `sessionStorage` y se informa al backend como el último usado.
- Al cambiar de grupo: se limpia la caché de react-query con `queryClient.clear()`, se recargan los permisos y se navega al inicio del nuevo grupo. Nunca se muestra, ni por un instante, información del grupo anterior.
- Ningún componente lee `sessionStorage` directamente; siempre usa los hooks del provider.

## 9. Permisos en la interfaz

- `usePermission('canvas:edit')` devuelve un booleano con el permiso en el grupo activo.
- `<Can permission="canvas:edit">…</Can>` renderiza su contenido solo si se tiene el permiso.
- `PermissionRoute` protege las rutas: sin permiso muestra `ForbiddenPage`.
- El menú se genera desde una configuración declarativa con `{ path, label, icon, permission }`, filtrada por permisos.
- **Ocultar en la interfaz es comodidad, no seguridad.** El backend siempre valida.
- Una acción no disponible por plan (no por permiso) se muestra, pero al usarla se explica que no está incluida en el plan; así el usuario descubre lo que gana al mejorar su plan.

## 10. Formularios

- react-hook-form con `zodResolver`, usando los esquemas de `packages/shared` (los mismos que valida el backend).
- Los campos usan la molécula `FormField`, con label, ayuda y error conectados por `aria-describedby`.
- Validación al salir del campo (`mode: 'onTouched'`) y otra vez al enviar.
- Los errores `VALIDATION_ERROR` del backend se asignan a sus campos con `setError` a partir de `error.fields`.
- Mientras se envía: el botón muestra `isLoading`, el formulario no se puede reenviar y los campos se mantienen editables, salvo que la spec diga lo contrario.
- Los formularios largos o de edición usan `useUnsavedChangesGuard` para advertir antes de salir con cambios sin guardar.
- Las acciones destructivas piden confirmación con `ConfirmDialog`. Las irreversibles piden escribir el nombre del recurso.

## 11. Rutas y páginas

- Rutas definidas en `routes/` con carga diferida por página (`lazy`).
- Cada ruta tiene un `errorElement` (error boundary) que muestra `ErrorState` en lugar de una pantalla blanca.
- Rutas especiales: `/403` → `ForbiddenPage`, `*` → `NotFoundPage`.
- Las páginas componen templates y features; no llaman a hooks de datos directamente, salvo para leer parámetros de ruta.
- El título del documento se actualiza en cada página: `Nombre de la sección · Nombre del grupo`.

## 12. Estilos

- Los estilos y tokens viven en `packages/ui/src/styles/` (`tokens.css`, `glass-tokens.css`), con Tailwind sobre CSS variables. `apps/web` solo importa `@ucanvas/ui/style.css` y no define colores propios. Cero colores en hexadecimal dentro de los componentes.
- Superficies de vidrio según la skill `liquid-glass-ui`: `.glass-thin` (chips, controles pequeños), `.glass` (tarjetas, bloques del canvas) y `.glass-thick` (navegación, paneles, modales).
- Fallbacks obligatorios con `@media (prefers-reduced-transparency: reduce)` y `@supports not (backdrop-filter: blur(1px))`: superficies opacas con el mismo contraste.
- Modo claro y oscuro con tokens. Nunca se usa `dark:` con colores fijos.
- Diseño mobile-first. Breakpoints de Tailwind por defecto. La página nunca tiene desplazamiento horizontal; las tablas y el tablero del canvas se adaptan o se desplazan dentro de su propio contenedor.
- Las animaciones respetan `prefers-reduced-motion`.

## 13. Accesibilidad

- Contraste mínimo de 4.5:1 para el texto, también sobre superficies de vidrio.
- Todo lo interactivo se puede usar con teclado y tiene un `focus-visible` claro.
- Los iconos que actúan como botón tienen `aria-label`. Las imágenes tienen `alt`.
- Los diálogos atrapan el foco y lo devuelven al cerrarse.
- Los mensajes que cambian solos (estado de guardado, toasts) usan `aria-live="polite"`; los errores críticos usan `role="alert"`.
- Los contenedores que se están cargando llevan `aria-busy="true"`.

## 14. Textos

- Toda la interfaz está en español y se dirige al usuario de "tú".
- Frases cortas y concretas. Los botones dicen lo que hacen ("Crear canvas", no "Aceptar").
- Los mensajes de error dicen qué pasó y qué puede hacer el usuario: "No pudimos guardar la tarjeta. Revisa tu conexión e inténtalo de nuevo."
- Fechas con `Intl` en `es` y la zona horaria del usuario. Relativas para lo reciente ("hace 5 minutos") y absolutas para lo lejano.
- Los textos de una feature se agrupan en su `constants.ts`, para revisarlos y ajustarlos en un solo lugar.

## 15. Storybook

- Todo componente de `packages/ui` y toda vista (`*View`) de las features tiene historias. Storybook hoy está configurado solo en `packages/ui` (`pnpm --filter @ucanvas/ui storybook`); cuando llegue la primera vista con datos en `apps/web`, se configura Storybook también ahí (con los mismos decoradores) o se amplía el de `packages/ui` para leer las historias de `apps/web/src/features`.
- Una historia por variante y **una por cada estado** que aplique, con nombres consistentes: `Default`, `Loading`, `Empty`, `Error`, `Disabled`, `ReadOnly`, `Saving`, `Offline`, `Conflict`, `LongContent`.
- Las historias usan datos de ejemplo realistas en español, no "Lorem ipsum".
- Decoradores globales: fondo gradient mesh (para ver el vidrio correctamente), selector de tema claro/oscuro y router de memoria.
- Se agrega una historia `LongContent` cuando el componente muestra texto del usuario, para verificar cómo se comporta con textos largos.

## 16. Pruebas

| Tipo        | Qué cubre                                              | Herramientas                   |
| ----------- | ------------------------------------------------------ | ------------------------------ |
| Unitaria    | Utilidades, `toViewState`, lógica de hooks             | Vitest                         |
| Componente  | Vistas en cada estado; interacción con teclado y ratón | Vitest + Testing Library       |
| Integración | Contenedor + hooks + API simulado                      | Vitest + Testing Library + MSW |

- Se prueba lo que el usuario ve y hace (`getByRole`, `userEvent`), no detalles de implementación.
- Cada vista tiene al menos una prueba por estado.
- Los handlers de MSW viven en `apps/web/test/handlers/<dominio>.ts` y respetan la forma `{ success, data, error, meta }`.

## 17. Prohibido en el frontend

- ❌ `fetch` o axios fuera de `lib/apiClient.ts`.
- ❌ Llamar a servicios directamente desde componentes; siempre a través de hooks.
- ❌ Crear `apps/web/src/components/`: la UI reutilizable va en `packages/ui`.
- ❌ Lógica de negocio, pedidos de datos o imports de `apps/*` en `packages/ui`.
- ❌ Importar de una feature a otra, o archivos internos de una feature desde fuera de ella.
- ❌ Query keys de datos de grupo sin `workspaceId`.
- ❌ Colores, espaciados o radios fijos; estilos inline salvo valores dinámicos.
- ❌ Un componente de datos sin estados de carga, vacío y error.
- ❌ Un botón de envío sin estado de carga o que permita el doble envío.
- ❌ Mostrar `error.message` de errores inesperados (5xx o de red) tal cual; se usa el texto amigable de `ErrorState`.
- ❌ Spinners de página completa para cargar contenido (se usan skeletons).
- ❌ `any`, `@ts-ignore` o `eslint-disable` sin un comentario que lo justifique.
- ❌ Un componente nuevo de `packages/ui` sin historias en Storybook.

## 18. Receta: crear una feature nueva

1. Crea `features/<dominio>/` con `components/`, `hooks/`, `services/`, `types/`, `constants.ts` e `index.ts`.
2. Tipos de request y response desde `packages/shared`; solo los tipos propios de la UI van en `types/`.
3. **Servicio** con las llamadas tipadas a través de `apiClient`.
4. **Keys y hooks** de react-query, con `workspaceId` en las keys, invalidaciones y, si aplica, actualización optimista.
5. **Vistas** (`*View`) con todos sus estados según `estados-ui.md`, y sus historias en Storybook.
6. **Contenedores** que conectan hooks, permisos y navegación con las vistas.
7. **Página y ruta** con `PermissionRoute` si la sección requiere un permiso. Agrega la entrada del menú con su permiso.
8. **Pruebas:** una por estado de cada vista y la integración del flujo principal con MSW.
9. Si necesitas un componente genérico que no existe, créalo en `packages/ui` con sus historias, expórtalo desde su `index.ts` y luego úsalo.
10. Revisa `checklist-feature.md` antes de dar la tarea por terminada.
