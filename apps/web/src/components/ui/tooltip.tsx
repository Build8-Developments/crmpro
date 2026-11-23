"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"
import { asChildProps, withBase } from "@/components/ui/base"

/*
 * Tooltip on Base UI. Quick opacity-only fade (pinroom), and once one tooltip
 * is open, moving to the next shows it instantly (the provider's grouping).
 */

function TooltipProvider({
  delayDuration = 0,
  ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive.Provider>, "delay"> & {
  /** Radix name kept for callers; maps to Base UI `delay`. */
  delayDuration?: number
}) {
  return <TooltipPrimitive.Provider delay={delayDuration} {...props} />
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof TooltipPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        className="z-50"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={withBase(
            cn(
              "w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background shadow-md",
              "transition-opacity duration-fast ease-enter",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[instant]:transition-none",
              "motion-reduce:transition-none",
            ),
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
