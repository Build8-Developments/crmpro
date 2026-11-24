# The platform admin app image (docs/infrastructure/deployment-plan.md §4): Next.js standalone
# server. It has no environment-specific build values, so one image serves every environment.
# Build from the repository root: docker build -f apps/admin/Dockerfile -t crmpro-admin .
FROM node:24-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /repo

FROM base AS build
COPY . .
# pnpm's store and metadata cache survive between builds on the same machine; long timeouts so a
# slow registry doesn't fail the build.
ENV pnpm_config_fetch_timeout=600000 pnpm_config_fetch_retries=5 \
    npm_config_fetch_timeout=600000 npm_config_fetch_retries=5
# The browser calls the admin API and its socket on its own host; the project Caddy routes them.
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_API_URL=/api/v1 API_PROXY_TARGET=http://admin-api:3100
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --filter "admin..." \
  && pnpm --filter @crmpro/shared build \
  && pnpm --filter admin build

FROM node:24-trixie-slim AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3002 \
    API_PROXY_TARGET=http://admin-api:3100
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3002/favicon.ico').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "apps/admin/server.js"]
