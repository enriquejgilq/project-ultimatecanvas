# project-ultimatecanvas

Plataforma para que emprendedores reduzcan el riesgo de su idea antes de invertir: construyen su Lean Canvas con guía, convierten sus supuestos en hipótesis, las validan con experimentos y la plataforma los acompaña en el tiempo. La IA potencia el método, pero **nunca es un chatbot**.

Monorepo pnpm + Turborepo.

## Estructura

- apps/api → NestJS + Swagger, arquitectura hexagonal pragmática
- apps/web → React + Vite + TypeScript (features + páginas; consume `@ucanvas/ui`)
- packages/ui → design system (Atomic Design) + Storybook. Única fuente de componentes visuales.
- packages/shared → tipos, schemas zod, códigos de error y constantes compartidos entre api y web
- packages/tsconfig, packages/eslint-config → configuración base
- docs/arquitectura/ → guías obligatorias (abajo)
- .specify/memory/constitution.md → constitución del proyecto
- specs/<NNN-fase>/ → spec, plan, tareas y artefactos de cada fase (Spec Kit)

## Guías obligatorias

Antes de escribir o modificar código, lee las guías que correspondan y síguelas:

| Si trabajas en…                                 | Lee                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/api`                                      | `docs/arquitectura/backend.md` y `docs/arquitectura/contrato-api.md`                                     |
| `apps/web` o `packages/ui`                      | `docs/arquitectura/frontend.md`, `docs/arquitectura/estados-ui.md` y `docs/arquitectura/contrato-api.md` |
| `packages/shared`                               | `docs/arquitectura/contrato-api.md`                                                                      |
| Cualquier feature, antes de darla por terminada | `docs/arquitectura/checklist-feature.md`                                                                 |

Aplica también las skills `monorepo-scaffold`, `backend-architecture`, `frontend-architecture` y `liquid-glass-ui`. Si una skill y una guía de `docs/arquitectura/` se contradicen, manda la guía. Si una guía y la constitución se contradicen, manda la constitución.

## Reglas no negociables

- Todo componente visual reutilizable vive en packages/ui, NUNCA en apps/web/src/components.
- apps/web solo contiene features/, pages/, hooks/, lib/, utils/, routes/.
- packages/ui no importa nada de apps/*. No hace fetch, no conoce el API.
- Cero colores hardcodeados: todo sale de design tokens (CSS variables).
- Tipos compartidos entre api y web viven en packages/shared. Nunca se duplican.
- Nada de secretos en el front: solo variables VITE_*.
- Commits en formato Conventional Commits.
- Las dependencias del backend apuntan hacia el dominio. El dominio es TypeScript plano.
- Toda consulta a datos de grupo filtra por `workspaceId`. Un recurso de otro grupo responde 404.
- Toda ruta de grupo declara su permiso. Lo no declarado se niega.
- Todo recurso con límite de plan pasa por `EntitlementsService`.
- En el frontend, nadie llama al API fuera de `lib/apiClient.ts`, y los componentes usan hooks.
- Todo componente con datos implementa sus estados de carga, vacío y error, con historias en Storybook.
- La autorización real siempre está en el backend; ocultar en la UI es solo comodidad.
- Todo servicio externo (correo, almacenamiento, pagos, IA) va detrás de un puerto.
- La interfaz está en español y se dirige al usuario de "tú". El código y los commits, en inglés.
- No se construye nada que la spec de la fase actual no pida.

## Flujo de trabajo

- Las fases se implementan en orden con Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`.
- Al terminar una fase: revisa `docs/arquitectura/checklist-feature.md` y propón el mensaje del commit de la fase (Conventional Commits).
- Si una decisión no está en la spec, en la constitución ni en estas guías, pregunta antes de decidir.

## Comandos

- pnpm install — instalar dependencias
- pnpm dev / build / lint / typecheck / test desde la raíz
- Verificación completa antes de cerrar una tarea: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- pnpm --filter @ucanvas/ui storybook — catálogo de componentes
