/**
 * Captures the real product screenshots shown on the website, from a local
 * CRM (apps/web + apps/api) running on the seeded demo workspace.
 *
 *   pnpm docker:up && pnpm db:seed        # once
 *   pnpm dev:api & pnpm dev:web           # http://prime-estates.localhost:3001
 *   pnpm --filter website capture         # writes src/assets/product/{light,dark}/*.jpg
 *
 * Captures as the seeded manager and agent (never the owner, whose seed name is
 * a real person's). Uses an installed Chrome (CHROME_PATH to override).
 * See docs/website/README.md → "Product screenshots".
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.CRM_URL ?? "http://prime-estates.localhost:3001";
// The seed's default demo password (packages/database/prisma/seed.ts), unless overridden there too.
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "Password123!";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/assets/product");
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Each shot: who signs in, which page, and either the whole viewport or a crop: the element
 * matching `selector`, or the nearest ancestor of the text `anchor` at least `minWidth` wide and
 * `minHeight` tall, cut to `maxHeight`. Crops are exact (no padding), so no app chrome
 * (sidebar, frame edges) leaks into them; the website adds its own padding around them.
 */
const SHOTS = [
  { name: "dashboard", user: "manager", path: "/dashboard" },
  { name: "leads", user: "manager", path: "/leads" },
  { name: "deals", user: "manager", path: "/deals" },
  { name: "targets", user: "manager", path: "/targets" },
  { name: "today", user: "agent", path: "/today" },
  { name: "crop-today-next", user: "agent", path: "/today", anchor: "Up next", exact: false, minWidth: 620, minHeight: 200 },
  { name: "crop-attention", user: "manager", path: "/dashboard", selector: 'section[aria-labelledby="attention-heading"]' },
  { name: "crop-performance", user: "agent", path: "/performance", anchor: "Last 12 months", minWidth: 560, minHeight: 300, showNumbers: true },
  { name: "crop-lead-views", user: "manager", path: "/leads", anchor: "Never contacted", minWidth: 1100, minHeight: 400, maxHeight: 560 },
];

/**
 * The seed names its owner after a real person; that name must not appear on a public page.
 * Swapped for a fictional one with the same initials before every screenshot.
 */
const RENAME = [
  ["Seif Admin", "Sherif Adel"],
  ["Seif", "Sherif"],
];

const USERS = { manager: "manager@primeestates.com", agent: "agent@primeestates.com" };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// THEMES=dark USERS=agent re-runs part of the set (sign-in is rate limited).
const themes = (process.env.THEMES ?? "light,dark").split(",");
const onlyUsers = process.env.USERS?.split(",");

for (const theme of themes) {
  mkdirSync(join(OUT, theme), { recursive: true });
  for (const [user, email] of Object.entries(USERS)) {
    if (onlyUsers && !onlyUsers.includes(user)) continue;
    const shots = SHOTS.filter((shot) => shot.user === user);
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: theme });
    await context.addInitScript((value) => localStorage.setItem("crmpro-theme", value), theme);
    const page = await context.newPage();

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });

    for (const shot of shots) {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      if (shot.showNumbers) await page.getByRole("button", { name: "Show numbers" }).first().click();
      await page.waitForTimeout(2500);
      await page.evaluate((pairs) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          for (const [from, to] of pairs) node.nodeValue = node.nodeValue.replaceAll(from, to);
        }
      }, RENAME);

      const file = join(OUT, theme, `${shot.name}.jpg`);
      if (!shot.anchor && !shot.selector) {
        await page.screenshot({ path: file, type: "jpeg", quality: 90 });
      } else {
        const target = shot.selector
          ? page.locator(shot.selector).first()
          : page.getByText(shot.anchor, { exact: shot.exact ?? true }).first();
        const box = await target.evaluate((node, { minWidth, minHeight }) => {
          let element = node;
          const small = (el) => el.getBoundingClientRect().width < minWidth || el.getBoundingClientRect().height < minHeight;
          while (element.parentElement && small(element)) element = element.parentElement;
          const rect = element.getBoundingClientRect();
          return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        }, { minWidth: shot.minWidth ?? 0, minHeight: shot.minHeight ?? 0 });
        const clip = { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, shot.maxHeight ?? Infinity) };
        await page.screenshot({ path: file, type: "jpeg", quality: 90, clip, fullPage: true });
      }
      console.log(`saved ${theme}/${shot.name}.jpg`);
    }
    await context.close();
  }
}

await browser.close();
