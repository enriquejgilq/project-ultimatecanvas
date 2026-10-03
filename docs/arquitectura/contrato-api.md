# Contrato del API

> Reglas que comparten el backend (`apps/api`) y el frontend (`apps/web`). Si una regla de este archivo cambia, se cambia en los dos lados en el mismo commit.
> Los tipos y esquemas de este contrato viven en `packages/shared`.

---

## 1. URLs y recursos

- Prefijo y versión: todas las rutas van bajo `/api/v1`.
- Recursos en plural y en kebab-case: `/canvases`, `/experiment-types`, `/me/email-change`.
- Recursos anidados solo un nivel cuando el hijo no tiene sentido sin el padre: `/canvases/:id/versions`. Para operar sobre el hijo se usa su propia ruta: `/versions/:id`.
- Acciones que no son CRUD se expresan como sub-recurso con `POST`: `POST /canvases/:id/archive`, `POST /experiments/:id/conclude`.
- IDs: UUID en todas las entidades. Nunca se exponen IDs autoincrementales.

| Método   | Uso                         | Respuesta exitosa                 |
| -------- | --------------------------- | --------------------------------- |
| `GET`    | Leer                        | `200`                             |
| `POST`   | Crear o ejecutar una acción | `201` al crear, `200` en acciones |
| `PATCH`  | Actualizar parcialmente     | `200` con el recurso actualizado  |
| `DELETE` | Eliminar                    | `200` con `data: null`            |

No se usa `PUT`. Toda actualización es parcial con `PATCH`.

## 2. Headers

| Header                          | Dirección          | Uso                                                                                                 |
| ------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| `Authorization: Bearer <token>` | request            | Token de acceso (fase 002).                                                                         |
| `X-Workspace-Id: <uuid>`        | request            | Grupo activo (fase 004). Obligatorio en toda ruta de datos de grupo.                                |
| `X-Request-Id: <uuid>`          | request y response | Correlación de logs. El cliente puede enviarlo; si no, el servidor lo genera y siempre lo devuelve. |

## 3. Forma de la respuesta

> **Estado actual:** hoy el tipo está en `packages/shared/src/types/api-response.ts`, `error` puede ser un string o un objeto (`{ code, message, rules? }` en auth) y `meta` no lleva `requestId`. La forma de esta sección es el objetivo: los módulos nuevos la siguen, y el tipo se mueve a `packages/shared/src/api/response.ts` junto con `error-codes.ts` en el mismo refactor que migra los errores de `auth` (ver `backend.md` §5). El `ApiError` de `apps/web/src/lib/apiClient.ts` cambia en ese mismo commit.

Toda respuesta, exitosa o con error, tiene la misma forma:

```typescript
// packages/shared/src/api/response.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  meta: ApiMeta | null;
}

export interface ApiErrorBody {
  code: ErrorCode; // estable, en MAYÚSCULAS_CON_GUION_BAJO
  message: string; // en español, apto para mostrar al usuario
  fields?: Record<string, string[]>; // solo en errores de validación
  details?: Record<string, unknown>; // datos extra (por ejemplo, límite y uso)
}

export interface ApiMeta {
  requestId: string;
  pagination?: PageMeta | CursorMeta;
}
```

> **Diferencia con la skill `monorepo-scaffold`:** la skill define `error` como un string. En este proyecto `error` es un objeto con `code`, porque el frontend decide qué estado de UI mostrar según el código, no según el texto.

Ejemplos:

```json
{
  "success": true,
  "data": { "id": "…", "name": "Mi idea" },
  "error": null,
  "meta": { "requestId": "…" }
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "Tu grupo alcanzó el máximo de canvas activos de su plan.",
    "details": { "limitKey": "canvas.active", "used": 1, "max": 1 }
  },
  "meta": { "requestId": "…" }
}
```

## 4. Catálogo de códigos de error

El catálogo vive en `packages/shared/src/api/error-codes.ts`. Un código nuevo se agrega ahí antes de usarlo, en el backend o en el frontend.

| HTTP | `code`                  | Cuándo                                                             | Qué hace el frontend                                            |
| ---- | ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`      | DTO inválido o campos no permitidos                                | Muestra los errores en sus campos (`fields`)                    |
| 401  | `UNAUTHENTICATED`       | Sin sesión o token vencido                                         | El `apiClient` intenta renovar la sesión; si falla, va al login |
| 403  | `FORBIDDEN`             | Sin el permiso requerido en el grupo activo                        | Página o mensaje de "No tienes permisos"                        |
| 403  | `AI_DISABLED`           | IA desactivada en el grupo                                         | Oculta las acciones de IA y explica por qué                     |
| 404  | `NOT_FOUND`             | El recurso no existe **o pertenece a otro grupo**                  | Página o mensaje de "No encontrado"                             |
| 404  | `WORKSPACE_NOT_FOUND`   | El grupo no existe o el usuario no es miembro                      | Cambia a otro grupo o va a la bienvenida                        |
| 409  | `CONFLICT`              | Conflicto de estado de dominio (transición inválida)               | Mensaje con el motivo                                           |
| 409  | `EDIT_CONFLICT`         | Edición concurrente (la versión no coincide)                       | Diálogo para elegir qué versión conservar                       |
| 409  | `PLAN_LIMIT_REACHED`    | Límite del plan alcanzado                                          | Diálogo de límite con "Ver planes"                              |
| 409  | `FEATURE_NOT_IN_PLAN`   | Funcionalidad no incluida en el plan                               | Diálogo de límite con "Ver planes"                              |
| 409  | `AI_CONSENT_REQUIRED`   | Falta la confirmación de primer uso de IA                          | Diálogo de consentimiento                                       |
| 422  | `DOMAIN_RULE_VIOLATION` | Regla de negocio incumplida (por ejemplo, el último administrador) | Mensaje con el motivo, junto a la acción                        |
| 429  | `RATE_LIMITED`          | Demasiadas peticiones                                              | Mensaje de "espera un momento"                                  |
| 503  | `SERVICE_UNAVAILABLE`   | Un servicio externo no responde (IA, correo, pagos)                | Mensaje amable y reintento                                      |
| 500  | `INTERNAL_ERROR`        | Error inesperado                                                   | Mensaje genérico con el `requestId`                             |

Reglas:

- `message` está siempre en español, se dirige al usuario de "tú" y nunca contiene detalles técnicos (consultas, rutas, trazas).
- Un recurso de otro grupo responde **siempre** `404 NOT_FOUND`, nunca `403`. Así no se revela que existe.
- Los códigos más específicos (`EDIT_CONFLICT`, `PLAN_LIMIT_REACHED`) se usan en lugar de los genéricos cuando aplican.

## 5. Paginación, filtros y orden

**Listas con paginación por páginas** (tablas y listas administrables):

```
GET /canvases?page=1&pageSize=20&sort=-updatedAt&status=ACTIVE
```

- `page` empieza en 1. `pageSize` vale 20 por defecto, con un máximo de 100.
- `sort`: nombre del campo, con `-` delante para orden descendente.
- Filtros como query params con el nombre del campo.
- `meta.pagination = { page, pageSize, total, totalPages }`.

**Feeds con paginación por cursor** (actividad, notificaciones, comentarios):

```
GET /notifications?limit=20&cursor=<opaco>
```

- `meta.pagination = { nextCursor: string | null }`.

## 6. Formatos de datos

- JSON siempre en camelCase.
- Fechas en ISO 8601 en UTC (`2026-09-27T14:05:00.000Z`). La conversión a la zona horaria del usuario se hace en el frontend, excepto en los correos programados.
- Montos de dinero en enteros de la unidad menor (centavos) junto con la moneda: `{ amountCents: 1990, currency: "USD" }`.
- Enums en MAYÚSCULAS: `ACTIVE`, `ARCHIVED`.
- Los campos opcionales vacíos se envían como `null`, no se omiten.

## 7. Concurrencia optimista

Los recursos que varios miembros pueden editar a la vez (tarjetas del canvas y otros que se definan) llevan un campo `version: number`.

- El cliente envía la `version` que tiene en cada `PATCH`.
- Si no coincide con la del servidor, la respuesta es `409 EDIT_CONFLICT` con `details.current` (el recurso actual).

## 8. Contrato compartido en `packages/shared`

```
packages/shared/src/
├── api/
│   ├── response.ts        # ApiResponse, ApiErrorBody, ApiMeta
│   └── error-codes.ts     # catálogo de códigos (const + type)
├── permissions.ts         # catálogo de permisos (fase 005)
├── limits.ts              # catálogo de límites (fase 006)
└── schemas/
    └── <dominio>.schema.ts   # esquemas zod de request/response por dominio
```

- Los esquemas zod de request se usan en los formularios del frontend. El backend valida con DTOs de class-validator equivalentes.
- Los tipos de response se infieren del esquema: `export type Canvas = z.infer<typeof canvasSchema>`.
- `packages/shared` no contiene lógica de servidor, secretos ni dependencias de NestJS o React.
