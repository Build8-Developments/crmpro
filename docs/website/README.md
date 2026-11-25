# Nomow Website (`apps/website`)

Last updated: 2026-11-24

The public website at `nomow.app`. Today it is one page: a "coming soon" landing page with a
demo request form. It is built as a real site from the start (routing, locales, metadata,
sitemap, theme) so it can grow into the full marketing site without a rewrite.

It is separate from the product:

| App            | What it is               | Host               |
| -------------- | ------------------------ | ------------------ |
| `apps/website` | Public marketing site    | `nomow.app`        |
| `apps/web`     | Tenant CRM (the product) | `<slug>.nomow.app` |
| `apps/admin`   | Platform admin           | `admin.nomow.app`  |

The website has no auth and no tenant data. Its only server-side code is the demo form's
server action, which sends a lead to Nomow's own workspace (see "Demo form").

---

## Run it

```bash
pnpm dev:website        # http://localhost:3003 → redirects to /en or /ar
```

Per app: `pnpm --filter website build | lint | typecheck | capture`. It is part of the root
`pnpm dev`, `build`, `lint` and `typecheck` (turbo), and `.claude/launch.json` has a `website`
entry for the in-app preview.

Settings (see `apps/website/.env.example`). `NEXT_PUBLIC_*` values are baked in at build time,
so the image is built per environment, as for `apps/web`:

| Variable                         | Default (dev)                 | Production                    |
| -------------------------------- | ----------------------------- | ----------------------------- |
| `NEXT_PUBLIC_SITE_URL`           | `http://localhost:3003`       | `https://nomow.app`           |
| `NEXT_PUBLIC_FIND_WORKSPACE_URL` | `http://localhost:3001/login` | to decide (see below)         |
| `NEXT_PUBLIC_CONTACT_EMAIL`      | `hello@nomow.app`             | to confirm (see below)        |
| `DEMO_LEADS_URL` (server)        | empty: requests are logged    | Nomow workspace inbound URL   |
| `DEMO_LEADS_API_KEY` (server)    | empty                         | API key from that workspace   |

`robots.txt` allows crawling only when `NEXT_PUBLIC_SITE_URL` is exactly `https://nomow.app`;
every other build (staging, local) disallows everything.

---

## Stack and structure

Same stack and conventions as `apps/web`: Next.js 16 (App Router), React 19, Tailwind CSS 4,
`@tabler/icons-react`, `cn()` from `clsx` + `tailwind-merge`, `cva` for variants, the same ESLint
and TypeScript config, and `NEXT_OUTPUT=standalone` support for Docker images. The only extra
dependency is `playwright-core` (dev), for the screenshot script.

```text
apps/website
├── scripts/capture-screenshots.mjs  real product screenshots from a local CRM (see below)
└── src
    ├── app
    │   ├── [locale]/layout.tsx          html lang/dir, fonts, init script (js flag + theme), metadata
    │   ├── [locale]/page.tsx            home: composes the sections below
    │   ├── [locale]/opengraph-image.tsx share image: white lockup on emerald
    │   ├── [locale]/not-found.tsx       localized 404; [...rest]/page.tsx sends unknown paths to it
    │   ├── globals.css                  brand tokens (light + .dark), utilities, motion
    │   └── sitemap.ts, robots.ts, icon.svg, apple-icon.png
    ├── proxy.ts                         `/` and any locale-less path → /en or /ar
    ├── assets/product/{light,dark}/     the screenshots (committed; regenerate with `capture`)
    ├── i18n/                            config (locales, dir), dictionaries/en.ts + ar.ts
    ├── config/site.ts                   SITE_URL, FIND_WORKSPACE_URL, CONTACT_EMAIL
    ├── lib/theme.ts                     theme modes, storage key, apply/subscribe
    ├── components/brand/logo.tsx        Logo lockup + LogoSymbol, from @crmpro/shared/brand
    ├── components/ui/button-link.tsx    CTA links (primary / outline / inverse)
    ├── components/site/                 header, footer, language link, theme switch, <Reveal>,
    │                                    <ProductShot> + <BrowserFrame>
    ├── features/home/components/        hero, problem-section, product-section (+ preview tabs),
    │                                    feature-grid, rising-arcade
    └── features/demo/                   actions.ts (server action), types.ts, components/
```

New pages go under `app/[locale]/<page>/page.tsx` with their sections in
`features/<page>/components/`, and are added to `PAGES` in `sitemap.ts`.

---

## Languages

- Every page lives under `/en` or `/ar`. `proxy.ts` redirects locale-less paths using, in order:
  the `NEXT_LOCALE` cookie (set by the language switch), the browser's `Accept-Language`, then
  English. Both locales are prerendered as static HTML.
- The language switch is a plain link (a full page load), because `<html lang>` and `dir` change
  with the locale.
- Arabic sets `dir="rtl"`. Layout uses logical properties (`start`/`end`, `ms`/`pe`) so it
  mirrors by itself; arrows mirror with `flip-rtl`. **The logo, the hero arches and charts never
  mirror** (`dir="ltr"` on them).
- Copy lives in `src/i18n/dictionaries/en.ts`; `ar.ts` is typed against it, so a missing key is
  a type error.
- Arabic text is set in Alexandria (it covers Arabic); Alan Sans is Latin only.

---

## Copy

**Voice:** plain and direct. Short sentences, everyday words, one idea per sentence. Say what
the product does for the reader ("your agents know who to call today"), not what it "is".

**Arabic is written, not translated.** Use clear, professional Modern Standard Arabic in short
sentences, the way a business software company writes: everyday words (فريق المبيعات، الأهداف،
عرض توضيحي، المتابعة التالية), one idea per sentence. Two things were tried and rejected:
heavy, translated-sounding MSA (hard to read) and colloquial Egyptian with sales slang such as
سيلز، تارجت (not professional). The name is **نومو** (never plain نمو). Have a native speaker
read new Arabic copy before it ships.

**Rules:**

- Claim only what the product does today. Every feature on the page maps to a real screen:
  Today, Dashboard ("Needs attention now"), Leads and its quick views, Deals, Targets, My
  performance, Projects, Marketing spend, custom roles and the audit log. Don't present post-MVP
  work (WhatsApp messaging, Meta/Google Ads integrations, AI) as available.
- No invented numbers about the company (customers, results, launch dates).
- Product images are real screenshots with sample data, labelled **Sample data**.
- Don't name real developers, competitors or third-party products as customers or partners.

---

## Brand and design

Source of truth: `brand/nomow/kit/A` (set A, "Rising Arcade") and its guidelines PDF.

- **Logo:** `@crmpro/shared/brand` exports the outlined symbol and wordmark paths
  (`LOGO_SYMBOL`, `LOGO_WORDMARK`), `BRAND_NAME`, `BRAND_NAME_AR`, `BRAND_DOMAIN` and core
  colours. `apps/web`, `apps/admin` and `apps/website` all draw the logo from it.
- **Type:** Alexandria 600 for display (lower-case English headlines, tight tracking); Alan Sans
  for text, tabular figures on.
- **Colour:** the kit's tokens: emerald `#00845b`, slate navy `#0f172a`, paper `#f5f7f9`.
- **Layout:** the kit's 12-column grid, max 1440px, 48px margins (16px on phones); small
  upper-case labels with an arrow introduce sections, as in the guidelines.

### Page

0. **Header:** a floating rounded bar, 12px below the top, aligned with the content edges and
   sticky while scrolling. On the home page it is in **overlay** mode: transparent with white
   text (and the `onDark` logo) over the hero photo, turning into the solid white bar once the
   photo has mostly scrolled away (70% of the screen height) or the menu opens. The link of the
   section on screen gets an emerald underline (`aria-current="location"`). Theme switch,
   language switch and "Book a demo" on the right; below `lg` they move into a menu panel
   (`aria-expanded`, closes on Escape or on choosing a link).
1. **Hero (cinematic, calm):** from references Mercury (full-screen photograph), Attio (calm
   centred message, product below) and Stripe (flowing ribbon). A photograph fills the whole first
   screen behind the header: modern residential towers seen from below, standing on the left and
   balancing the ribbon on the right. A small, quiet message sits in the open sky between them
   ("Book a demo" and "Sign in" as compact pills). A shade darkens only the sky behind the text.
   The photo is mirrored (towers left), scaled 1.4× from its top corner (so the towers sit beside
   the text, not behind it) and straightened: it was shot looking up, so vertical lines converge
   on a vanishing point, and a slight `perspective` tilt toward the viewer makes them vertical,
   like a shift lens. The tilt must be anchored at the vanishing point (about 19% across the
   screen, where the main tower's face is already upright): anchored at the centre, it pushed
   the towers into falling outward. Its strength follows the photo's displayed size
   (`perspective(max(66vw, 99svh, 614px))`, 7°), so it holds at every window size; checked at
   1000×575 up to 2000×1150. Phones see a different tower: 22°, anchored at the left edge.
   - **Ribbon** (`hero-ribbon.tsx`): Stripe's silk ribbon, in the brand's colours, as a WebGL
     fragment shader. Four soft, translucent bands (deep emerald, mint, sunset gold, a bright
     highlight thread) sweep in from the top and curve out through the right edge, each with
     feathered edges, colour across its width, fine fibres along its length and a sheen. It moves
     only during its entrance, then holds still (see the performance budget). Pushed further right
     on phones. This is the one place the site uses glow and
     gradients, at the product owner's request. (Two earlier versions, a CSS-masked glass band
     with stripes and a canvas-drawn twisting band, looked flat or geometric and were replaced.)
     Headless Chrome needs `--use-angle=swiftshader --enable-unsafe-swiftshader` to render it in
     screenshots; real browsers use the GPU.
   - **Hero scroll** (`ScrollProgress` `pass`, `components/site/scroll-progress.tsx`): the photo
     dollies in (scale +20%) and dusk falls over it, the silk drifts up and away, the message
     blurs out upward; the photo's lower edge fades into the page.
   - **Entrance** (on load): the photo settles from a close, dim frame into its light (2.6s);
     the header drifts down (0.3s); the label, both headline lines, the sentence and the buttons
     rise one after another from a soft blur (0.5s → 1.2s, `hero-in` with `--in` delays); the silk
     unfurls down from the top band by band, growing to full width, then one soft light glides
     down it (shader `uIntro`); the dashboard rises last (1.25s). All CSS keyframes in
     `globals.css` plus the shader; reduced motion shows the end state.
   - **Product scene** (`ScrollProgress` `track` + `product-tour.tsx`): the coded dashboard starts
     just under the buttons (the towers' lower floors show beside it), then pins below the header,
     vertically centred in the space under it (`--dw`/`--dh` compute its size in CSS; on phones
     the caption's height is included), up to 1480px wide. Scene height 260svh (200svh on
     phones). Timeline of the scene's `--p`: 0 → 0.28 it tilts from 30° to flat, grows from 84% to
     100% and assembles; then a **guided tour** of four steps (0.15 each): what needs you first,
     nudge in one click (nudges and toast run here), deals that stopped moving, money against
     target; from 0.92 the whole dashboard again. **Everything is continuous, never stepped**:
     each frame ProductTour eases its own position toward the scroll (light inertia, so a jumpy
     wheel still glides) and writes CSS variables on the scene: `--tour` (how much to dim the
     rest), `--f0…--f3` (each step's focus, a plateau that cross-fades with its neighbours, so
     something is always in focus), and `--zx/--zy/--zs` (the zoom, which holds on each step and
     pans to the next with a slight pull-back, like a camera). The dashboard's zoom, dimming and
     emerald ring and the captions' cross-fade all read those variables. No `will-change` on the
     zoom, so text re-renders crisply at each scale.
   - **Scene background** (`SceneBackground` in `hero.tsx`): the brand's 12-column grid and a dot
     pattern, both faint and masked to the centre, a soft emerald glow that follows the zoom point
     and a slowly breathing gold glow; fades in only once the scene is under way.
   - **Coded dashboard** (`dashboard-mock.tsx`): a faithful HTML replica of the CRM's manager
     dashboard with the seed's sample data, laid out at 1260×760 and scaled to fit; follows the
     site's light/dark theme, stays in English (the app is). Keep it in step with the real
     dashboard when that changes.
   - Reduced motion: no parallax or dolly, the silk drawn once and still, the product flat and
     assembled, no tour, numbers shown final, no nudges.
   - Photo: Zoshua Colah on Unsplash (unsplash.com/photos/F-sU9hFWBV8, residential towers in Hong
     Kong, not recognisable as such), Unsplash License (free for commercial use, no attribution
     required). Stored at `src/assets/hero/residential-towers.jpg`, 4800×3200 (2.3 MB, the master
     only), served through `next/image` as AVIF (WebP fallback) at each screen's size, quality 70.
     Keep the master at least 4000px wide: the hero is the full width of the screen and scaled
     1.4×, so a 2× laptop screen needs about 3840px.
   - Photos tried before it: Cairo with the pyramids (saved at 2400px, pixelated on Retina; other
     pyramid photos looked soft or postcard-like), and hot-air balloons over Luxor at sunrise (Joe
     deSousa, unsplash.com/photos/v4HHLOyNK0k), which the product owner liked and kept as the
     alternative; it works with a plain top-anchored crop (`origin-top scale-[1.05]`, 1.3 on
     phones). Free Unsplash photos of Egyptian towers are scarce and mostly hazy or busy.
   - Tried and rejected on the way (so they are not retried): a split hero with the dashboard
     beside the text, stepped emerald arches (as shapes and as windows), a navy panel with
     floating cards, a centred tilted screenshot, a collage of crops, and a filmstrip.
2. **Why Nomow:** scattered follow-ups (sheet, group chat, notebook, missed call) beside the real
   "Up next" card.
3. **Product:** "This is nomow." with the real wordmark in the headline (`{brand}` in the
   dictionary, rendered by `Wordmark`), then tabs over full real screens (Today, Dashboard, Leads, Deals, Targets) in a
   browser frame on a workspace host.
4. **Features:** three rows, each a short text beside a real crop (Needs attention, My
   performance, lead quick views), alternating sides; then three short points (projects,
   marketing spend, roles and audit). Text and image sit side by side, centred, so neither
   stretches to the other's height.
5. **Demo:** navy band with the form and the **rising arcade** (twelve arches, each a step up).

### Motion

Each element animates once, on load or when scrolled into view (`<Reveal>`). The loops are the
"Coming soon" dot, the slow drift of the scattered notes and the dashboard replica's nudges (the
hero ribbon animates only during its entrance). The hero-to-product transition is tied to scroll
position (`ScrollProgress`), not to time. Everything is off under
`prefers-reduced-motion`, and content is visible without JavaScript (the `js` class on `<html>`
is what lets reveal styles hide it first). Glass and gradients appear only in the hero ribbon.

### Performance budget

The hero is the heaviest part of the page; these rules keep it light (measured 2026-11-25,
1440×900 at 2×, idle, renderer main thread per second of wall time):

| State | Before | After |
| --- | --- | --- |
| Hero, idle | ribbon canvas 2160×1350 every frame | 0 rAF/s (518×540 at 30fps during the 4.2s entrance only) |
| Tour step, idle | 51 ms/s, style 20 ms/s, 15 rAF/s | 24 ms/s (the nudge animation), style 3.6 ms/s, 0 rAF/s |
| Past the scene | 57 ms/s, 55 rAF/s | 4 ms/s, 0 rAF/s |

- **Ribbon:** the canvas covers only the right 60% of the hero (where the silk is) and renders at
  60% of CSS resolution whatever the screen density. It animates only during its entrance (30fps,
  paused off screen, once the hero has mostly scrolled away, or in a hidden tab), then draws its
  final frame and stops: no work at all while idle, redrawn only on resize. (A 3D model would
  not be cheaper: it still needs a WebGL scene, plus a model download.)
- **Hero photo:** AVIF first, WebP fallback (`images.formats` in `next.config.ts`), quality 70,
  `priority`, with a blurred placeholder. `sizes` follows the 1.4× scale, and `deviceSizes` adds
  2560 and 3200 so wide screens are not pushed straight to 3840. Measured transfer: 182 KB at
  1440×900, 374 KB at 1440×900 on a 2× screen, 310 KB at 2000px, 85 KB on a phone (the towers'
  facades are detailed; the balloons photo was about half that).
- **No blur filters on anything that moves:** the scene's glows are radial gradients moved with
  `transform`; the captions and buttons over animated content have no `backdrop-filter`.
- **Loops sleep:** the tour's smoothing loop runs only while its eased position is moving and
  writes nothing when nothing changed; it wakes on scroll and resize. ScrollProgress works only on
  scroll. The nudge timer runs only while its step is in focus.
- **Static shadows:** no shadows whose size depends on a per-frame variable.
- **Layering:** the scene background is an absolute layer spanning exactly the scene, with a
  sticky screen-sized child, so it can never paint past the scene (a negative-margin sticky
  version overlapped the next section).
- To re-measure: CDP `Performance.getMetrics` over 5s idle windows (TaskDuration,
  RecalcStyleDuration) and a `requestAnimationFrame` counter; headless Chrome needs
  `--use-angle=swiftshader --enable-unsafe-swiftshader` for WebGL.

### Theme

Light, dark, or "match my device" (default). The switch is in the header (tablet and up) and the
footer. The choice is saved in `localStorage` (`nomow-theme`) and applied by the init script in
the layout before paint, so there is no flash. Colours come from CSS variables on `:root` and
`:root.dark` in `globals.css`; Tailwind's `dark:` variant follows the same `.dark` class.
Screenshots come in light and dark captures and follow the theme.

---

## Product screenshots

All product images are real screenshots of `apps/web`, captured from the seeded demo workspace
(`prime-estates`) in both themes at 2× (1440×900 viewport), saved as JPEG in
`src/assets/product/{light,dark}/` and served through `next/image`.

To refresh them after UI changes:

```bash
pnpm docker:up && pnpm db:seed          # once
pnpm dev:api                            # and, in another terminal:
pnpm dev:web                            # http://prime-estates.localhost:3001
pnpm --filter website capture           # THEMES=dark USERS=agent to redo part of the set
```

- The script signs in as the seeded **manager** and **agent**, never the owner, and renames the
  seed's owner ("Seif Admin" → "Sherif Adel") on screen before capturing, so no real person's name
  is published.
- It needs an installed Chrome (`CHROME_PATH` to override). Sign-in is rate limited per IP and
  email; if a run times out at sign-in, wait for the window to pass (locally you can delete the
  `rate-limit:default:login:*` keys in Redis).
- The list of shots and crops is `SHOTS` at the top of the script; `ProductShot` in
  `components/site/product-shot.tsx` maps names to files.
- Crops are exact: the element matching a CSS `selector` (preferred) or the box around a text
  `anchor`, with no padding, so no app chrome (sidebar strip, frame edge) leaks in. The website
  frames them itself.
- The seed's project names include real developers' projects (for example Palm Hills, Madinaty).
  They are visible in the Leads and Deals screenshots; decide before launch whether to keep them or
  change the seed's project names.

---

## Demo form

Four fields: name, mobile number, company, sales team size (optional). Team size is four
choices in a row (native radio buttons, styled), not a dropdown: one tap, all options visible,
no operating-system menu. It is built for conversion and access: visible labels, `autocomplete` and the right mobile keyboards, errors tied
to their fields (`aria-invalid`, `aria-describedby`) and announced, focus moved to the first
problem (or to the thank-you message), and it works without JavaScript (a server action with
`useActionState`). A hidden honeypot field drops bots.

**Where requests go:** the server action (`features/demo/actions.ts`) sends each request as a
**lead in Nomow's own workspace** through the CRM's inbound leads API
(`POST /api/v1/inbound/leads`, see `docs/api/inbound-leads.md`). So demo requests are followed up
in Nomow itself, with an owner and a next step.

- Payload: `fullName`, `phone`, `source: "Website"`, `externalId` (one per form view, so retries
  and double clicks never create a second lead), a `message` with the company, team size,
  language and page, and the ad's `utm_*` tags from the page URL.
- Setup: in Nomow's workspace, create an API key (Settings → Integrations; the workspace's plan
  needs API access), optionally pinned to a "Website" lead source. Set `DEMO_LEADS_URL` and
  `DEMO_LEADS_API_KEY` on the website server. Both are server-only.
- Without them, development logs the request and shows the thank-you message; production shows
  an error with the contact email instead.
- Tested locally against a stub that records the request; not yet against a real workspace (the
  seeded workspace's plan has no API access).

---

## Deployment (handoff)

`docs/infrastructure/deployment-plan.md` is the source of truth for hosting. Its §3 gives
`nomow.app` (production) to the "public site". What the website needs from it:

1. An image built from `apps/website` like `apps/web`'s (`NEXT_OUTPUT=standalone`, monorepo
   root traced, `@crmpro/shared` built first). It runs a Node server (server action, image
   optimization, proxy), not static files.
2. Caddy: `nomow.app` → the website; `www.nomow.app` → redirect to `nomow.app`.
3. Env per environment (table above), with the two `DEMO_LEADS_*` values as secrets.

### Open decisions

- **Where "find my workspace" lives.** The deployment plan has the apex serving
  "find my workspace" from `apps/web`. With the website on `nomow.app`, that flow needs its own
  address (for example a path on the apex routed to `apps/web`, or the website calling
  `POST /public/workspaces/find` itself). The site only needs the final URL in
  `NEXT_PUBLIC_FIND_WORKSPACE_URL`.
- **Staging.** `staging.nomow.app` is the staging "find my workspace" host today. A staging
  preview of the website needs its own host, one level under `nomow.app` (for example
  `site-staging.nomow.app`), and stays `noindex`.
- **Nomow's own workspace** for demo leads, on a plan with API access.
- **Contact inbox.** `hello@nomow.app` is a placeholder until the inbox exists
  (`mail.nomow.app` is a sending domain only).
- **Seed project names** in screenshots (see "Product screenshots").

---

## Roadmap

The landing page is step one. Planned growth, each a page under `app/[locale]/`:

1. Product pages per module (Leads, Today, Deals, Targets, Marketing spend).
2. Pricing, once plans are public.
3. Legal: privacy policy and terms (needed before the form collects data at scale).
4. Help or docs, if not hosted elsewhere.
