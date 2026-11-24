#!/usr/bin/env bash
# Deploy Nomow on a server (docs/infrastructure/deployment-plan.md §6), as the environment's
# project user. CI runs it through the server's forced command (/usr/local/sbin/rovlex-deploy-entry),
# which unpacks infra/compose + infra/deploy.sh into ~/app/releases/<tag> and calls:
#   ~/app/releases/<tag>/infra/deploy.sh <environment> <tag> [--local]
#
#   - images: pulled from GHCR with REGISTRY_TOKEN (CI passes its short-lived token), or already
#     on this server with --local (a rollback, or a local test)
#   - secrets: ~/secrets/<environment>.env (never in git, never in images)
#   - the project Caddy listens on ~/run/caddy.sock, which the shared host Caddy proxies to
#
# Rollback: run the deploy of an older release, e.g.
#   ~/app/releases/<older tag>/infra/deploy.sh staging <older tag> --local
set -euo pipefail

env=${1:?environment (staging | production)}
tag=${2:?image tag (git tree hash)}
[[ $env =~ ^(staging|production)$ ]] || { echo "unknown environment: $env" >&2; exit 2; }
[[ $tag =~ ^[0-9a-f]{7,64}$ ]] || { echo "bad tag: $tag" >&2; exit 2; }
local_images=""
case ${3:-} in
  --local) local_images=1 ;;
  "") ;;
  *) echo "unknown option: $3" >&2; exit 2 ;;
esac

infra=$(cd "$(dirname "$0")" && pwd)
settings=$infra/compose/$env.env
secrets=${SECRETS_FILE:-$HOME/secrets/$env.env}
[[ -r $secrets ]] || { echo "missing $secrets" >&2; exit 1; }
# The project's rootless Docker engine (a forced command gets no login environment).
if [[ -z ${DOCKER_HOST:-} && -S /run/user/$(id -u)/docker.sock ]]; then
  export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
fi
export TAG=$tag EDGE_SOCKET_DIR=${EDGE_SOCKET_DIR:-$HOME/run}
state=${STATE_DIR:-$HOME/app}
mkdir -p "$EDGE_SOCKET_DIR" "$state"
log() { printf '\n== %s\n' "$*"; }

files=(-f "$infra/compose/compose.yml" -f "$infra/compose/compose.$env.yml")
[[ -n ${COMPOSE_EXTRA:-} ]] && files+=(-f "$COMPOSE_EXTRA") # local test only
compose() {
  docker compose --project-directory "$infra/compose" "${files[@]}" \
    --env-file "$settings" --env-file "$secrets" "$@"
}
setting() { grep -hE "^$1=" "$settings" "$secrets" | tail -1 | cut -d= -f2-; }
# One-shot jobs in the api image. No stdin: `compose run` would otherwise read whatever is piped
# into this script (the forced command's stdin).
tool() { compose --profile tools run --rm -T tools "$@" </dev/null; }

compose config --quiet # fails early, naming any missing value

if [[ -n $local_images ]]; then
  log "Using the images already on this server ($tag)"
else
  log "Pulling images $tag"
  registry=$(setting IMAGE_PREFIX | cut -d/ -f1)
  if [[ -n ${REGISTRY_TOKEN:-} ]]; then
    printf '%s' "$REGISTRY_TOKEN" | docker login "$registry" -u deploy --password-stdin >/dev/null
  fi
  compose --profile tools pull --quiet
  [[ -n ${REGISTRY_TOKEN:-} ]] && docker logout "$registry" >/dev/null
fi

log "Starting data services"
compose up -d --wait postgres valkey

log "Migrating the database"
tool node_modules/.bin/prisma migrate deploy

# Staging is the sales demo: its first deploy loads the demo workspaces. Never again
# automatically, since the seed replaces the demo CRM data (to reset the demo on purpose, delete
# the marker and redeploy). Never on production.
if [[ $env == staging && ! -f $state/.seeded ]]; then
  log "First deploy: loading the demo data"
  tool node_modules/.bin/prisma db seed
  touch "$state/.seeded"
fi

log "Starting the apps"
compose up -d --wait --remove-orphans

log "Smoke tests (through the project Caddy)"
apex=$(setting APEX_URL)
apex=${apex#*://}
admin=$(setting ADMIN_HOST)
workspace=$(setting WORKSPACE_URL_TEMPLATE)
workspace=${workspace#*://}
workspace=${workspace//\{slug\}/$(setting SMOKE_WORKSPACE)}
if [[ -n ${SMOKE_URL:-} ]]; then # local test: Caddy on a TCP port
  via=(--connect-to "::${SMOKE_URL#*://}")
else
  via=(--unix-socket "$EDGE_SOCKET_DIR/caddy.sock")
fi
check() { # name host path expected-status
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${via[@]}" "http://$2$3" || true)
  printf '  %-4s %-26s %s %s\n' "$([[ $code == "$4" ]] && echo ok || echo FAIL)" "$1" "$code" "$2$3"
  [[ $code == "$4" ]]
}
failed=0
check "api health" "$apex" /api/v1/health 200 || failed=1
check "api internals hidden" "$apex" /api/v1/metrics 404 || failed=1
check "find my workspace" "$apex" / 200 || failed=1
check "workspace sign-in" "$workspace" /login 200 || failed=1
check "workspace lookup" "$workspace" "/api/v1/public/workspaces/$(setting SMOKE_WORKSPACE)" 200 || failed=1
check "admin app" "$admin" /login 200 || failed=1
check "admin api (signed out)" "$admin" /api/v1/auth/me 401 || failed=1

printf '%s %s %s %s\n' "$(date -u +%FT%TZ)" "$env" "$tag" "$([[ $failed == 0 ]] && echo ok || echo smoke-failed)" \
  >>"$state/releases.log"

# Keep the five newest releases, and only their images, so a rollback to any of them works
# without a pull and old images don't fill the disk. Images in use can't be removed anyway.
if [[ -d $HOME/app/releases ]]; then
  ls -1dt "$HOME"/app/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf
  kept=$(ls -1 "$HOME/app/releases")
  prefix=$(setting IMAGE_PREFIX)
  docker images --format '{{.Repository}}:{{.Tag}}' | grep -F "$prefix-" | while read -r image; do
    t=${image##*:}
    t=${t%-"$env"}
    grep -qxF "$t" <<<"$kept" || docker rmi "$image" >/dev/null 2>&1 || true
  done
  docker image prune -f >/dev/null
fi

[[ $failed == 0 ]] || { echo "smoke tests failed" >&2; exit 1; }
log "Deployed $env $tag"
