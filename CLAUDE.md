# project-ultimatecanvas

Monorepo pnpm + Turborepo.

## Estructura
- apps/api    → NestJS + Swagger
- apps/web    → React + Vite + TypeScript
- packages/ui → design system (Atomic Design) + Storybook. Única fuente de componentes visuales.
- packages/shared → tipos, schemas zod y constantes compartidos entre api y web
- packages/tsconfig, packages/eslint-config → configuración base

## Reglas no negociables
- Todo componente visual reutilizable vive en packages/ui, NUNCA en apps/web/src/components.
- apps/web solo contiene features/, pages/, hooks/, lib/, utils/, routes/.
- packages/ui no importa nada de apps/*. No hace fetch, no conoce el API.
- Cero colores hardcodeados: todo sale de design tokens (CSS variables).
- Tipos compartidos entre api y web viven en packages/shared. Nunca se duplican.
- Nada de secretos en el front: solo variables VITE_*.
- Commits en formato Conventional Commits.

## Comandos
- pnpm dev / build / lint / typecheck / test desde la raíz
- pnpm --filter @ucanvas/ui storybook
