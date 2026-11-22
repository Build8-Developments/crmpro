import { isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Shared plumbing for the Base UI-backed primitives (dialog, sheet, menus,
 * select, tooltip). Motion follows pinroom: CSS *transitions* driven by Base
 * UI's `data-starting-style` / `data-ending-style`, so an open/close that is
 * interrupted reverses smoothly from where it is instead of jumping.
 */

/** Floating panels: menus, context menus, select lists. Grow from the trigger. */
export const floatingPanelClass = cn(
  "z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none",
  "origin-[var(--transform-origin)] transition-[opacity,scale] duration-base ease-enter",
  "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
  "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[ending-style]:ease-exit",
  "motion-reduce:transition-none",
);

/** Rows inside floating panels. */
export const floatingItemClass = cn(
  "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
  "transition-colors duration-fast ease-enter",
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:[&_svg:not([class*='text-'])]:text-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
);

/** Dimmed backdrop behind dialogs and sheets. */
export const backdropClass = cn(
  "fixed inset-0 z-50 bg-black/40 dark:bg-black/60",
  "transition-opacity duration-slow ease-enter",
  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:ease-exit",
  "motion-reduce:transition-none",
);

/**
 * Base UI accepts a class name or a function of the part's state. This adds
 * our base classes either way.
 */
export function withBase<State>(
  base: string,
  className: string | ((state: State) => string | undefined) | undefined,
): string | ((state: State) => string) {
  if (typeof className === "function") {
    return (state: State) => cn(base, className(state));
  }
  return cn(base, className);
}

/**
 * Keeps the shadcn/Radix `asChild` API working on Base UI: the single child
 * element becomes Base UI's `render` target and receives the part's props.
 */
export function asChildProps(
  asChild: boolean | undefined,
  children: ReactNode,
): { render?: ReactElement; children?: ReactNode } {
  if (asChild && isValidElement(children)) {
    return { render: children as ReactElement };
  }
  return { children };
}
