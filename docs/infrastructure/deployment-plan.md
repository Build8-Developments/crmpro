# Deployment plan — Nomow on rovlex-vps

How Nomow (the product; `crmpro` stays the repo, image and server project name) will run on the
shared Rovlex server, following the practices already in place for Malls Guide
(`malls-guide/docs/infrastructure/server.md`, `hosting.md`, `deployment.md`).

**Status:** Proposed (2026-11-23). Domain: `nomow.app`, the only domain. Decisions to confirm are
in §8.

---

## 1. What the server already gives us

`rovlex-vps` (Contabo, Ubuntu 24.04, 6 vCPU, 11 GB RAM + 4 GB swap, 80 GB free) is built for
several isolated projects:

- **One project = one Linux user** with home `/srv/<project>` (`750`), its own **rootless Docker
  engine**, a **systemd slice** with memory/CPU caps, and a **127.0.0.1 port range**. Created with
  `sudo rovlex-new-project <name> <first-port> <memory-max> <cpu>`.
- **One shared host Caddy** owns 80/443. Each project has a root-owned site file
  `/etc/caddy/sites/<project>.caddy` that terminates TLS with a **Cloudflare Origin certificate**,
  requires **Authenticated Origin Pulls**, and forwards to the project's own Caddy over a **unix
  socket** (`/srv/<project>/run/caddy.sock`).
- **Firewall:** 80/443 accept only Cloudflare's ranges; SSH key-only with fail2ban.
- **Deploys:** CI builds images to GHCR and deploys over SSH with a key that can only run
  `rovlex-deploy-entry <env>` → `deploy <tree-hash>`, which unpacks `infra/compose` +
  `infra/deploy.sh` from the release and runs it as the project user. Releases are kept in
  `~/app/releases/<tree>`, the last five with their images (rollback = redeploy an older tree).
- **Secrets:** one dotenv per environment, `/srv/<project>/secrets/<env>.env` (mode `600`),
  generated values created on the server; non-secret settings committed in `infra/compose/<env>.env`.

Today: `mallsguide-staging` runs (8 containers, ~2.5 GB), `mallsguide` (production) is reserved
but empty. Registry `/etc/rovlex/projects.md`: 10000–10999 and 11000–11999 are taken.

## 2. Environments

| Project          | Purpose                                                  | Data            | Ports       | Memory max | CPU  |
| ---------------- | -------------------------------------------------------- | --------------- | ----------- | ---------- | ---- |
| `crmpro`         | **Production** — the pilot agency                        | Real            | 12000–12999 | 3 GB       | 200% |
| `crmpro-staging` | Release check before production, and the **sales demo** | Demo seed only  | 13000–13999 | 2 GB       | 200% |

The Malls Guide caps (7 GB + 6 GB) already exceed the machine. Proposed rebalance (re-run
`rovlex-new-project` with new caps): `mallsguide-staging` 4 GB (uses ~2.5 GB), `mallsguide` 3 GB
until its production actually moves here. Totals then fit the 11 GB machine with swap as headroom.

## 3. Domains (`nomow.app` on Cloudflare, all proxied, one level deep)

Every host is one level under `nomow.app`, because Cloudflare's free Universal SSL covers only
`nomow.app` and `*.nomow.app`. `.app` is on the browsers' HSTS preload list, so it is HTTPS only.

| Host                                          | Serves                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `nomow.app`                                   | Public site; "find my workspace" (email → a link to the workspace host)   |
| `<slug>-<4 chars>.nomow.app`, e.g. `primeestate-x7k2.nomow.app` | One workspace (web) — `/api/*`, `/socket.io/*` → api (same origin) |
| `admin.nomow.app`                             | Platform admin — `/api/*` → admin-api; behind **Cloudflare Access**       |
| `<slug>-<4 chars>--staging.nomow.app`         | Staging / demo workspaces (demo data), `noindex`                          |
| `admin--staging.nomow.app`                    | Staging admin, behind Cloudflare Access                                   |
| `mail.nomow.app` (DNS only)                   | Email sending domain (Resend): SPF/DKIM/DMARC records                     |

**Routing.** DNS: `nomow.app` and a wildcard `*.nomow.app`, both proxied to the server. The host
Caddy site file sends `*--staging.nomow.app` to the `crmpro-staging` socket and the apex and every
other `*.nomow.app` host to the `crmpro` socket. Generated slugs never contain `--`.

**Workspace hosts** (replaces the workspace-name entry page):

- Host = workspace slug (lowercase ASCII and hyphens, at most 30 characters, transliterated or
  chosen by the owner for Arabic names) + `-` + 4 random `[a-z0-9]`. The suffix makes hosts
  unique and hard to guess, so the host list does not reveal who the clients are.
- Reserved: `www`, `app`, `admin`, `api`, `mail`, `status`, `docs`, `help`, `support`, `staging`,
  and anything containing `--`.
- The api resolves the tenant from the `Host` header, trusted only as set by the project Caddy.
  Sign-in on a workspace host signs in to that workspace only. An unknown host shows a plain "not
  found" page that does not say whether a workspace exists.
- Session cookies are host-only (`__Host-` prefix, no `Domain=`), so a session for one workspace
  is never sent to another.
- Renaming a workspace keeps the old host as a redirect for 90 days.

## 4. Services per environment (Docker Compose, rootless)

| Service     | Image                                   | Notes                                                             |
| ----------- | --------------------------------------- | ----------------------------------------------------------------- |
| `caddy`     | `caddy:2` + `infra/caddy/Caddyfile`     | Listens on the unix socket; routes by host and path               |
| `web`       | `ghcr.io/build8-developments/crmpro-web` | Next.js standalone                                                |
| `admin`     | `…/crmpro-admin`                        | Next.js standalone                                                |
| `api`       | `…/crmpro-api`                          | NestJS; BullMQ workers and the scheduler run in-process           |
| `admin-api` | `…/crmpro-admin-api`                    | NestJS                                                            |
| `tools`     | same image as `api`, one-shot           | `prisma migrate deploy` at deploy time                            |
| `postgres`  | `postgres:17-alpine` (pinned)           | Internal only; data volume                                        |
| `redis`     | `valkey/valkey` (pinned), AOF           | Internal only; `noeviction` for BullMQ                            |

Only the project Caddy is reachable (via the socket). Nothing publishes a port. Every service has
a memory/CPU limit, a health check and `restart: unless-stopped`.

Rough footprint: ~2–2.5 GB for production, ~1.5 GB for staging.

## 5. Storage, email, backups

- **Cloudflare R2** (S3 API — the code already uses `AWS_S3_ENDPOINT` with path style):
  - `crmpro-production-files`, `crmpro-staging-files`: private; uploads and downloads by presigned
    URL; CORS allows only `https://*.nomow.app` (production) or the `--staging` hosts. If R2
    does not accept a wildcard origin, uploads go through the api instead (decided when building).
  - `crmpro-backups`: private, **bucket lock** (35 days).
  - One scoped R2 token per bucket and purpose (files read/write per env, backups write-only,
    a read-only restore token kept offline).
- **Email:** Resend over SMTP (`MAIL_TRANSPORT=smtp`, `smtp.resend.com`) from
  `no-reply@mail.nomow.app`. Staging can use Mailpit until needed.
- **Backups (production):** nightly `pg_dump -Fc`, encrypted with age, uploaded to
  `crmpro-backups` (RPO 24 h, kept 35 days, restore tested monthly on staging). Upgrade path:
  WAL-G continuous archiving like Malls Guide (RPO ~1 min) once the pilot has real volume.

## 6. CI/CD

- **CI** (`ci.yml`, already green): lint, typecheck, tests on every PR and push.
- **Release** (`release.yml`, new):
  - push to `main` → build the four images, push to GHCR tagged with the git tree hash → deploy
    **staging** automatically, then smoke tests;
  - **production** = the same tree hash, deployed by `workflow_dispatch` through the GitHub
    Environment `production` (manual approval).
- Deploy over SSH with restricted keys (one per environment) and the existing
  `rovlex-deploy-entry`; the server pulls with the job's short-lived `GITHUB_TOKEN`.
- `infra/deploy.sh`: pull images → start postgres/redis → migrate (`tools`) → start apps with
  `--wait` → smoke tests through the socket (`/api/v1/health` on both APIs, both web hosts) →
  append to `~/app/releases.log` → keep the last five releases.

## 7. Work, in order

1. **Repo (me):** Dockerfiles for api, admin-api, web, admin (pnpm + turbo prune, Next standalone,
   non-root); `infra/compose/*`, `infra/caddy/Caddyfile`, `infra/deploy.sh`, `release.yml`; env
   checks for production (R2 endpoint, Resend, cookies `Secure`, CORS, `TRUST_PROXY_HOPS`).
   Verified locally with a production-like compose run.
2. **Workspace hosts (me):** tenant resolution from `Host`, slug + suffix generation, reserved
   names, host-only cookies, "find my workspace" on the apex, removal of the workspace-name page,
   rename redirects. Tested locally with `*.localhost` hosts.
3. **Cloudflare (you, or me with a scoped API token):** buy `nomow.app`; Origin certificate for
   `nomow.app` + `*.nomow.app`; SSL Full (strict); Authenticated Origin Pulls; DNS records (§3);
   Cloudflare Access on the admin hosts; R2 buckets, CORS and tokens; Resend domain records.
4. **Server (me, over SSH with sudo, after your OK):** rebalance caps; create `crmpro` and
   `crmpro-staging`; install the edge site file and origin cert; generate secrets; add deploy keys;
   register the projects.
5. **First deploy:** staging with the demo seed, then production (empty) with the platform admin
   and the pilot workspace created from the admin app.
6. **Pilot onboarding:** workspace, users (email invites), pipeline, working hours, targets,
   lead import.

## 8. Decisions to confirm

1. **Two environments** (`crmpro` + `crmpro-staging` as the demo) — or production only for now.
2. **Host names** in §3: workspace hosts `<slug>-<4 chars>.nomow.app`, `admin.nomow.app`, and
   the `--staging` pattern for staging.
3. **Lowering the Malls Guide caps** to make room (§2).
4. **Backups:** nightly encrypted dumps now, WAL-G later.
5. **Cloudflare work:** you do it from the dashboard, or create a scoped API token
   (zone DNS + SSL + Access for `nomow.app`, R2 for the three buckets) for me to use.
