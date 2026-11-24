#!/usr/bin/env bash
# Rehearse a staging deploy end to end on one machine (CI on every pull request, or a laptop):
# unpack the release the way the server's forced command does, deploy it with the real
# infra/deploy.sh, then sign in through the project Caddy the way a browser would.
#
#   infra/rehearsal/rehearse.sh <tag>
#
# Expects the images built locally as crmpro-local-{api,admin-api,admin}:<tag> and
# crmpro-local-web:<tag>-staging, the web image with
#   NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE=http://{slug}-staging.localhost:8080
#   NEXT_PUBLIC_APEX_URL=http://staging.localhost:8080
# Leaves the stack running for a look (http://staging.localhost:8080); remove it with
#   docker compose -p crmpro-staging down -v
set -euo pipefail

tag=${1:?image tag}
repo=$(cd "$(dirname "$0")/../.." && pwd)
work=${REHEARSAL_DIR:-$(mktemp -d)}
release=$work/app/releases/$tag
log() { printf '\n== %s\n' "$*"; }

log "Unpacking the release into $release"
mkdir -p "$release" "$work/secrets" "$work/run"
(cd "$repo" && tar -czf - infra/compose infra/deploy.sh) | tar -xzf - -C "$release" infra/compose infra/deploy.sh

# Local host names and Mailpit instead of the real ones. Appended: the last value wins, both for
# docker compose and for deploy.sh.
cat >>"$release/infra/compose/staging.env" <<'EOF'

# --- rehearsal ---
IMAGE_PREFIX=crmpro-local
APEX_URL=http://staging.localhost:8080
ADMIN_URL=http://admin-staging.localhost:8080
ADMIN_HOST=admin-staging.localhost
WORKSPACE_URL_TEMPLATE=http://{slug}-staging.localhost:8080
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
CADDY_BIND=0.0.0.0
EOF

secrets=$work/secrets/staging.env
printf '%s\n' R2_ACCOUNT_ID=rehearsal R2_ACCESS_KEY_ID=rehearsal R2_SECRET_ACCESS_KEY=rehearsal \
  RESEND_API_KEY=rehearsal SEED_ADMIN_EMAIL=platform-admin@nomow.test >"$secrets"
bash "$repo/infra/server/init-secrets.sh" "$secrets"
secret() { grep -E "^$1=" "$secrets" | tail -1 | cut -d= -f2-; }

deploy() {
  HOME=$work SECRETS_FILE=$secrets STATE_DIR=$work/app EDGE_SOCKET_DIR=$work/run \
    COMPOSE_EXTRA=$repo/infra/rehearsal/compose.rehearsal.yml SMOKE_URL=http://127.0.0.1:8080 \
    "$release/infra/deploy.sh" staging "$tag" --local
}

log "First deploy (migrations + demo seed)"
deploy

log "Second deploy of the same release (no seed, nothing breaks)"
deploy

log "Signing in through Caddy, as a browser would"
headers=$(mktemp)
body_file=$(mktemp)
cookie=""
request() { # method host path [json] → prints the status code; body in $body_file, headers in $headers
  local method=$1 host=$2 path=$3 data=${4:-}
  curl -s -o "$body_file" -D "$headers" -w '%{http_code}' --max-time 20 --connect-to "::127.0.0.1:8080" \
    -X "$method" -H "Origin: http://$host:8080" ${cookie:+-H "Cookie: $cookie"} \
    ${data:+-H 'Content-Type: application/json' --data "$data"} "http://$host:8080$path"
}
failed=0
expect() { # name expected actual
  printf '  %-4s %-52s %s\n' "$([[ $3 == "$2" ]] && echo ok || echo FAIL)" "$1" "$3"
  [[ $3 == "$2" ]] || { failed=1; head -c 400 "$body_file"; echo; }
}
ws=prime-estates-staging.localhost
other=sunrise-properties-staging.localhost
admin=admin-staging.localhost
user='{"tenantSlug":"prime-estates","email":"owner@primeestates.com","password":"'"$(secret SEED_USER_PASSWORD)"'"}'

expect "repo default password refused" 401 \
  "$(request POST "$ws" /api/v1/auth/login '{"tenantSlug":"prime-estates","email":"owner@primeestates.com","password":"Password123!"}')"
expect "owner signs in on its workspace host" 200 "$(request POST "$ws" /api/v1/auth/login "$user")"
token=$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write((b.data??b).accessToken??"")' "$body_file" 2>/dev/null || true)
set_cookie=$(tr -d '\r' <"$headers" | grep -i '^set-cookie:' | head -1)
expect "refresh cookie is HttpOnly, Secure, host-only" yes \
  "$(grep -qi 'httponly' <<<"$set_cookie" && grep -qi 'secure' <<<"$set_cookie" && ! grep -qi 'domain=' <<<"$set_cookie" && echo yes || echo no)"
cookie=$(sed -E 's/^[Ss]et-[Cc]ookie: *([^;]*).*/\1/' <<<"$set_cookie")
expect "session refreshes on the same host" 200 "$(request POST "$ws" /api/v1/auth/refresh)"
cookie=""
expect "same login from another workspace's host" 403 "$(request POST "$other" /api/v1/auth/login "$user")"
code=$(curl -s -o "$body_file" -w '%{http_code}' --max-time 20 --connect-to "::127.0.0.1:8080" \
  -H "Authorization: Bearer $token" "http://$ws:8080/api/v1/auth/me")
expect "the access token works" 200 "$code"
expect "platform admin signs in with the secrets file's password" 200 \
  "$(request POST "$admin" /api/v1/auth/login '{"email":"platform-admin@nomow.test","password":"'"$(secret SEED_ADMIN_PASSWORD)"'"}')"
expect "a workspace token is refused by the admin API" 401 \
  "$(curl -s -o "$body_file" -w '%{http_code}' --max-time 20 --connect-to "::127.0.0.1:8080" \
    -H "Authorization: Bearer $token" "http://$admin:8080/api/v1/auth/me")"
expect "staging is never indexed" "noindex, nofollow" \
  "$(curl -s -D - -o /dev/null --max-time 20 --connect-to "::127.0.0.1:8080" "http://staging.localhost:8080/" \
    | tr -d '\r' | awk -F': ' 'tolower($1)=="x-robots-tag"{print $2}')"

log "Find my workspace: the email links to the workspace host"
request POST staging.localhost /api/v1/public/workspaces/find '{"email":"owner@primeestates.com"}' >/dev/null
link=""
for _ in $(seq 1 20); do
  link=$(curl -s --max-time 10 "http://127.0.0.1:18025/api/v1/search?query=to:owner@primeestates.com" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",async()=>{const m=JSON.parse(s).messages?.[0];if(!m)return;const r=await fetch("http://127.0.0.1:18025/api/v1/message/"+m.ID);const t=(await r.json()).Text??"";process.stdout.write((t.match(/http:\/\/prime-estates-staging\.localhost:8080\S*/)||[""])[0])})' \
    2>/dev/null || true)
  [[ -n $link ]] && break
  sleep 1
done
expect "email links to the workspace host" yes "$([[ -n $link ]] && echo yes || echo no)"

rm -f "$headers" "$body_file"
[[ $failed == 0 ]] || { echo "rehearsal failed" >&2; exit 1; }
log "Rehearsal passed"
