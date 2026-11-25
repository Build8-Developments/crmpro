"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowsExchange,
  IconBell,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconCoins,
  IconFileExport,
  IconFileImport,
  IconFiles,
  IconHelpCircle,
  IconLayoutDashboard,
  IconLayoutSidebar,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTarget,
  IconTrophy,
  IconUserOff,
  IconUserQuestion,
  IconUsers,
  IconBuildingCommunity,
  IconBriefcase,
  IconBellRinging,
} from "@tabler/icons-react";
import { LOGO_WORDMARK } from "@crmpro/shared/brand";
import { cn } from "@/lib/utils";

/**
 * A coded replica of the CRM's manager dashboard (apps/web), with the seed's sample
 * data, so the website can animate it: the attention numbers count up when it comes
 * into view, then a manager "nudges" agents with overdue tasks one by one, each with
 * a confirmation toast. Laid out at a large-laptop size (1260×760) and scaled to fit.
 * The app is in English, so the replica is too, on Arabic pages as well.
 */

const WIDTH = 1260;
const HEIGHT = 760;
const NUDGE_EVERY_MS = 3400;

const NAV = [
  { group: "Sales", items: [["Today", IconCalendarEvent], ["My performance", IconTrophy], ["Dashboard", IconLayoutDashboard], ["Leads", IconUsers], ["Deals", IconBriefcase]] },
  { group: "Manage", items: [["Targets", IconTarget], ["Marketing spend", IconCoins]] },
  { group: "Catalog", items: [["Projects", IconBuildingSkyscraper], ["Developers", IconBuildingCommunity]] },
  { group: "Data", items: [["Files", IconFiles], ["Imports", IconFileImport], ["Exports", IconFileExport]] },
] as const;

const KPIS = [
  { label: "SLA breaches today", value: 0, sub: "First call missed the SLA", Icon: IconClock },
  { label: "Overdue tasks", value: 127, sub: "201 tasks · 10 agents", Icon: IconAlertTriangle, alert: true },
  { label: "Hot, untouched > 48h", value: 38, sub: "Hot leads not contacted", Icon: IconActivity, alert: true },
  { label: "No next step", value: 0, sub: "Assigned, no open task", Icon: IconUserQuestion },
  { label: "Stuck deals", value: 48, sub: "+ 127 stale leads", Icon: IconArrowsExchange, alert: true },
  { label: "Unassigned", value: 0, sub: "Every open lead has an owner", Icon: IconUserOff },
];

const OVERDUE = [
  { name: "Yasmin Tarek", tasks: 43, leads: 30, oldest: "66d" },
  { name: "Omar Khaled", tasks: 24, leads: 17, oldest: "69d" },
  { name: "Nour El-Sayed", tasks: 24, leads: 16, oldest: "13d" },
  { name: "Mona Adel", tasks: 24, leads: 13, oldest: "9d" },
  { name: "Mahmoud Reda", tasks: 22, leads: 12, oldest: "8d" },
];

const HOT = [
  { name: "Omar Khaled", leads: 8 },
  { name: "Mona Adel", leads: 6 },
  { name: "Yasmin Tarek", leads: 6 },
  { name: "Karim Fathy", leads: 5 },
  { name: "Mahmoud Reda", leads: 3 },
];

const STUCK = [
  ["Contacted", ">14d", 22],
  ["Proposal · Default Sales Pipeline", ">14d", 11],
  ["Negotiation", ">21d", 6],
  ["Qualified", ">21d", 5],
] as const;
const STALE = [
  ["New Lead", ">3d", 38],
  ["Contacted", ">7d", 29],
  ["Qualified", ">7d", 20],
  ["Negotiation", ">5d", 12],
  ["Site Visit", ">7d", 5],
] as const;

const MONEY = [
  { label: "Revenue (contracted)", value: "233.7M EGP", change: "48.2%", note: "47% of workspace target 500M EGP" },
  { label: "Commission", value: "5M EGP", change: "53.7%", note: "48% of workspace target 10.4M EGP" },
  { label: "Deals reserved", value: "38", change: "5%", note: "95% of workspace target 40" },
];

/**
 * With `assemble`, the parts slide into place as the scroll scene's `--p` (set by
 * ScrollProgress on an ancestor) runs from `from` to `to`. Without it (or with
 * reduced motion, where --p is 1) everything is simply in place.
 */
function assembled(on: boolean, from: number, to: number, className: string, axis: "x" | "y" = "y") {
  if (!on) return { className };
  return {
    className: cn(
      className,
      axis === "y"
        ? "[transform:translate3d(0,calc((1-var(--q))*44px),0)]"
        : "[transform:translate3d(calc((var(--q)-1)*40px),0,0)]",
      "[opacity:calc(0.4+var(--q)*0.6)]",
    ),
    style: { "--q": `clamp(0, calc((var(--p, 1) - ${from}) / ${to - from}), 1)` } as CSSProperties,
  };
}

export type DashboardFocus = "attention" | "overdue" | "stuck" | "money";

/** Where the view zooms for each tour step: transform-origin (% of the 1260×760 layout) and scale. */
export const TOUR_ZOOM: Record<DashboardFocus, { x: number; y: number; s: number }> = {
  attention: { x: 96, y: 32, s: 1.16 },
  overdue: { x: 29, y: 60, s: 1.32 },
  stuck: { x: 97, y: 60, s: 1.3 },
  money: { x: 96, y: 100, s: 1.18 },
};
const FOCUS_INDEX: Record<DashboardFocus, number> = { attention: 0, overdue: 1, stuck: 2, money: 3 };

/**
 * Tour mode (`focus` given, driven by ProductTour): the zoom, the dimming and the
 * focus ring all follow CSS variables that ProductTour eases every frame
 * (--zx/--zy/--zs, --tour, --f0…--f3), so they move continuously with scroll.
 * `focus` itself only decides when the nudges run (while "overdue" is in focus).
 * Without `focus` the nudges simply loop.
 */
export function DashboardMock({
  label,
  assemble = false,
  focus,
}: {
  label: string;
  assemble?: boolean;
  focus?: DashboardFocus | null;
}) {
  const tour = focus !== undefined;
  // Spotlight in tour mode: the part in focus keeps full strength and gains an emerald ring;
  // everything else fades with --tour. All continuous (CSS variables), no class switching.
  const spot = (area: DashboardFocus | null): { className: string; style?: CSSProperties } => {
    if (!tour) return { className: "" };
    const f = area === null ? "0" : `var(--f${FOCUS_INDEX[area]}, 0)`;
    return {
      className:
        "relative [opacity:calc(1-var(--tour,0)*0.68*(1-var(--focus)))] [filter:saturate(calc(1-var(--tour,0)*0.5*(1-var(--focus))))] [box-shadow:0_0_0_calc(var(--focus)*2px)_rgb(0_132_91/var(--focus)),0_0_0_calc(var(--focus)*8px)_rgb(0_132_91/calc(var(--focus)*0.14)),0_18px_40px_-12px_rgb(0_0_0/calc(var(--focus)*0.25))]",
      style: { "--focus": f, zIndex: area ? 10 : undefined } as CSSProperties,
    };
  };
  const dim = tour ? "[opacity:calc(1-var(--tour,0)*0.6)]" : "";
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [started, setStarted] = useState(false);
  const [counter, setCounter] = useState(0); // 0..1 count-up progress
  const [nudged, setNudged] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);

  // Fit the fixed-size layout to the available width.
  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Start once it is mostly on screen; with reduced motion show the end state.
  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (reduced) setCounter(1);
        else setStarted(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Count the attention numbers up.
  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - begin) / 1300);
      setCounter(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started]);

  // Nudge the agents with overdue tasks, one at a time, then start over. In tour mode this
  // runs only while the overdue list is in focus, starting afresh each time it gets focus.
  const nudging = started && (!tour || focus === "overdue");
  useEffect(() => {
    if (!nudging) return;
    let step = 0;
    const id = window.setInterval(
      () => {
        const index = step % (OVERDUE.length + 1);
        if (index === OVERDUE.length) {
          setNudged([]);
          setCurrent(null);
        } else {
          setCurrent(index);
          setNudged((list) => (index === 0 ? [0] : [...list, index]));
        }
        step += 1;
      },
      tour ? 1300 : NUDGE_EVERY_MS,
    );
    return () => window.clearInterval(id);
  }, [nudging, tour]);

  const toast = current !== null && nudging ? OVERDUE[current] : null;


  return (
    <div ref={outer} role="img" aria-label={label} className="relative w-full overflow-hidden" style={{ height: HEIGHT * scale }}>
      <div
        aria-hidden="true"
        dir="ltr"
        className="absolute top-0 left-0 origin-top-left overflow-hidden bg-background text-[12px] leading-snug text-foreground"
        style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}
      >
        <div
          // No will-change here: the zoom must re-render crisply at each scale, not stretch a bitmap.
          className="grid size-full grid-cols-[208px_1fr]"
          style={
            tour
              ? { transformOrigin: "calc(var(--zx, 50) * 1%) calc(var(--zy, 50) * 1%)", transform: "scale(var(--zs, 1))" }
              : undefined
          }
        >
        {/* Sidebar */}
        <aside className={cn("flex flex-col bg-navy px-3 py-3 text-[12.5px] text-[#c3c9d6]", dim)}>
          <div className="flex items-center gap-2.5 px-1.5 pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-[#00845b] font-display text-[13px] font-semibold text-white">P</span>
            <span className="leading-tight">
              <span className="block font-display text-[13px] font-semibold text-white">Prime Estates</span>
              <span className="flex items-center gap-1 text-[10px] text-[#8591aa]">
                powered by
                <svg viewBox={LOGO_WORDMARK.viewBox} className="h-[7px] w-auto fill-current">
                  <path d={LOGO_WORDMARK.lettersPath} />
                  <path d={LOGO_WORDMARK.dotPath} />
                </svg>
              </span>
            </span>
          </div>
          {NAV.map((section) => (
            <div key={section.group} className="mt-2">
              <div className="px-2 pb-1 text-[9.5px] font-semibold tracking-[0.12em] text-[#66728e] uppercase">{section.group}</div>
              {section.items.map(([name, Icon]) => (
                <div
                  key={name}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-[6px]",
                    name === "Dashboard" && "bg-white/[0.08] text-white",
                  )}
                >
                  <Icon className={cn("size-[15px]", name === "Dashboard" && "text-[#36b987]")} stroke={1.6} />
                  {name}
                </div>
              ))}
            </div>
          ))}
          <div className="mt-auto space-y-0.5 border-t border-white/[0.06] pt-2">
            <div className="flex items-center gap-2.5 px-2 py-[6px]"><IconHelpCircle className="size-[15px]" stroke={1.6} />Help &amp; support</div>
            <div className="flex items-center gap-2.5 px-2 py-[6px]"><IconSettings className="size-[15px]" stroke={1.6} />Settings</div>
          </div>
        </aside>

        {/* Main */}
        <div className="relative flex min-w-0 flex-col overflow-hidden">
          {/* Topbar */}
          <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-card px-4">
            <IconLayoutSidebar className="size-4 text-subtle-foreground" stroke={1.6} />
            <span className="font-semibold">Dashboard</span>
            <div className="mx-auto flex h-7 w-[340px] items-center gap-2 rounded-md border border-line px-2.5 text-[11px] text-subtle-foreground">
              <IconSearch className="size-3.5" />
              Search or jump to…
              <span className="ms-auto rounded border border-line px-1 text-[9px]">⌘K</span>
            </div>
            <span className="relative">
              <IconBell className="size-4 text-muted-foreground" stroke={1.6} />
              <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-[#00845b] text-[7px] font-bold text-white">27</span>
            </span>
            <span className="flex h-7 items-center gap-1.5 rounded-md bg-[#00845b] ps-2.5 pe-2 text-[11.5px] font-semibold text-white">
              <IconPlus className="size-3.5" stroke={2.2} /> New <span className="ms-1 border-s border-white/30 ps-1.5"><IconChevronDown className="size-3" /></span>
            </span>
            <span className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">KF</span>
              <span className="leading-tight">
                <span className="block text-[11.5px] font-semibold">Karim Fathy</span>
                <span className="block text-[10px] text-muted-foreground">Manager</span>
              </span>
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-hidden px-6 pt-5">
            {/* Title + period */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-[20px] font-semibold tracking-[-0.01em]">Dashboard</div>
                <div className="text-[11.5px] text-muted-foreground">What needs you now, money, the team, sources and losses</div>
              </div>
              <div className="flex rounded-lg border border-line bg-card p-0.5 text-[11.5px]">
                {["This month", "Last month", "Last 30 days", "Last 90 days"].map((period, index) => (
                  <span key={period} className={cn("rounded-md px-2.5 py-1", index === 0 ? "bg-[#00845b] font-semibold text-white" : "text-muted-foreground")}>
                    {period}
                  </span>
                ))}
              </div>
            </div>

            {/* Needs attention now */}
            <div {...assembled(assemble, 0.04, 0.2, "")}>
              <div className="font-semibold">Needs attention now</div>
              <div className="text-[10.5px] text-muted-foreground">
                Live numbers — the period above does not change them. Updated just now.
              </div>
              <div {...spot("attention")} className={cn("mt-2 grid grid-cols-6 overflow-hidden rounded-xl border border-line bg-card", spot("attention").className)}>
                {KPIS.map((kpi) => (
                  <div
                    key={kpi.label}
                    className={cn(
                      "border-e border-line p-3 last:border-e-0",
                      kpi.alert && "border-s-2 border-s-[#e59b37] bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 text-[10.5px] text-muted-foreground">
                      {kpi.label}
                      <kpi.Icon className={cn("size-3.5 shrink-0", kpi.alert ? "text-[#cf8925]" : "text-subtle-foreground")} stroke={1.7} />
                    </div>
                    <div className={cn("mt-1.5 font-display text-[22px] font-semibold tabular-nums", kpi.alert ? "text-[#c2410c] dark:text-[#f3bd7f]" : "mt-4")}>
                      {Math.round(kpi.value * counter)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>
                    {kpi.alert ? (
                      <div className="mt-1.5 flex gap-2.5 text-[10px]">
                        <span className="font-semibold text-primary">Open list</span>
                        <span className="text-muted-foreground">Reassign</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Lists */}
            <div {...assembled(assemble, 0.1, 0.26, "grid grid-cols-3 gap-3")}>
              <Card title="Overdue tasks by agent" Icon={IconAlertTriangle} {...spot("overdue")}>
                {OVERDUE.map((agent, index) => {
                  const done = nudged.includes(index);
                  return (
                    <Row key={agent.name} highlight={current === index}>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{agent.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {agent.tasks} tasks · on {agent.leads} leads · oldest {agent.oldest}
                        </div>
                      </div>
                      <NudgeButton done={done} />
                    </Row>
                  );
                })}
                <div className="px-3 py-2 text-[10px] text-muted-foreground">+5 more agents</div>
              </Card>
              <Card title="Hot leads untouched > 48h" Icon={IconActivity} {...spot(null)}>
                {HOT.map((agent) => (
                  <Row key={agent.name}>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-[10px] text-muted-foreground">{agent.leads} hot leads</div>
                    </div>
                    <NudgeButton done={false} />
                  </Row>
                ))}
              </Card>
              <Card title="Stuck & stale by stage" Icon={IconArrowsExchange} {...spot("stuck")}>
                <div className="space-y-2 p-3">
                  <div className="text-[10px] text-muted-foreground">Stuck</div>
                  <Chips items={STUCK} />
                  <div className="pt-1 text-[10px] text-muted-foreground">Stale</div>
                  <Chips items={STALE} />
                </div>
              </Card>
            </div>

            {/* Money */}
            <div {...assembled(assemble, 0.16, 0.3, "")}>
              <div className="font-semibold">Are we making money?</div>
              <div {...spot("money")} className={cn("mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-card", spot("money").className)}>
                {MONEY.map((item) => (
                  <div key={item.label} className="border-e border-line p-3 last:border-e-0">
                    <div className="text-[10.5px] text-muted-foreground">{item.label}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-display text-[20px] font-semibold">{item.value}</span>
                      <span className="rounded bg-[#ffe9e6] px-1 text-[9.5px] font-semibold text-[#b4312b] dark:bg-[#471713] dark:text-[#feb2a8]">▼ {item.change}</span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-muted">
                      <div className="h-full w-1/2 rounded-full bg-[#e59b37]" />
                    </div>
                    <div className="mt-1 text-[10px] text-[#c2410c] dark:text-[#f3bd7f]">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        </div>
          {/* Confirmation toast */}
          {toast ? (
            <div
              key={toast.name}
              className="toast-in absolute right-5 bottom-5 z-20 flex items-center gap-3 rounded-xl bg-navy px-4 py-3 text-white shadow-card"
            >
              <span className="grid size-7 place-items-center rounded-full bg-[#00845b]">
                <IconBellRinging className="size-4" stroke={1.8} />
              </span>
              <span className="leading-tight">
                <span className="block text-[12px] font-semibold">Nudge sent to {toast.name}</span>
                <span className="block text-[10.5px] text-[#9ca5b9]">{toast.tasks} overdue tasks · they’ll see it in Today</span>
              </span>
            </div>
          ) : null}
      </div>
    </div>
  );
}

function Card({
  title,
  Icon,
  className,
  style,
  children,
}: {
  title: string;
  Icon: typeof IconActivity;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-card", className)} style={style}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-[11.5px] font-semibold">
        <Icon className="size-3.5 text-muted-foreground" stroke={1.7} />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ highlight = false, children }: { highlight?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-line px-3 py-2 transition-colors duration-500",
        highlight && "bg-primary-soft/60",
      )}
    >
      {children}
    </div>
  );
}

function NudgeButton({ done }: { done: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-[10.5px]">
      <span
        className={cn(
          "flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold transition-colors duration-500",
          done ? "border-transparent bg-[#00845b] text-white" : "border-line text-foreground",
        )}
      >
        {done ? <IconCheck className="size-3" stroke={2.4} /> : <IconBell className="size-3" stroke={1.8} />}
        {done ? "Nudged" : "Nudge"}
      </span>
      <span className="text-muted-foreground">Reassign</span>
    </span>
  );
}

function Chips({ items }: { items: readonly (readonly [string, string, number])[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([stage, age, count]) => (
        <span key={`${stage}${age}`} className="rounded-md border border-line bg-muted/40 px-1.5 py-1 text-[10px]">
          <span className="font-semibold">{stage}</span> <span className="text-muted-foreground">{age}</span>{" "}
          <span className="font-semibold">{count}</span>
        </span>
      ))}
    </div>
  );
}
