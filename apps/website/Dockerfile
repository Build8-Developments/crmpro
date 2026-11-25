# The public website image (nomow.app; docs/website/README.md, Deployment): a Next.js standalone
# server (pages, the demo-request server action, image optimisation, the locale redirect).
# NEXT_PUBLIC_* values are baked in at build time.
# Build from the repository root:
#   docker build -f apps/website/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://nomow.app \
#     --build-arg NEXT_PUBLIC_FIND_WORKSPACE_URL= -t crmpro-website .
FROM node:24-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /repo

FROM base AS build
COPY . .
ENV pnpm_config_fetch_timeout=600000 pnpm_config_fetch_retries=5 \
    npm_config_fetch_timeout=600000 npm_config_fetch_retries=5
ARG NEXT_PUBLIC_SITE_URL
# Empty hides "Sign in" (no production CRM yet); set it once production serves "find my workspace".
ARG NEXT_PUBLIC_FIND_WORKSPACE_URL=
ARG NEXT_PUBLIC_CONTACT_EMAIL=hello@nomow.app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_FIND_WORKSPACE_URL=$NEXT_PUBLIC_FIND_WORKSPACE_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-cache,target=/root/.cache/pnpm \
    test -n "$NEXT_PUBLIC_SITE_URL" \
  && pnpm install --frozen-lockfile --filter "website..." \
  && pnpm --filter @crmpro/shared build \
  && pnpm --filter website build

FROM node:24-trixie-slim AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3003
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/website/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/website/.next/static ./apps/website/.next/static
# The optimised-image cache (AVIF/WebP per size). Compose mounts a volume here so a redeploy
# doesn't re-encode every photo; created here so the volume starts out owned by node.
RUN mkdir -p apps/website/.next/cache && chown -R node:node apps/website/.next/cache
USER node
EXPOSE 3003
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3003/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "apps/website/server.js"]
