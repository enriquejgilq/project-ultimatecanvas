# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ucanvas/shared build
RUN pnpm --filter @ucanvas/api build
RUN pnpm deploy --filter @ucanvas/api --prod /app/deploy

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
