# Checklist de una feature terminada

> Una feature, un módulo o una tarea de Spec Kit no se da por terminada hasta cumplir todo lo que le aplique. Claude Code debe revisar esta lista antes de reportar una tarea como completa, y `/speckit-converge` debe tenerla en cuenta.

## Backend (`apps/api`) — ver `backend.md`

**Arquitectura**

- [ ] El módulo tiene sus capas `presentation/`, `application/`, `domain/` e `infrastructure/`.
- [ ] El dominio es TypeScript plano y las reglas de negocio viven en métodos de las entidades.
- [ ] Los servicios no importan Prisma ni lanzan `HttpException`; solo lanzan `DomainError`.
- [ ] Los controladores solo validan, extraen el contexto, llaman al servicio y devuelven una clase `*Response`.
- [ ] Cada repositorio y servicio externo está detrás de un puerto con token, y tiene su fake `InMemory*`.
- [ ] No hay imports de archivos internos de otros módulos; la comunicación es por servicios exportados o eventos.

**Seguridad y grupos**

- [ ] Toda consulta a datos de grupo filtra por `workspaceId`.
- [ ] Toda ruta de grupo tiene `@RequirePermission` (o `@NoPermissionRequired` explícito).
- [ ] Los permisos nuevos están en `packages/shared/src/permissions.ts` y asignados a los roles.
- [ ] Los recursos con límite de plan pasan por `EntitlementsService` dentro de la transacción.
- [ ] Los recursos de otro grupo responden 404, no 403.

**Contrato**

- [ ] Las respuestas siguen `{ success, data, error, meta }` y los errores usan códigos del catálogo.
- [ ] Los DTOs están validados y documentados en Swagger, igual que cada ruta y su respuesta.
- [ ] Los esquemas compartidos con el frontend están en `packages/shared`.

**Pruebas**

- [ ] Unitarias de las entidades y de los casos de uso (con fakes).
- [ ] e2e del flujo principal de la spec.
- [ ] e2e de aislamiento: un miembro del grupo A no lee ni modifica datos del grupo B.
- [ ] e2e de permisos: cada rol puede exactamente lo que dice la tabla.

## Frontend (`apps/web`) — ver `frontend.md` y `estados-ui.md`

**Arquitectura**

- [ ] Los componentes están en el lugar correcto según el árbol de decisión: UI reutilizable en `packages/ui` (con historias), nada en `apps/web/src/components/`.
- [ ] Se respetan las reglas de importación (el lint pasa sin excepciones).
- [ ] Las features siguen la cadena componente → hook → servicio → `apiClient`.
- [ ] Las vistas de datos usan el patrón contenedor + vista con `ViewState`.
- [ ] Las query keys de datos de grupo incluyen `workspaceId`.

**Estados**

- [ ] Todos los estados obligatorios de `estados-ui.md` (sección 1) están implementados.
- [ ] Cada estado tiene su historia en Storybook y su prueba.

**Permisos y plan**

- [ ] Las acciones sin permiso no aparecen, y las rutas protegidas usan `PermissionRoute`.
- [ ] Las funcionalidades limitadas por el plan muestran el diálogo de límite al usarse.

**Calidad visual y accesibilidad**

- [ ] Solo tokens de diseño; modo claro y oscuro funcionan.
- [ ] Los fallbacks de transparencia reducida y sin `backdrop-filter` funcionan.
- [ ] Se puede usar con teclado, con foco visible y contraste de al menos 4.5:1.
- [ ] Funciona en pantallas de 375 px de ancho sin desplazamiento horizontal de la página.
- [ ] Textos en español, de "tú", con errores que dicen qué pasó y qué hacer.

## General

- [ ] Se cumplen todos los criterios de aceptación de las historias P1 de la spec.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pasa desde la raíz.
- [ ] Sin `any`, `@ts-ignore`, `eslint-disable` ni `console.log` sin justificar.
- [ ] Las migraciones de base de datos están creadas y tienen nombres descriptivos.
- [ ] `specs/<fase>/tasks.md` refleja el estado real de las tareas y las decisiones nuevas quedaron en la spec o el plan de la fase.
