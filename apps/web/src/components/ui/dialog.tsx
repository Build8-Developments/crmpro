"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { IconX as XIcon } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { asChildProps, backdropClass, withBase } from "@/components/ui/base"

/*
 * Dialog on Base UI (same API as before: open/onOpenChange, asChild triggers,
 * showCloseButton). Centred on larger screens; on phones it docks to the
 * bottom and rises like a sheet so the thumb and the keyboard reach it.
 */

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close> & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={withBase(backdropClass, className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & {
  showCloseButton?: boolean
  children?: React.ReactNode
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={withBase(
          cn(
            "fixed inset-0 z-50 m-auto grid h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-xl outline-none",
            // Motion: fade + slight scale; on phones slide up from the bottom.
            "transition-[opacity,scale,translate] duration-slow ease-enter",
            "data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:ease-exit",
            "motion-reduce:transition-none",
            // Phones: dock to the bottom as a sheet.
            "max-sm:top-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:border-b-0 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            "max-sm:data-[starting-style]:translate-y-full max-sm:data-[starting-style]:scale-100 max-sm:data-[starting-style]:opacity-100",
            "max-sm:data-[ending-style]:translate-y-full max-sm:data-[ending-style]:scale-100 max-sm:data-[ending-style]:opacity-100",
          ),
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Close"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-enter hover:bg-muted hover:text-foreground disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={withBase("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={withBase("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
