"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrowserFrame } from "@/components/site/product-shot";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import { DashboardMock, TOUR_ZOOM, type DashboardFocus } from "./dashboard-mock";

/**
 * The pinned product scene's content: the coded dashboard, flattening from 3D as
 * it pins, then a guided tour scrubbed by scroll.
 *
 * Everything is continuous, not stepped: each animation frame this component
 * eases its own position toward the scene's scroll progress (light inertia, so a
 * jumpy wheel still glides) and writes CSS variables on the scene element:
 *   --p          smoothed scene progress (overrides the raw one for children)
 *   --tour       0 → 1 → 0, how much "tour mode" is on (dimming the rest)
 *   --f0 … --f3  how much each step is in focus (plateau with soft shoulders)
 *   --zx --zy --zs  where the view zooms (origin in %, scale), panning between
 *                   steps with a slight pull-back in the middle, like a camera.
 * The dashboard, the captions and the scene background read those variables.
 *
 * Timeline (p): 0 → 0.28 flatten and assemble; tour from 0.32, four steps of 0.15;
 * whole dashboard again from 0.92. Reduced motion: no tour, everything in place.
 */

const STEPS: DashboardFocus[] = ["attention", "overdue", "stuck", "money"];
const TOUR_START = 0.32;
const STEP_LENGTH = 0.15;
const SMOOTHING = 0.14; // share of the remaining distance covered per frame

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Zoom keyframes: neutral before the tour, one per step centre, neutral after. */
const NEUTRAL = { x: 50, y: 50, s: 1 };
const KEYS = [
  { t: -0.35, ...NEUTRAL },
  ...STEPS.map((step, index) => ({ t: index + 0.5, ...TOUR_ZOOM[step] })),
  { t: STEPS.length + 0.35, ...NEUTRAL },
];

function zoomAt(t: number) {
  if (t <= KEYS[0].t) return NEUTRAL;
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (t <= b.t) {
      // Hold on each step for its middle, then pan (eased) to the next one.
      const span = b.t - a.t;
      const e = smooth(((t - a.t) / span - 0.3) / 0.4);
      const pullBack = a.s > 1 && b.s > 1 ? 0.1 * Math.sin(Math.PI * e) : 0;
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), s: lerp(a.s, b.s, e) - pullBack };
    }
  }
  return NEUTRAL;
}

/** Captions sit opposite where the view zooms. */
const CAPTION_PLACE = [
  "sm:bottom-[8%] sm:left-[3%]",
  "sm:top-[30%] sm:right-[3%]",
  "sm:top-[30%] sm:left-[3%]",
  "sm:top-[16%] sm:right-[3%]",
];

export function ProductTour({ copy, label }: { copy: Dictionary["hero"]["tour"]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    const scene = element?.closest<HTMLElement>("[data-scroll-scene]");
    if (!element || !scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let running = false;
    let current = Number.NaN;
    let written = Number.NaN;

    // Performance: runs only while the eased position is still moving toward the scroll
    // position; once settled it sleeps until the next scroll or resize.
    const tick = () => {
      frame = 0;
      const target = Number.parseFloat(scene.style.getPropertyValue("--p")) || 0;
      current = Number.isNaN(current) ? target : current + (target - current) * SMOOTHING;
      const settled = Math.abs(target - current) < 0.0004;
      if (settled) current = target;
      if (current === written) return; // nothing changed: write nothing, schedule nothing
      written = current;

      const t = (current - TOUR_START) / STEP_LENGTH; // tour position, steps 0..4
      const tour = smooth((t + 0.35) / 0.55) * (1 - smooth((t - STEPS.length + 0.2) / 0.55));
      const zoom = zoomAt(t);
      element.style.setProperty("--p", current.toFixed(4));
      scene.style.setProperty("--tour", tour.toFixed(3));
      STEPS.forEach((_, index) => {
        // Each step holds full focus in its middle and cross-fades with its neighbours at the
        // boundary (both at half strength there), so there is never a moment with nothing in focus.
        const focus = clamp01((0.62 - Math.abs(t - (index + 0.5))) / 0.24);
        scene.style.setProperty(`--f${index}`, smooth(focus).toFixed(3));
      });
      scene.style.setProperty("--zx", zoom.x.toFixed(2));
      scene.style.setProperty("--zy", zoom.y.toFixed(2));
      scene.style.setProperty("--zs", zoom.s.toFixed(4));

      const index = Math.round(t - 0.5);
      const next = t > 0 && t < STEPS.length && index >= 0 && index < STEPS.length ? index : null;
      setActive((previous) => (previous === next ? previous : next));

      if (running && !settled) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (running && !frame) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      wake();
    });
    observer.observe(scene);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      running = false;
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="hero-rise-in relative">
      <div
        className="origin-top will-change-transform [transform:rotateX(calc((1-var(--e))*30deg))_scale(calc(0.84+var(--e)*0.16))]"
        style={{ "--e": "clamp(0, calc(var(--p) / 0.28), 1)" } as CSSProperties}
      >
        <BrowserFrame className="[box-shadow:0_-30px_90px_-30px_rgb(0_0_0/0.55),0_30px_110px_-10px_rgb(0_132_91/0.26)]">
          <DashboardMock label={label} assemble focus={active === null ? null : STEPS[active]} />
        </BrowserFrame>
      </div>

      {/* Captions: all four, cross-fading with the focus (stacked in one cell on phones). */}
      <div className="mt-3 grid sm:contents">
        {copy.steps.map((caption, step) => (
          <div
            key={caption.title}
            aria-hidden={active !== step}
            className={cn(
              "z-20 [grid-area:1/1] rounded-2xl border border-white/50 bg-card/95 p-5 shadow-frame sm:absolute sm:w-[min(360px,34%)] dark:border-white/10",
              "[opacity:var(--f)] [transform:translate3d(0,calc((1-var(--f))*18px),0)]",
              active !== step && "pointer-events-none",
              CAPTION_PLACE[step],
            )}
            style={{ "--f": `var(--f${step}, 0)` } as CSSProperties}
          >
            <div className="eyebrow flex items-center gap-2 text-primary">
              <span className="tabular-nums" dir="ltr">
                {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
              <span className="font-normal text-subtle-foreground">· {copy.label}</span>
            </div>
            <div className="mt-2 font-display text-xl leading-snug font-semibold">{caption.title}</div>
            <p className="mt-1.5 text-[15px] text-pretty text-muted-foreground">{caption.text}</p>
            <div className="mt-4 flex gap-1.5" aria-hidden="true">
              {STEPS.map((name, index) => (
                <span key={name} className={cn("h-1 rounded-full", index === step ? "w-6 bg-primary" : "w-1.5 bg-border")} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
