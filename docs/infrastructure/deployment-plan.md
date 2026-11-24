# Deployment plan — Nomow on rovlex-vps

How Nomow (the product; `crmpro` stays the repo, image and server project name) will run on the
shared Rovlex server, following the practices already in place for Malls Guide
(`malls-guide/docs/infrastructure/server.md`, `hosting.md`, `deployment.md`).

**Status:** Decided 2026-11-24 (§8). Domain: `nomow.app`, the only domain. **Staging is deployed
first and alone**, on `rovlex-vps` for now. `rovlex-vps` will end up hosting Malls Guide only:
Nomow (staging and production) and Rovlex ERP move to their own servers later, so everything
here is built to move (one project, one compose, one secrets file, backups off the box).

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

### Projects on the server today (read 2026-11-24)

| Project              | Ports       | Memory max (high) | CPU  | Uses now  |
| -------------------- | ----------- | ----------------- | ---- | --------- |
| `mallsguide`         | 10000–10999 | 7 GB (6.0 GB)     | 400% | ~0.1 GB (reserved, empty) |
| `mallsguide-staging` | 11000–11999 | 6 GB (5.1 GB)     | 400% | ~1.2 GB   |
| `rovlex-erp`         | 12000–12999 | 3 GB (2.6 GB)     | 200% | ~0.7 GB   |

The caps add up to **16 GB on an 11 GB machine**. Total use is ~1.7 GB, so nothing is short today,
but one runaway project could push the others into swap. `rovlex-erp` now holds 12000–12999, the
range this plan first gave Nomow production.

## 2. Environments

| Project          | Purpose                                                  | Data           | Where                     | Ports       | Memory max | CPU  |
| ---------------- | -------------------------------------------------------- | -------------- | ------------------------- | ----------- | ---------- | ---- |
| `crmpro-staging` | Release check before production, and the **sales demo** | Demo seed only | `rovlex-vps`, now         | 13000–13999 | 3 GB       | 200% |
| `crmpro`         | **Production** — the pilot agency                        | Real           | Its own VPS, later        | —           | —          | —    |

**Caps on `rovlex-vps`** (decided; re-run `rovlex-new-project` with the new caps):

| Project              | Now          | Decided      |
| -------------------- | ------------ | ------------ |
| `mallsguide`         | 7 GB / 400%  | unchanged    |
| `mallsguide-staging` | 6 GB / 400%  | 3 GB / 400%  |
| `rovlex-erp`         | 3 GB / 200%  | unchanged    |
| `crmpro-staging`     | —            | 3 GB / 200%  |
| **Total**            | 16 GB        | **16 GB**    |

The caps still add up to more than the 11 GB of RAM (+4 GB swap). That is acceptable while
Malls Guide production is empty and the other two are test deployments; the slices' `MemoryHigh`
(~85% of each cap) throttles a project before it hits its cap. When Malls Guide production goes
live, Nomow and Rovlex ERP leave this server and the question goes away.

## 3. Domains (`nomow.app` on Cloudflare, all proxied, one level deep)

Every host is one level under `nomow.app`, because Cloudflare's free Universal SSL covers only
`nomow.app` and `*.nomow.app` (deeper names such as `x.staging.nomow.app` need the paid Advanced
Certificate Manager). `.app` is on the browsers' HSTS preload list, so it is HTTPS only.

| Host                                    | Env        | Serves                                                                  |
| --------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `staging.nomow.app`                     | Staging    | "Find my workspace" (email → link to the workspace host), `noindex`     |
| `<slug>-staging.nomow.app`, e.g. `prime-estates-x7k2-staging.nomow.app` | Staging | One demo workspace — `/api/*`, `/socket.io/*` → api (same origin), `noindex` |
| `admin-staging.nomow.app`               | Staging    | Staging admin — `/api/*` → admin-api; **Cloudflare Access** optional until production |
| `nomow.app`                             | Production | Public site; "find my workspace"                                        |
| `<slug>.nomow.app`, e.g. `prime-estates-x7k2.nomow.app` | Production | One workspace                                   |
| `admin.nomow.app`                       | Production | Platform admin, behind Cloudflare Access                                |
| `mail.nomow.app` (DNS only)             | Both       | Email sending domain (Resend): SPF/DKIM/DMARC records                   |

The same agency reads the same way in both: `prime-estates-x7k2.nomow.app` and
`prime-estates-x7k2-staging.nomow.app`. A slug always ends in its 4 random characters, so a
production slug can never end in `-staging`.

**Routing.** DNS: `nomow.app` and a wildcard `*.nomow.app`, both proxied to the server. The host
Caddy site file sends `staging.nomow.app` and every host matching `^[a-z0-9-]+-staging\.nomow\.app$`
to the `crmpro-staging` socket. Until production exists, every other `*.nomow.app` host gets a
plain 404 from the host Caddy; later they go to the `crmpro` socket.

**Workspace hosts** (built):

- The host carries the tenant's `slug`. The admin picks a prefix (at most 30 characters,
  lowercase letters, numbers and single hyphens) and the admin API adds `-` + 4 random
  characters without 0/o/1/l (`prime-estates-x7k2`). A clash at insert time draws a new suffix.
  Slugs never change after creation, so there are no renames to redirect.
- Reserved prefixes: `admin`, `api`, `app`, `auth`, `demo`, `docs`, `help`, `login`, `mail`,
  `nomow`, `staging`, `status`, `support`, `www`.
- One template per environment, `{slug}` standing for the slug, shared by every app
  (`@crmpro/shared/workspaces`):

  | Variable                              | App            | Staging                             | Production                  |
  | ------------------------------------- | -------------- | ----------------------------------- | --------------------------- |
  | `WORKSPACE_URL_TEMPLATE`              | api, admin-api | `https://{slug}-staging.nomow.app`  | `https://{slug}.nomow.app`  |
  | `NEXT_PUBLIC_WORKSPACE_URL_TEMPLATE`  | web (build)    | `https://{slug}-staging.nomow.app`  | `https://{slug}.nomow.app`  |
  | `NEXT_PUBLIC_APEX_URL`                | web (build)    | `https://staging.nomow.app`         | `https://nomow.app`         |

  Both APIs refuse to start in production without `WORKSPACE_URL_TEMPLATE`. The web values are
  baked in at build time, so the web image is built per environment.
- The web app reads the slug from its own host and signs in to that workspace only; an unknown
  host shows "Workspace not found". The apex is "find my workspace": `POST /public/workspaces/find`
  emails the address its workspace links. It answers at once and the same way whether or not any
  exist, and has its own rate-limit buckets (3 per email and 10 per IP per 15 minutes) so it
  never uses up password resets.
- `GET /public/workspaces/:slug` (each host asks once to show its sign-in page) is capped at 60
  per IP per 15 minutes, so the 4-character suffix can't be brute-forced from one address.
- **Sessions are bound to their host.** The refresh cookie is host-only (no `Domain=`), so it is
  never sent to another workspace. On top of that the API reads the browser's `Origin`: signing in,
  refreshing or requesting a password reset for workspace B from workspace A's host is refused, and
  the web app drops any session whose workspace doesn't match the address bar.
- CORS stays exact (`CORS_ORIGINS`, no wildcards): HTTP calls are same-origin. The realtime socket
  accepts those exact origins plus this environment's workspace hosts, checked on both
  long-polling and the WebSocket handshake. The apex, `admin*` and other environments are not
  workspace hosts.
- Emails (invites, password resets, notifications) link to the workspace's own host.

## 4. Services per environment (Docker Compose, rootless)

| Service     | Image                                   | Notes                                                             |
| ----------- | --------------------------------------- | ----------------------------------------------------------------- |
| `caddy`     | `caddy:2.11-alpine` + `infra/compose/Caddyfile` | Listens on the unix socket; routes by host and path               |
| `web`       | `ghcr.io/build8-developments/crmpro-web` | Next.js standalone                                                |
| `admin`     | `…/crmpro-admin`                        | Next.js standalone                                                |
| `api`       | `…/crmpro-api`                          | NestJS; BullMQ workers and the scheduler run in-process           |
| `admin-api` | `…/crmpro-admin-api`                    | NestJS                                                            |
| `tools`     | same image as `api`, one-shot           | `prisma migrate deploy` at deploy time                            |
| `postgres`  | `postgres:17-alpine`                    | Internal only; data volume                                        |
| `valkey`    | `valkey/valkey:9.1-alpine`, AOF         | Internal only; `noeviction` for BullMQ                            |

Only the project Caddy is reachable (via the socket). Nothing publishes a port. Every service has
a memory/CPU limit, a health check and `restart: unless-stopped`. Staging adds
`X-Robots-Tag: noindex` on every response.

Rough footprint: ~1.5 GB for staging, ~2–2.5 GB for production (on its own VPS).

## 5. Storage, email, backups

- **Cloudflare R2** (S3 API — the code already uses `AWS_S3_ENDPOINT` with path style):
  - `crmpro-staging-files` now, `crmpro-production-files` later: private; uploads and downloads
    by presigned URL; CORS allows only that environment's workspace hosts
    (`https://*-staging.nomow.app`; R2 accepts one `*` per origin).
  - `crmpro-backups` (production only, later): private, **bucket lock**.
  - One scoped R2 token per bucket and purpose.
- **Email:** Resend over SMTP (`MAIL_TRANSPORT=smtp`, `smtp.resend.com`) from
  `no-reply@mail.nomow.app`. Staging sends real mail too, so demo invites and resets work.
- **Backups:** none for staging. Its data is the demo seed, recreated by `db:seed`. Production
  backups are designed below and built with production.

### 5.1 Production backups (design, not built)

Goal: **lose at most ~1 minute of data (RPO), be back within an hour (RTO)**, survive the loss
of the server, a bad migration, a deleted tenant, and a leaked server credential.

| Layer | What | Why |
| ----- | ---- | --- |
| **1. Continuous** | **WAL-G**: a base backup each night + WAL shipped every ≤60 s to `crmpro-backups/wal/`, kept 14 days | Point-in-time restore to any second in the last two weeks (bad migration, mass delete). Same tool Malls Guide uses, so one runbook for the server. |
| **2. Logical** | Nightly `pg_dump -Fc`, **encrypted with age** (public key on the server, private key offline), to `crmpro-backups/dumps/`; keep 35 daily + 12 monthly | Independent of WAL-G and of the Postgres version; can restore one tenant's rows into a scratch database; readable after a major upgrade. |
| **3. Files** | Nightly `rclone copy` (copy, never sync) of `crmpro-production-files` into `crmpro-backups/files/`. **Code change needed:** deleting a file today removes the stored object at once (`files.service.ts`, `deleteFile`); keep it for 30 days after the soft delete and let the cleanup job remove it | A deleted or overwritten upload can be brought back; a mistaken delete in the app never reaches the copy. |
| **4. Secrets** | `/srv/crmpro/secrets/production.env`, the age private key and the R2 restore token in the password manager | Without them the backups can't be decrypted or the server rebuilt. |

Guard rails:

- **Write-only from the server.** The server's R2 token can add objects to `crmpro-backups` but
  not read or delete them; **object lock** (35 days on dumps and files, 14 on WAL) means a
  compromised server can't wipe its own backups. The read token for restores lives offline.
- **Off the box.** R2 is a different provider from Contabo; a lost VPS loses nothing that matters.
- **Alerting.** Each job pings a dead-man's-switch check (e.g. healthchecks.io); no ping in 26 h →
  email. WAL lag over 5 min → alert.
- **Restore drill, monthly and automatic.** Restore last night's base backup + WAL into a scratch
  container on the server, run `prisma migrate status` and row-count checks, record the time it
  took, then throw it away. A backup that has never been restored doesn't count.
- **Redis is not backed up.** It holds only queues, caches and rate-limit counters. Scheduled jobs
  re-register at boot, and import/export jobs keep their state in Postgres (the reaper requeues
  stuck ones).
- Cost: well under 50 GB on R2 for the first year (≈ $1/month at today's prices; no egress fees).

## 6. CI/CD

- **CI** (`ci.yml`, already green): lint, typecheck, tests on every PR and push.
- **Release** (`release.yml`, new, staging only for now): push to `main` → build the four images
  with the staging build variables, push to GHCR tagged with the git tree hash → deploy
  **staging** → smoke tests.
- Later, **production** = the same tree hash, deployed by `workflow_dispatch` through the GitHub
  Environment `production` (manual approval). The web image is rebuilt with production's
  `NEXT_PUBLIC_*` values.
- Deploy over SSH with a restricted key and the existing `rovlex-deploy-entry`; the server pulls
  with the job's short-lived `GITHUB_TOKEN`.
- `infra/deploy.sh`: pull images → start postgres/redis → migrate (`tools`) → start apps with
  `--wait` → smoke tests through the socket (`/api/v1/health` on both APIs, apex and admin hosts)
  → append to `~/app/releases.log` → keep the last five releases.

## 7. Work, in order (staging)

1. **Repo (me): done.** `apps/{api,admin-api,web,admin}/Dockerfile` (pnpm filtered install, Next
   standalone, non-root, health checks); `infra/compose/` (`compose.yml`, `compose.staging.yml`,
   `staging.env`, `Caddyfile`), `infra/deploy.sh`, `infra/server/` (edge site file,
   `init-secrets.sh`), `release.yml`. The demo seed takes its passwords and the platform admin's
   email from the secrets file on staging (the repo's defaults are public). Every pull request
   rehearses the whole deploy on the runner; see [`infra/README.md`](../../infra/README.md).
2. **Workspace hosts (me): done.** Slugs, reserved names, sign-in bound to the host, "find my
   workspace", workspace links in emails, socket origins, rate limits. Tested on `*.localhost`.
3. **Cloudflare (you):** step by step in [`cloudflare-setup.md`](cloudflare-setup.md).
4. **Server (me, over SSH with sudo, after your OK):** set `mallsguide-staging` to 3 GB / 400%
   (§2); create `crmpro-staging` (13000, 3 GB, 200%); install its edge site file and the origin
   cert (`/etc/caddy/certs/crmpro/origin.pem` + `.key`, Authenticated Origin Pulls like the other
   projects); generate secrets; add the deploy key; register the project.
5. **First deploy:** staging with the demo seed; platform admin created; demo workspaces checked
   on their `-staging` hosts.
6. **Later — production, on its own VPS:** same layout (rootless Docker, edge Caddy with the
   origin cert and Authenticated Origin Pulls), build §5.1, deploy the same tree,
   create the pilot workspace from the admin app, then pilot onboarding (users by email invite,
   pipeline, working hours, targets, lead import).

## 8. Decisions (2026-11-24)

1. **Environments:** two (`crmpro-staging` as release check and demo, `crmpro` for production);
   **staging is deployed first and alone** on `rovlex-vps`; production gets its own VPS, and
   staging moves there too once `rovlex-vps` is needed for Malls Guide.
2. **Host names:** §3 — `<slug>.nomow.app` / `admin.nomow.app` / `nomow.app` for production,
   `<slug>-staging.nomow.app` / `admin-staging.nomow.app` / `staging.nomow.app` for staging.
3. **Server caps:** §2 — `mallsguide-staging` 3 GB / 400%, `crmpro-staging` 3 GB / 200%,
   `mallsguide` and `rovlex-erp` unchanged.
4. **Backups:** none for staging; production design in §5.1 (WAL-G + encrypted nightly dumps +
   file copies, write-only and locked, restore drills), built with production.
5. **Cloudflare:** done by you from the dashboard, following [`cloudflare-setup.md`](cloudflare-setup.md).
