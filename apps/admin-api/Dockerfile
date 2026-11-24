# The platform admin API image (docs/infrastructure/deployment-plan.md §4).
# Build from the repository root: docker build -f apps/admin-api/Dockerfile -t crmpro-admin-api .
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
    pnpm install --frozen-lockfile --filter "admin-api..." \
  && pnpm --filter admin-api build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/admin-api
EXPOSE 3100
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3100/api/v1/auth/me').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
