# Guía de estados de la interfaz

> Obligatoria para todo componente de `apps/web` y `packages/ui`. Un componente no está terminado si solo funciona cuando todo sale bien.
> Cada estado es parte del diseño: tiene su forma visual, su texto y su historia en Storybook.

---

## 1. Qué estados debe tener cada tipo de componente

| Tipo de componente                                 | Estados obligatorios                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lista o tabla de datos**                         | Cargando (skeleton) · Vacío por primer uso · Sin resultados por filtro · Error con reintento · Con datos · Actualizando en segundo plano · Cargando más (si pagina) |
| **Detalle de un recurso**                          | Cargando · No encontrado · Sin permiso · Error · Con datos · Solo lectura (si aplica)                                                                               |
| **Formulario**                                     | Inicial · Con errores de campo · Enviando · Error del servidor · Éxito                                                                                              |
| **Editor con guardado automático** (canvas, notas) | Guardado · Guardando · Sin conexión con cambios pendientes · Error al guardar · Conflicto de edición · Solo lectura                                                 |
| **Botón de acción**                                | Normal · Hover · Focus-visible · Deshabilitado (con motivo si no es obvio) · Ejecutando                                                                             |
| **Acción optimista** (marcar, completar)           | Aplicada al instante · Revertida con aviso si falla                                                                                                                 |
| **Proceso largo** (análisis con IA, exportar)      | Iniciando · En progreso con mensajes · Listo · Falló · No disponible por plan o por permiso                                                                         |
| **Widget dentro de un panel**                      | Cargando · Error aislado (sin romper el resto del panel) · Vacío · Con datos                                                                                        |

## 2. El tipo `ViewState`

Todas las vistas reciben el estado ya resuelto, nunca el objeto de react-query completo.

```typescript
// lib/view-state.ts
import type { UseQueryResult } from '@tanstack/react-query';
import type { ApiError } from './apiClient';

export type ViewState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'empty' }
  | { status: 'success'; data: T; isRefreshing: boolean; refreshError?: ApiError };

export function toViewState<T>(
  query: UseQueryResult<T, ApiError>,
  isEmpty: (data: T) => boolean = () => false,
): ViewState<T> {
  if (query.isPending) return { status: 'loading' };
  if (query.isError && query.data === undefined) return { status: 'error', error: query.error };

  const data = query.data as T;
  if (isEmpty(data)) return { status: 'empty' };

  return {
    status: 'success',
    data,
    isRefreshing: query.isFetching,
    refreshError: query.isError ? query.error : undefined, // ya había datos: se conservan
  };
}
```

**Regla:** si ya hay datos en pantalla y una recarga falla, **no** se reemplazan por la pantalla de error. Se conservan los datos y se muestra un aviso discreto con la opción de reintentar.

## 3. Carga

### Carga inicial: skeletons, no spinners

- Todo contenido que se carga por primera vez muestra un **skeleton con la misma forma** que el contenido final: mismas filas, columnas y tamaños aproximados. Así la página no "salta" al llegar los datos.
- Cada vista con datos tiene su skeleton propio junto a ella: `CanvasListSkeleton`, `LeanCanvasBoardSkeleton`.
- El átomo `Skeleton` usa los tokens de superficie, tiene una animación suave que se desactiva con `prefers-reduced-motion` y lleva `aria-hidden="true"`. El contenedor lleva `aria-busy="true"`.
- **Retraso anti-parpadeo:** el skeleton aparece solo si la carga tarda más de 200 ms. Para cargas rápidas se muestra el espacio vacío y luego el contenido, sin parpadeo.

```typescript
// hooks/useDelayedFlag.ts
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return visible;
}
```

- Los spinners se usan **solo** dentro de botones, en acciones pequeñas en línea, o en la carga inicial de la aplicación (verificando la sesión). Nunca como spinner de página completa para cargar contenido.

### Recargas y cambios de página

- Una recarga en segundo plano (`isRefreshing`) **no** vuelve al skeleton: se mantienen los datos y, como mucho, se muestra un indicador sutil (una barra fina arriba del contenedor).
- Al paginar, filtrar u ordenar se usa `placeholderData: keepPreviousData`: los datos anteriores quedan visibles, atenuados, hasta que llegan los nuevos.
- En listas con "Cargar más", el botón muestra su estado de carga y los elementos ya cargados no se mueven.

### Carga de rutas

- Las páginas con carga diferida usan un `Suspense` cuyo fallback es el skeleton del layout (navegación visible y contenido en skeleton), nunca una pantalla en blanco.

## 4. Vacío

Hay tres tipos de vacío, y cada uno se comunica distinto:

| Tipo                           | Ejemplo                            | Qué mostrar                                                                                            |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Primer uso**                 | El grupo aún no tiene canvas       | Qué es esto en 1 o 2 frases, por qué importa y una acción principal (solo si el usuario tiene permiso) |
| **Sin resultados**             | Un filtro que no coincide con nada | "No hay resultados para estos filtros" y un botón "Limpiar filtros"                                    |
| **Vacío sin permiso de crear** | Un Lector en un grupo sin canvas   | La misma explicación del primer uso, sin acción, con "Pídele a un administrador que cree el primero"   |

```tsx
// packages/ui/src/molecules/EmptyState/EmptyState.types.ts
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string; // qué está vacío, en positivo: "Todavía no hay hipótesis"
  description?: string; // por qué importa o qué hacer
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}
```

- El vacío de primer uso es una oportunidad de enseñar el método: explica el siguiente paso del recorrido (canvas → hipótesis → experimentos → aprendizajes).
- Nunca se muestra solo "No hay datos".

## 5. Error

### Qué mostrar según el código

| `error.code`                                 | Dónde                                                 | Qué ve el usuario                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NETWORK_ERROR`                              | En el componente + banner global                      | "No hay conexión. Revisa tu internet." con reintento. Se reintenta solo al volver la conexión.                               |
| `UNAUTHENTICATED`                            | Global (`apiClient`)                                  | Nada si la renovación de sesión funciona; si no, va al login y vuelve después a la misma página.                             |
| `FORBIDDEN`                                  | Página → `ForbiddenPage` · Acción → toast             | "No tienes permisos para esto en [grupo]. Tu rol es [rol]." Se recargan los permisos.                                        |
| `NOT_FOUND`                                  | Página → `NotFoundPage` · Elemento → mensaje en línea | "No encontramos lo que buscas." con un enlace al inicio. Si es de otro grupo del usuario, se ofrece cambiar de grupo.        |
| `WORKSPACE_NOT_FOUND`                        | Global                                                | Cambia al último grupo válido o a la bienvenida, con aviso.                                                                  |
| `VALIDATION_ERROR`                           | En cada campo del formulario                          | El mensaje de `fields` debajo de cada campo; foco en el primer campo con error.                                              |
| `EDIT_CONFLICT`                              | `CardConflictDialog`                                  | Las dos versiones lado a lado para elegir cuál conservar.                                                                    |
| `PLAN_LIMIT_REACHED` / `FEATURE_NOT_IN_PLAN` | `LimitReachedDialog` (global)                         | Qué límite se alcanzó, uso y máximo, "Ver planes" para quien gestiona el plan o "Habla con un administrador" para los demás. |
| `DOMAIN_RULE_VIOLATION` / `CONFLICT`         | Junto a la acción                                     | `error.message`, que el backend ya escribe en español para el usuario.                                                       |
| `RATE_LIMITED`                               | Toast                                                 | "Vas muy rápido. Espera un momento e inténtalo de nuevo."                                                                    |
| `SERVICE_UNAVAILABLE`                        | En el componente                                      | "Este servicio no está disponible ahora. Inténtalo en unos minutos." Lo demás sigue funcionando.                             |
| `INTERNAL_ERROR` u otro                      | En el componente                                      | "Algo salió mal." con reintento y "Código de referencia: [requestId]".                                                       |

### El componente `ErrorState`

`ErrorState` vive en `packages/ui`, así que **no conoce `ApiError` ni los códigos del API**: solo recibe textos ya decididos. La traducción de código a texto la hace `describeError` en `apps/web`.

```tsx
// packages/ui/src/molecules/ErrorState/ErrorState.types.ts
interface ErrorStateProps {
  title: string;
  description?: string;
  requestId?: string; // se muestra como "Código de referencia"
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: 'page' | 'section' | 'inline'; // tamaño según dónde ocurre
}
```

```typescript
// apps/web/src/lib/describeError.ts
export function describeError(
  error: ApiError,
): Pick<ErrorStateProps, 'title' | 'description' | 'requestId'> {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return { title: 'No hay conexión', description: 'Revisa tu internet.' };
    case 'SERVICE_UNAVAILABLE':
      return {
        title: 'Este servicio no está disponible ahora',
        description: 'Inténtalo en unos minutos.',
      };
    // … resto de la tabla anterior
    default:
      return { title: 'Algo salió mal', requestId: error.requestId };
  }
}
```

- `describeError` decide el texto según `error.code` con la tabla anterior. Nunca devuelve el mensaje técnico de un error inesperado.
- Se incluye el `requestId` en los errores inesperados, para poder buscarlo en los logs.
- El botón "Reintentar" muestra su propio estado de carga mientras reintenta.

### Errores aislados

- En un panel con varios widgets (fase 009), si uno falla, solo ese widget muestra su error. El resto sigue visible.
- Cada ruta tiene un error boundary; un error de renderizado muestra `ErrorState` dentro del layout, no una pantalla blanca.

## 6. Acciones del usuario

### Mientras se ejecuta

- El botón muestra `isLoading` (spinner + texto, sin cambiar de tamaño) y queda deshabilitado para evitar el doble envío.
- Si la acción tarda más de 10 segundos, el texto cambia a algo como "Esto está tardando más de lo normal…".
- Las acciones destructivas piden confirmación antes. Las irreversibles piden escribir el nombre del recurso.

### Al terminar

| Tipo de acción                                                       | Retroalimentación                                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| El resultado se ve en pantalla (crear una tarjeta, editar un nombre) | Ninguna adicional; el cambio visible basta.                                                                            |
| El resultado no se ve (enviar una invitación, cambiar la contraseña) | Toast de éxito: "Invitación enviada a ana@correo.com".                                                                 |
| Archivar, retirar o eliminar algo recuperable                        | Toast con "Deshacer" durante 8 segundos, si la operación lo permite.                                                   |
| Guardado automático                                                  | Nunca un toast; solo el indicador de guardado.                                                                         |
| Error                                                                | Toast o mensaje en línea según la tabla de la sección 5. Los toasts de error no desaparecen solos antes de 8 segundos. |

- Los toasts de éxito duran 4 segundos, se pueden cerrar y no se acumulan más de 3.

## 7. Guardado automático

Se usa en los editores donde el usuario escribe de forma continua (tarjetas del canvas, notas de evidencia).

```
          escribe            pasa 800 ms            responde OK
  Guardado ───────▶ Pendiente ──────────▶ Guardando ──────────▶ Guardado
                                   │            │
                         sin red   │            │ error
                                   ▼            ▼
                     Sin conexión (cola)   Error al guardar ── reintentar ──▶ Guardando
                                   │
                         vuelve la red ──▶ Guardando
```

- `SaveStatusIndicator` muestra: "Guardado", "Guardando…", "Sin conexión: tus cambios se guardarán al reconectar" o "No se pudo guardar · Reintentar". Usa `aria-live="polite"`.
- Debounce de 800 ms desde la última tecla, y guardado inmediato al salir del campo.
- Si hay cambios pendientes o sin conexión, se avisa antes de cerrar o salir de la página.
- Lo escrito nunca se borra por un error. Si el guardado falla, el texto queda en pantalla y se reintenta.
- Si el servidor responde `EDIT_CONFLICT`, se abre el diálogo de conflicto sin perder lo que escribió el usuario.

## 8. Actualización optimista

Para acciones rápidas y frecuentes donde esperar al servidor se siente lento: marcar una tarjeta como supuesto, completar una tarea o reordenar tarjetas.

```typescript
export function useToggleAssumption(canvasId: string) {
  const ws = useActiveWorkspaceId();
  const qc = useQueryClient();
  const key = canvasKeys.detail(ws, canvasId);

  return useMutation({
    mutationFn: ({ cardId, value }: { cardId: string; value: boolean }) =>
      canvasService.updateCard(cardId, { isAssumption: value }),
    onMutate: async ({ cardId, value }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Canvas>(key);
      qc.setQueryData<Canvas>(key, (c) => c && setCardAssumption(c, cardId, value));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous); // revertir
      toast.error('No pudimos guardar el cambio. Inténtalo de nuevo.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

- No se usa actualización optimista en acciones que dependen de reglas del servidor que pueden fallar a menudo (límites de plan, permisos) ni en pagos.

## 9. Solo lectura y no disponible

Cuando algo no se puede editar o usar, el usuario siempre debe saber **por qué**:

| Motivo                                | Cómo se muestra                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Sin permiso (rol Lector)              | Los controles de edición no aparecen. Una etiqueta discreta "Solo lectura · Tu rol es Lector" cerca del título. |
| Canvas archivado                      | Aviso arriba: "Este canvas está archivado" con "Restaurar" (si tiene permiso).                                  |
| Excede el límite del plan (fase 011)  | Aviso arriba: "Este canvas está en solo lectura porque tu plan permite 1 canvas activo" con las opciones.       |
| Funcionalidad no incluida en el plan  | El control aparece con un distintivo (por ejemplo, "Pro") y, al usarlo, abre el diálogo de límite.              |
| Botón deshabilitado por una condición | Un tooltip o un texto de ayuda explica la condición: "Agrega al menos una tarjeta para completar el bloque".    |

## 10. Procesos largos (IA, exportación)

- Al iniciar, el botón pasa a "Analizando…" y aparece un panel de progreso con mensajes sobrios que cambian cada pocos segundos ("Leyendo tu canvas", "Revisando cada bloque").
- El usuario puede seguir usando la plataforma mientras tanto. Si sale de la pantalla, el resultado queda disponible al volver y se le avisa con una notificación.
- Si tarda más de 30 segundos, se indica que está tardando más de lo normal y que el resultado aparecerá cuando esté listo.
- Si falla, se muestra el mensaje de servicio no disponible, se aclara que no se consumió uso del plan, y la guía predefinida sigue a mano.
- Un resultado guardado cuyo contenido ya cambió se muestra con la etiqueta "Desactualizado" y la opción de generar uno nuevo.

## 11. Sin conexión

- Un banner global aparece cuando el navegador pierde la conexión ("Sin conexión. Algunos cambios se guardarán cuando vuelvas a conectarte.") y desaparece al volver.
- Al recuperar la conexión, react-query vuelve a pedir las consultas activas y la cola de guardado automático se envía.

## 12. Storybook: una historia por estado

Toda vista y todo componente de datos tiene una historia por cada estado obligatorio de la sección 1. Ejemplo:

```tsx
// CanvasListView.stories.tsx
const meta = {
  component: CanvasListView,
  args: { canCreate: true, onRetry: fn(), onCreate: fn(), onOpen: fn() },
};
export default meta;

export const Loading = { args: { state: { status: 'loading' } } };
export const Empty = { args: { state: { status: 'empty' } } };
export const EmptyWithoutPermission = { args: { state: { status: 'empty' }, canCreate: false } };
export const Error = {
  args: { state: { status: 'error', error: mockApiError('INTERNAL_ERROR') } },
};
export const NetworkError = {
  args: { state: { status: 'error', error: mockApiError('NETWORK_ERROR') } },
};
export const WithData = {
  args: { state: { status: 'success', data: mockCanvasPage(6), isRefreshing: false } },
};
export const Refreshing = {
  args: { state: { status: 'success', data: mockCanvasPage(6), isRefreshing: true } },
};
export const LongContent = {
  args: {
    state: { status: 'success', data: mockCanvasPage(2, { longNames: true }), isRefreshing: false },
  },
};
```

Los generadores de datos de ejemplo (`mockApiError`, `mockCanvasPage`) viven en `apps/web/test/mocks/` y se comparten entre Storybook y las pruebas.

## 13. Pruebas de estados

- Cada vista tiene una prueba por estado que verifica lo esencial: el skeleton tiene `aria-busy`, el vacío muestra su acción solo con permiso, el error muestra "Reintentar" y llama a `onRetry`.
- Las pruebas de integración con MSW cubren al menos: éxito, error del servidor, lista vacía y, en editores, conflicto de edición.

## 14. Checklist de estados (copiar en cada tarea de UI)

- [ ] Skeleton con la forma del contenido final, con retraso anti-parpadeo
- [ ] Vacío de primer uso con explicación y acción según el permiso
- [ ] Sin resultados por filtro, con "Limpiar filtros" (si hay filtros)
- [ ] Error con mensaje según el código y "Reintentar"
- [ ] Recargas sin volver al skeleton; datos conservados si la recarga falla
- [ ] Botones con estado de carga y sin doble envío
- [ ] Retroalimentación de éxito adecuada (visible, toast o ninguna)
- [ ] Solo lectura o no disponible con su motivo explicado
- [ ] `aria-busy`, `aria-live` y foco gestionados
- [ ] Una historia de Storybook por estado
- [ ] Una prueba por estado
