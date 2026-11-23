"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { IconX as XIcon } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { asChildProps, backdropClass, withBase } from "@/components/ui/base"

/*
 * Sheet = a Base UI dialog that slides in from an edge (pinroom): full screen
 * on phones for detail panels, a fixed width on larger screens. Menus and
 * selects opened inside it are tracked by Base UI as nested popups, so using
 * them no longer counts as an outside click (the old Radix workaround is gone).
 */

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function SheetClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

const SIDE_CLASSES = {
  right: cn(
    "inset-y-0 right-0 h-full w-full border-l sm:max-w-md",
    "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  ),
  left: cn(
    "inset-y-0 left-0 h-full w-full border-r sm:max-w-sm",
    "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  ),
  top: cn(
    "inset-x-0 top-0 h-auto border-b",
    "data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  ),
  bottom: cn(
    "inset-x-0 bottom-0 h-auto border-t",
    "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
  ),
} as const

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Popup> & {
  side?: keyof typeof SIDE_CLASSES
  showCloseButton?: boolean
  children?: React.ReactNode
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className={backdropClass}
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={withBase(
          cn(
            "fixed z-50 flex flex-col gap-4 bg-background shadow-2xl outline-none",
            "transition-transform duration-slow ease-smooth data-[ending-style]:ease-exit motion-reduce:transition-none",
            SIDE_CLASSES[side],
          ),
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            aria-label="Close"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-enter hover:bg-muted hover:text-foreground disabled:pointer-events-none"
          >
            <XIcon className="size-4" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-border/60 px-6 py-4 pr-12", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex items-center justify-end gap-2 border-t border-border/60 px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={withBase("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={withBase("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
