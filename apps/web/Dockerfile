# The tenant web app image (docs/infrastructure/deployment-plan.md §4): Next.js standalone server.
# NEXT_PUBLIC_* values are baked in at build time, so this image is built per environment and
# tagged <tree>-<environment>.
# Build from the repository root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE='https://{slug}-staging.nomow.app' \
#     --build-arg NEXT_PUBLIC_APEX_URL=https://staging.nomow.app -t crmpro-web .
FROM node:24-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /repo

FROM base AS build
COPY . .
# pnpm's store and metadata cache survive between builds on the same machine; long timeouts so a
# slow registry doesn't fail the build.
ENV pnpm_config_fetch_timeout=600000 pnpm_config_fetch_retries=5 \
    npm_config_fetch_timeout=600000 npm_config_fetch_retries=5
ARG NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE
ARG NEXT_PUBLIC_APEX_URL
# The browser calls the API and the socket on its own host; the project Caddy routes /api/* and
# /socket.io/* to the api container. API_PROXY_TARGET is only for server-side calls.
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_API_URL=/api/v1 API_PROXY_TARGET=http://api:3000 \
    NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE=$NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE \
    NEXT_PUBLIC_APEX_URL=$NEXT_PUBLIC_APEX_URL
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    test -n "$NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE" && test -n "$NEXT_PUBLIC_APEX_URL" \
  && pnpm install --frozen-lockfile --filter "web..." \
  && pnpm --filter @crmpro/shared build \
  && pnpm --filter web build

FROM node:24-trixie-slim AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3001 \
    API_PROXY_TARGET=http://api:3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/favicon.ico').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "apps/web/server.js"]
