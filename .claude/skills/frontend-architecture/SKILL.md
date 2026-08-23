---
name: frontend-architecture
description: >
  Organize and build React frontends with Atomic Design, reusable components, and a scalable
  folder structure. Use this skill whenever the user wants to: structure or reorganize a React/Vite
  project, apply Atomic Design (atoms, molecules, organisms, templates, pages), create reusable UI
  components, define component conventions (props, variants, barrel exports), set up a design-system
  layer inside an app or monorepo, or decide where a new component/hook/service should live.
  Also trigger when the user mentions: atomic design, component library, "componentes reutilizables",
  UI architecture, feature folders, "organizar el frontend", or asks to create any new React
  component in a project that follows (or should follow) this structure. Works standalone or on top
  of a monorepo created with the monorepo-scaffold skill (apply it inside apps/web).
---

# Frontend Architecture Skill (Atomic Design + Reusable Components)

Structure React + Vite + TypeScript frontends so components are reusable, features are isolated, and every file has one obvious home. Combines **Atomic Design** for the UI layer with **feature folders** for business logic.

Two jobs:
1. **Scaffold/reorganize** a frontend to this structure.
2. **Place and build new code correctly** — when the user asks for any component, hook, or page in a project using this structure, follow these rules.

## The structure

Inside `src/` (in a monorepo, this is `apps/web/src/`):

```
src/
├── components/               # UI PURA y reutilizable (Atomic Design) — sin lógica de negocio
│   ├── atoms/                # Button, Input, Label, Icon, Spinner, Badge, Avatar
│   │   └── Button/
│   │       ├── Button.tsx
│   │       ├── Button.types.ts
│   │       ├── Button.test.tsx
│   │       └── index.ts      # barrel: export * from './Button'
│   ├── molecules/            # FormField (Label+Input+Error), SearchBar, Card, MenuItem
│   ├── organisms/            # Navbar, Sidebar, DataTable, LoginForm (estructura, no negocio)
│   └── templates/            # Layouts de página: DashboardLayout, AuthLayout
├── features/                 # LÓGICA DE NEGOCIO por dominio (espeja los módulos del API)
│   └── users/
│       ├── components/       # Componentes que SOLO usa esta feature (UserCard, UserFilters)
│       ├── hooks/            # useUsers, useCreateUser (react-query aquí)
│       ├── services/         # users.service.ts — llamadas al API de este dominio
│       ├── types/            # tipos propios de la feature (los compartidos van a packages/shared)
│       └── index.ts          # API pública de la feature
├── pages/                    # 1 componente por ruta; solo compone templates + features
│   └── UsersPage.tsx
├── hooks/                    # Hooks genéricos reutilizables: useDebounce, useLocalStorage
├── lib/                      # Configuración de librerías: apiClient, queryClient, router
├── styles/                   # Tokens de diseño: colores, espaciado, tipografía (CSS vars o theme)
├── utils/                    # Funciones puras: formatDate, formatCurrency
└── App.tsx / main.tsx / routes/
```

## Placement decision tree (use this every time a component is requested)

1. **Does it contain business/domain logic or fetch data?** → `features/<domain>/components/`
2. **Is it pure UI usable in any project?**
   - Un solo elemento visual indivisible → `atoms/`
   - Combina 2–3 atoms con un propósito → `molecules/`
   - Sección completa de UI (combina molecules/atoms) → `organisms/`
   - Define la disposición de una página (slots/children) → `templates/`
3. **Is it a route?** → `pages/` (compone template + organisms + features; casi sin lógica propia)
4. **A component used by 2+ features?** → promote it: strip business logic, move to `components/`, inject data via props.

**Import rules (enforce strictly):**
- `components/` NUNCA importa de `features/`, `pages/`, ni `services/`. Solo recibe datos por props.
- Atoms no importan molecules; molecules no importan organisms (solo hacia abajo).
- `features/A` no importa de `features/B` — lo compartido se promueve a `components/`, `hooks/` o `packages/shared`.
- `pages/` puede importar de todo; nadie importa de `pages/`.

## Reusable component conventions

Every component in `components/` must follow these rules (see `references/component-patterns.md` for full code examples):

1. **Own folder + barrel**: `Button/Button.tsx` + `index.ts`. Imports quedan limpios: `import { Button } from '@/components/atoms'`.
2. **Typed props with variants, not booleans que explotan**:
   ```typescript
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
     size?: 'sm' | 'md' | 'lg';
     isLoading?: boolean;
   }
   ```
3. **Extiende los atributos nativos** (`ButtonHTMLAttributes`, `InputHTMLAttributes`) y haz spread de `...rest` para no reinventar `onClick`, `disabled`, `aria-*`.
4. **Composición sobre configuración**: prefiere `children` y subcomponentes (`Card.Header`, `Card.Body`) antes que 15 props.
5. **Sin fetching ni estado global adentro** — datos entran por props, eventos salen por callbacks (`onSubmit`, `onChange`).
6. **Design tokens, no valores mágicos**: colores/espaciados vienen de `styles/tokens` (CSS variables o theme de Tailwind), nunca hex hardcodeados en el componente.
7. **forwardRef** en atoms interactivos (inputs, buttons) para que funcionen con librerías de formularios.
8. **Estados completos**: todo componente con datos maneja loading / empty / error, y todo interactivo tiene estados hover / focus-visible / disabled.

## Path aliases

Configure in `vite.config.ts` + `tsconfig.json`:

```
@/components → src/components    @/features → src/features
@/hooks      → src/hooks         @/lib      → src/lib
@/pages      → src/pages         @/utils    → src/utils
```

## Data layer conventions

- `lib/apiClient.ts`: cliente HTTP único (fetch o axios) con baseURL de `VITE_API_URL`, manejo de auth header y normalización de errores. Nadie más hace `fetch` directo.
- Cada feature tiene su `*.service.ts` que usa `apiClient` — los componentes nunca llaman al API directo, siempre vía hooks (`useUsers()` → service → apiClient).
- Con react-query (recomendado): hooks de query/mutation viven en `features/<domain>/hooks/`, keys centralizadas por feature.
- Tipos de request/response compartidos con el backend → `packages/shared` en monorepo; si no hay monorepo, `features/<domain>/types`.

## Scaffolding workflow

When asked to set up or reorganize a project:

1. Detect context: ¿monorepo (aplicar en `apps/web/src`) o proyecto suelto? ¿Tailwind, CSS modules, styled-components? Respeta lo que ya use; Tailwind + CSS variables como default si no hay nada.
2. Create the folder tree + path aliases.
3. Seed a **starter kit** de componentes reutilizables (cada uno completo con types, barrel y variantes):
   - Atoms: `Button`, `Input`, `Label`, `Spinner`, `Badge`
   - Molecules: `FormField`, `Card`, `SearchBar`
   - Organisms: `Navbar`, `DataTable` (genérico con render props/columns)
   - Templates: `MainLayout` (navbar + sidebar + content)
4. Create `styles/tokens.css` (o theme) con colores, espaciado, radios y tipografía como CSS variables.
5. Create one example feature (`features/example` o el dominio real si se conoce) mostrando el patrón completo: service → hook → componente de feature → página.
6. Add `README.md` en `src/` documentando el árbol de decisión y las reglas de imports para el equipo.
7. Si el proyecto ya tiene componentes, migra: clasifica cada uno con el árbol de decisión, mueve, y arregla imports. Nunca borres lógica al mover.

## Quality checklist

- [ ] Every component in its own folder with barrel export
- [ ] No business logic or fetching inside `components/`
- [ ] Import direction respected (atoms ← molecules ← organisms; features isolated)
- [ ] Variants tipadas con union types, no strings sueltos
- [ ] Design tokens en uso — cero colores hardcodeados
- [ ] Path aliases funcionando en Vite y TS
- [ ] Feature de ejemplo completa (service → hook → component → page)
- [ ] Loading/empty/error contemplados en componentes de datos
