#!/usr/bin/env bash
# Create or complete an environment's secrets file (infra/secrets.example.env), as the project
# user on the server:
#   bash init-secrets.sh ~/secrets/staging.env
#
# Generates the random values that are missing and leaves every existing line alone, so it is
# safe to run again. The values pasted in by hand (R2, Resend) and SEED_ADMIN_EMAIL are added
# empty for you to fill in with an editor; nothing is ever printed.
set -euo pipefail
umask 077
file=${1:?secrets file}
mkdir -p "$(dirname "$file")"
touch "$file"
chmod 600 "$file"

has() { grep -qE "^$1=." "$file"; }
add() { # name value
  if grep -qE "^$1=" "$file"; then
    sed -i "s|^$1=.*|$1=$2|" "$file"
  else
    printf '%s=%s\n' "$1" "$2" >>"$file"
  fi
}
random() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-"$1"; }

for name in POSTGRES_PASSWORD API_JWT_ACCESS_SECRET ADMIN_JWT_ACCESS_SECRET INTERNAL_MONITORING_KEY; do
  has "$name" || add "$name" "$(random 48)"
done
for name in SEED_USER_PASSWORD SEED_ADMIN_PASSWORD; do
  has "$name" || add "$name" "$(random 20)"
done
for name in SEED_ADMIN_EMAIL R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY RESEND_API_KEY; do
  grep -qE "^$name=" "$file" || printf '%s=\n' "$name" >>"$file"
done

missing=$(grep -E '^[A-Z0-9_]+=$' "$file" | cut -d= -f1 | tr '\n' ' ')
echo "Secrets file: $file"
[[ -z $missing ]] && echo "Complete." || echo "Still to fill in: $missing"
