# infra — how Nomow runs on a server

The decisions behind all of this are in
[`docs/infrastructure/deployment-plan.md`](../docs/infrastructure/deployment-plan.md); the
Cloudflare side is in [`cloudflare-setup.md`](../docs/infrastructure/cloudflare-setup.md).

| File | What it is |
| ---- | ---------- |
| `compose/compose.yml` | Every service: postgres, valkey, api, admin-api, web, admin, caddy, and the one-shot `tools` |
| `compose/compose.staging.yml` | Staging's memory and CPU limits (3 GB / 200% slice) |
| `compose/staging.env` | Staging's settings that are not secret (hosts, mail, bucket) |
| `compose/Caddyfile` | The project's own Caddy: admin host → admin + admin-api, every other host → web + api |
| `deploy.sh` | Pull → migrate → (first staging deploy: demo seed) → start → smoke tests → prune |
| `secrets.example.env` | The names in the server's secrets file; never commit values |
| `server/init-secrets.sh` | Generates the random secrets on the server, keeps existing ones |
| `server/edge/crmpro.caddy` | The shared host Caddy's site file: TLS with the origin certificate, Cloudflare-only, staging hosts → the staging socket |

The app images are built from `apps/<app>/Dockerfile` (repository root as the context) by
[`.github/workflows/release.yml`](../.github/workflows/release.yml).

## How a deploy runs

1. A push to `main` builds `ghcr.io/build8-developments/crmpro-{api,admin-api,admin}:<tree>` and
   `crmpro-web:<tree>-staging` (the web app bakes its host names in).
2. The deploy job pipes its registry token and a tarball of `infra/compose` + `infra/deploy.sh`
   over SSH to `crmpro-staging@rovlex-vps`. The deploy key can only run the server's forced
   command, `/usr/local/sbin/rovlex-deploy-entry staging`, which unpacks the tarball into
   `~/app/releases/<tree>` and runs `deploy.sh staging <tree>`.
3. `deploy.sh` reads `~/secrets/staging.env`, pulls the images, runs `prisma migrate deploy`,
   seeds the demo on the very first staging deploy only, starts everything with `--wait`, and
   checks the hosts through the project Caddy's socket. A failed check fails the job.
   Every deploy is appended to `~/app/releases.log`.

## Day-to-day on the server (as `crmpro-staging`)

```bash
# What's running, and the logs
docker compose -p crmpro-staging ps
docker compose -p crmpro-staging logs -f api

# Roll back to an older release (the last five are kept, with their images)
ls -t ~/app/releases
~/app/releases/<older tree>/infra/deploy.sh staging <older tree> --local

# Reset the demo data (the seed replaces the demo workspace's CRM data)
rm ~/app/.seeded   # then redeploy the current release with --local
```

## Rehearsal (every pull request)

The `Deploy rehearsal` job in `release.yml` builds the four images on the runner and runs
[`rehearsal/rehearse.sh`](rehearsal/rehearse.sh): it unpacks the release the way the server
does, deploys it twice with the real `deploy.sh` (Caddy on `127.0.0.1:8080`, Mailpit instead of
Resend, hosts under `*.localhost`), then checks through Caddy that:

- the repo's default demo password is refused and the secrets file's one works;
- the refresh cookie is `HttpOnly`, `Secure` and host-only, and refreshing works;
- signing in from another workspace's host is refused;
- a workspace token is refused by the admin API, and the platform admin signs in;
- staging sends `X-Robots-Tag: noindex`;
- "find my workspace" emails a link to the workspace's own host.

It runs on a laptop too, once the images are built under the local names the script lists.
