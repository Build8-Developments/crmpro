# Cloudflare setup — `nomow.app` (staging first)

Everything to do in the Cloudflare dashboard (plus Resend) before Nomow staging can go live on
`rovlex-vps`. Host names and the reasons behind them are in
[`deployment-plan.md`](deployment-plan.md) §3. Production (its own VPS, later) repeats §4–§6 with
the production names noted there.

**Where things stand (2026-11-24):** the `nomow.app` zone is on Cloudflare (nameservers
`deborah` / `uriah`) and has no DNS records yet.

**Secrets rule:** the origin private key, the R2 secret key and the Resend API key never go into
chat, tickets or the repo. Keep them in the password manager; they go into the server's secrets
file only (§8).

Dashboard labels move around; if a name below doesn't match exactly, use the dashboard search
(top bar) for the bold term.

---

## 1. Zone basics

1. **Overview** of `nomow.app`: status **Active**, plan **Free**.
2. **DNS → Settings → DNSSEC → Enable.** If the domain is registered with Cloudflare Registrar it
   finishes by itself; otherwise copy the DS record it shows to the registrar.

## 2. SSL/TLS

1. **SSL/TLS → Overview → Configure → Custom SSL/TLS → Full (strict).**
2. **SSL/TLS → Edge Certificates:**
   - **Always Use HTTPS:** on
   - **Minimum TLS Version:** TLS 1.2
   - **TLS 1.3:** on
   - **Automatic HTTPS Rewrites:** on
   - **Universal SSL:** status Active, covering `nomow.app` and `*.nomow.app`. That's why every
     host stays one level deep.
   - **HSTS:** leave off. `.app` is HSTS-preloaded in every browser already, so HTTPS is
     enforced anyway.
3. **Origin certificate** (lets the server prove itself to Cloudflare):
   1. **SSL/TLS → Origin Server → Create Certificate.**
   2. **Generate private key and CSR with Cloudflare**, key type **RSA (2048)**.
   3. Hostnames: `nomow.app` and `*.nomow.app` (the defaults).
   4. Validity: **15 years** → **Create**.
   5. Format **PEM**. Copy **Origin Certificate** into a file `origin.pem` and **Private Key**
      into `origin.key` on your Mac. The key is shown **only once**.
   6. Put both on the server for me to install, then delete the local copies (a lost key just
      means issuing a new certificate):

      ```bash
      ssh rovlex-vps 'mkdir -m 700 -p ~/crmpro-origin'
      scp origin.pem origin.key rovlex-vps:~/crmpro-origin/
      rm origin.pem origin.key
      ```

4. **SSL/TLS → Origin Server → Authenticated Origin Pulls → On.** Cloudflare then presents its
   client certificate to the server, and the server refuses any request that doesn't come through
   Cloudflare (same setup as Malls Guide and Rovlex ERP).

## 3. DNS records

**DNS → Records → Add record**, both **Proxied** (orange cloud), TTL Auto:

| Type | Name | Content                                    |
| ---- | ---- | ------------------------------------------ |
| A    | `@`  | `rovlex-vps`'s public IPv4                 |
| A    | `*`  | the same IPv4                              |

That covers `staging.nomow.app`, every `*-staging.nomow.app` workspace, `admin-staging.nomow.app`
and, later, production names. Until the server step is done these hosts answer with a Cloudflare
52x error. That is expected.

Email records come in §7.

## 4. Settings that would break the app

| Where                                                                   | Set to | Why                                                                                      |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| **Network → WebSockets**                                                | On     | Realtime updates (`/socket.io`).                                                         |
| **Speed → Settings → Content Optimization → Rocket Loader**             | Off    | Rewrites script loading and breaks Next.js.                                              |
| **Security → Settings** (filter *Client-side abuse*) **→ Email Address Obfuscation** | Off | Rewrites emails in the HTML, so React's page no longer matches and breaks (leads, users). |
| **Security → Settings** (filter *Bot traffic*) **→ Bot fight mode**     | Off    | Challenges server-to-server calls: the inbound leads API now, Meta webhooks later. On the Free plan no rule can exempt a path from it, so it has to be off. |
| **Caching → Configuration → Browser Cache TTL**                         | Respect Existing Headers | The apps set their own cache headers.                                  |

(Email Address Obfuscation used to live under "Scrape Shield"; the new dashboard moved it.)

Then one rule so integrations can reach the inbound leads API. **Browser Integrity Check** (on by
default, under Security → Settings) challenges requests with a missing or unusual `User-Agent`.
That's fine for people, but Zapier, Make or a website's form backend calling
`POST /api/v1/inbound/leads` can't solve a challenge, so they would get a Cloudflare HTML page
instead of our JSON. The rule turns the check off for that path only:

1. **Rules → Overview → Create rule → Configuration Rule**, name `Inbound leads API`.
2. **When incoming requests match:** *Custom filter expression* → Field **URI Path**, Operator
   **starts with**, Value `/api/v1/inbound/`.
3. **Then the settings are:** add **Browser Integrity Check**, set it **Off**. **Deploy**.

The inbound API has its own protection: an API key on every request, and our own rate limits.

The **Cloudflare Free Managed Ruleset** (Security → WAF / Security rules → Managed rules) is
deployed by default on every zone. It blocks well-known exploits (e.g. Log4j). Nothing to do; just
don't turn it off.

## 5. Cloudflare Access on the admin host (optional for staging, required before production)

The platform admin gets a second lock in front of its own login. That's all it does; nothing else
depends on it. It matters because the admin controls every workspace and has no two-factor sign-in
yet. Staging holds only demo data, so it can wait. Do it, or add admin 2FA, before production.

1. Open **Zero Trust** (left sidebar). The first time:
   1. Pick a team name, e.g. `nomow`.
   2. Choose the **Free** plan (up to 50 users). It may ask for a payment method even on Free.
2. **Settings → Authentication → Login methods:** **One-time PIN** is there by default (a code
   to your email). Optionally add Google.
3. **Access → Applications → Add an application → Self-hosted:**
   - Name: `Nomow admin (staging)`
   - Session duration: **24 hours**
   - Public hostname: subdomain `admin-staging`, domain `nomow.app`, path empty, so the admin
     API on the same host is covered too
   - Login methods: One-time PIN (and Google if added)
4. Policy: name `Nomow team`, action **Allow**, include **Emails** → your address (and anyone
   else who runs the platform). Use exact emails, never "emails ending in @gmail.com".
5. Save. Later, add `admin.nomow.app` the same way for production.

## 6. R2 — file storage for staging

1. **R2 Object Storage → Overview.** The first time, subscribe to R2. The free tier covers
   10 GB, but it needs a payment method on file.
2. **Create bucket:**
   - Name: `crmpro-staging-files`
   - Location: **Automatic**, hint **Western Europe (WEUR)** (the server is in Europe)
   - Default storage class: **Standard**
3. Bucket → **Settings:**
   - **Public access:** R2.dev subdomain **disabled**, no custom domain. Files are only reached
     through short-lived signed links.
   - **CORS Policy → Add CORS policy → JSON**, then Save:

     ```json
     [
       {
         "AllowedOrigins": ["https://*-staging.nomow.app"],
         "AllowedMethods": ["GET", "PUT", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```

     R2 allows one `*` per origin, so this matches every staging workspace host and nothing else.
4. **API token:** R2 → **Manage API tokens** → **Create Account API token**:
   - Name: `crmpro-staging-files`
   - Permissions: **Object Read & Write**
   - Specify bucket: **only** `crmpro-staging-files`
   - TTL: forever
   - Client IP filtering: **none**. Browsers use the signed links from their own IPs, so a
     filter would break uploads.
   - Create, then save the **Access Key ID** and **Secret Access Key** in the password manager
     (the secret is shown once). Note the **S3 endpoint**
     `https://<account-id>.r2.cloudflarestorage.com`. The account ID is not a secret.

## 7. Email — Resend on `mail.nomow.app`

1. Sign up at resend.com.
2. **Domains → Add domain:** `mail.nomow.app`, region **Ireland (eu-west-1)**.
3. Add the records Resend shows. Its **automatic setup with Cloudflare** is fine to use; if you
   enter them by hand, they are all **DNS only** (grey cloud), and you copy names and values
   exactly from Resend. Cloudflare adds `.nomow.app` itself. The automatic setup (used for staging, 2026-11-24)
   created:

   | Type  | Name                      | Content                                              |
   | ----- | ------------------------- | ---------------------------------------------------- |
   | CNAME | `send.mail`               | `send.forge.rmta.net` (Resend's bounce/return path)   |
   | TXT   | `resend._domainkey.mail`  | the DKIM key Resend gives                            |

   Resend's record values change over time; whatever Resend shows and marks verified is right.

4. DMARC and anti-spoofing, added by hand (Resend's automatic setup normally adds only its own three). First look
   in **DNS → Records** for an existing `_dmarc.mail`, `_dmarc` or `@` TXT record starting
   `v=spf1`: a name may hold only one DMARC record and one SPF record, so edit the existing one
   instead of adding a second. For each row: **Add record** → Type **TXT** → Name as shown
   (Cloudflare adds `.nomow.app` itself) → Content exactly as shown (no extra quotes) → TTL Auto →
   **Save**. TXT records have no proxy toggle.

   | Type | Name          | Content                                                   |
   | ---- | ------------- | --------------------------------------------------------- |
   | TXT  | `_dmarc.mail` | `v=DMARC1; p=none; rua=mailto:<an address you read>`      |
   | TXT  | `@`           | `v=spf1 -all`                                             |
   | TXT  | `_dmarc`      | `v=DMARC1; p=reject`                                      |

   - `rua` is where mail providers send daily DMARC reports (small XML attachments). Use any
     inbox you check, or leave it out (`v=DMARC1; p=none`). The record still counts, which Gmail
     and Yahoo require, but you get no reports.

   - `mail.nomow.app` starts at `p=none` (reports only). After two weeks of clean reports, change
     it to `p=quarantine`.
   - The bare domain sends no mail, so the last two records stop anyone from faking
     `@nomow.app` or `@<workspace>.nomow.app`. If you later want real mailboxes on `nomow.app`
     (e.g. `support@`), these two change.
5. Wait for **Verified** in Resend. Open and click tracking must stay **off** (the default):
   tracking rewrites links, including password-reset and invite links. To check: **Domains →
   `mail.nomow.app` → Configuration**; if *Enable tracking metrics* still shows **Configure**,
   tracking is off and there is nothing to do.
6. **API Keys → Create:** name `crmpro-staging`, permission **Sending access**, domain
   `mail.nomow.app`. Save it in the password manager (shown once). It goes in the secrets file as `RESEND_API_KEY`.

## 8. What goes into the staging secrets file (you paste the secret values)

`/srv/crmpro-staging/secrets/staging.env` (template: [`infra/secrets.example.env`](../../infra/secrets.example.env)).
In the server step I run `infra/server/init-secrets.sh`, which generates the database password,
both JWT secrets, the monitoring key and the demo passwords. Then you open the file over SSH and
fill in the rest yourself:

```bash
R2_ACCOUNT_ID=                # the Cloudflare account ID (not secret)
R2_ACCESS_KEY_ID=             # you: R2 token's Access Key ID
R2_SECRET_ACCESS_KEY=         # you: R2 token's Secret Access Key
RESEND_API_KEY=               # you: Resend API key
SEED_ADMIN_EMAIL=             # you: the email you sign in to admin-staging with
```

Everything else (Resend's SMTP host and port, the bucket name, `MAIL_FROM`) is already in
[`infra/compose/staging.env`](../../infra/compose/staging.env).

## 9. Checklist — tell me when these are done

- [ ] SSL/TLS: Full (strict), edge settings, Authenticated Origin Pulls on (§2)
- [ ] `origin.pem` + `origin.key` uploaded to `~/crmpro-origin/` on `rovlex-vps` (§2.3)
- [ ] DNS: `@` and `*` proxied A records (§3)
- [ ] App-breaking settings off, inbound API rule added (§4)
- [ ] Access application on `admin-staging.nomow.app` (§5), optional for staging
- [ ] R2 bucket, CORS policy, token saved; send me the account ID (§6)
- [ ] Resend domain verified, DMARC/SPF records, tracking off, API key saved (§7)

Then I do the server step ([`deployment-plan.md`](deployment-plan.md) §7 step 4) after your OK.
