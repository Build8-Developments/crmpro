# The tenant API image (docs/infrastructure/deployment-plan.md §4). The same image runs the
# one-shot `tools` service at deploy time (prisma migrate deploy, the demo seed), so it keeps the
# database package's dev tools (prisma CLI, ts-node).
# Build from the repository root: docker build -f apps/api/Dockerfile -t crmpro-api .
FROM node:24-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /repo

FROM base AS build
COPY . .
# pnpm's store and metadata cache survive between builds on the same machine; long timeouts so a
# slow registry doesn't fail the build.
ENV pnpm_config_fetch_timeout=600000 pnpm_config_fetch_retries=5 \
    npm_config_fetch_timeout=600000 npm_config_fetch_retries=5
# prebuild builds @crmpro/database (Prisma client) and @crmpro/shared first.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --filter "api..." \
  && pnpm --filter api build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
