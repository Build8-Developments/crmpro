"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Sets `--p` (0 → 1) on its element as the page scrolls, once per animation
 * frame, without re-rendering React. Children animate from it in CSS, e.g.
 * `[transform:translateY(calc(var(--p)*-40px))]`.
 *
 * - `pass`: how far the element has scrolled up past the top of the screen
 *   (0 when its top is at the top, 1 when it has fully left). For the hero.
 * - `enter`: how far it has come up into view (0 when its top is at the bottom
 *   of the screen, 1 when its top reaches `end` of the screen height). For reveals.
 * - `track`: progress through a tall scroll scene with a sticky child: 0 when
 *   its top is at `start` of the screen height, 1 after scrolling its height
 *   minus `hold` screen heights. For pinned sequences.
 *
 * With reduced motion `--p` is fixed at `reduced` (the resting state).
 */
export function ScrollProgress({
  mode,
  end = 0.2,
  start = 1,
  hold = 0.6,
  initial = 0,
  reduced,
  as: Tag = "div",
  scene = false,
  className,
  style,
  children,
}: {
  mode: "pass" | "enter" | "track";
  end?: number;
  start?: number;
  hold?: number;
  /** Server-rendered value, close to where the element is at load, so nothing jumps on hydration. */
  initial?: number;
  reduced: number;
  as?: "div" | "section";
  /** Marks the element as a scroll scene, so children can read its `--p` (see ProductTour). */
  scene?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.style.setProperty("--p", String(reduced));
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const raw =
        mode === "pass"
          ? -rect.top / Math.max(rect.height, 1)
          : mode === "track"
            ? (viewport * start - rect.top) / Math.max(rect.height - viewport * hold, 1)
            : (viewport - rect.top) / Math.max(viewport * (1 - end), 1);
      element.style.setProperty("--p", Math.min(1, Math.max(0, raw)).toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mode, end, start, hold, reduced]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      data-scroll-scene={scene ? "" : undefined}
      className={className}
      style={{ "--p": initial, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
