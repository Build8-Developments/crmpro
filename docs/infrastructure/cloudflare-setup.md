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

| Where                                              | Set to | Why                                                                                     |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| **Network → WebSockets**                           | On     | Realtime updates (`/socket.io`).                                                         |
| **Speed → Optimization → Rocket Loader**           | Off    | Rewrites script loading and breaks Next.js.                                              |
| **Scrape Shield → Email Address Obfuscation**      | Off    | Rewrites emails in the HTML, so React's page no longer matches and breaks (leads, users). |
| **Security → Bots → Bot Fight Mode**               | Off    | Challenges server-to-server calls: the inbound leads API now, Meta webhooks later.       |
| **Caching → Configuration → Browser Cache TTL**    | Respect Existing Headers | The apps set their own cache headers.                                  |

Then one rule so integrations can reach the inbound leads API:

1. **Rules → Configuration Rules → Create rule**, name `Inbound leads API`.
2. When: **URI Path** *starts with* `/api/v1/inbound/`.
3. Then: **Browser Integrity Check → Off**. Deploy.

Leave **Security → WAF → Managed rules** (the free managed ruleset) on.

## 5. Cloudflare Access on the admin host

The platform admin gets a second lock in front of its own login.

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
   exactly from Resend. Cloudflare adds `.nomow.app` itself. They look like:

   | Type | Name                      | Content                                         |
   | ---- | ------------------------- | ----------------------------------------------- |
   | MX   | `send.mail`               | `feedback-smtp.eu-west-1.amazonses.com`, priority 10 |
   | TXT  | `send.mail`               | `v=spf1 include:amazonses.com ~all`             |
   | TXT  | `resend._domainkey.mail`  | the DKIM key Resend gives                       |

4. DMARC and anti-spoofing, added by hand in **DNS → Records**:

   | Type | Name          | Content                                                   |
   | ---- | ------------- | --------------------------------------------------------- |
   | TXT  | `_dmarc.mail` | `v=DMARC1; p=none; rua=mailto:<your address>`             |
   | TXT  | `@`           | `v=spf1 -all`                                             |
   | TXT  | `_dmarc`      | `v=DMARC1; p=reject`                                      |

   - `mail.nomow.app` starts at `p=none` (reports only). After two weeks of clean reports, change
     it to `p=quarantine`.
   - The bare domain sends no mail, so the last two records stop anyone from faking
     `@nomow.app` or `@<workspace>.nomow.app`. If you later want real mailboxes on `nomow.app`
     (e.g. `support@`), these two change.
5. Wait for **Verified** in Resend. Then, in the domain's settings, turn **click tracking** and
   **open tracking** off: tracking rewrites links, including password-reset and invite links.
6. **API Keys → Create:** name `crmpro-staging`, permission **Sending access**, domain
   `mail.nomow.app`. Save it in the password manager (shown once). It is the SMTP password.

## 8. What goes into the staging secrets file (you paste the secret values)

When I create the server project, `/srv/crmpro-staging/secrets/staging.env` gets these. I fill in
everything except the three secret values, which you paste in yourself over SSH:

```bash
AWS_REGION=auto
AWS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
AWS_S3_BUCKET=crmpro-staging-files
AWS_ACCESS_KEY_ID=            # you: R2 Access Key ID
AWS_SECRET_ACCESS_KEY=        # you: R2 Secret Access Key

MAIL_TRANSPORT=smtp
MAIL_FROM="Nomow <no-reply@mail.nomow.app>"
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=                    # you: Resend API key
```

## 9. Checklist — tell me when these are done

- [ ] SSL/TLS: Full (strict), edge settings, Authenticated Origin Pulls on (§2)
- [ ] `origin.pem` + `origin.key` uploaded to `~/crmpro-origin/` on `rovlex-vps` (§2.3)
- [ ] DNS: `@` and `*` proxied A records (§3)
- [ ] App-breaking settings off, inbound API rule added (§4)
- [ ] Access application on `admin-staging.nomow.app` (§5)
- [ ] R2 bucket, CORS policy, token saved; send me the account ID (§6)
- [ ] Resend domain verified, DMARC/SPF records, tracking off, API key saved (§7)

Then I do the server step ([`deployment-plan.md`](deployment-plan.md) §7 step 4) after your OK.
