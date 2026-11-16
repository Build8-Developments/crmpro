"use client"

import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"
import { IconCheck, IconChevronRight, IconCircleFilled } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  asChildProps,
  floatingItemClass,
  floatingPanelClass,
  withBase,
} from "@/components/ui/base"

/*
 * Right-click menu on Base UI, same API as before (`asChild` trigger/items,
 * `onSelect` with preventDefault() to stay open, `variant="destructive"`).
 */

type SelectHandler = (event: React.MouseEvent<HTMLElement>) => void

function selectHandlers(
  onSelect: SelectHandler | undefined,
  onClick: React.MouseEventHandler<HTMLElement> | undefined,
) {
  if (!onSelect && !onClick) return {}
  return {
    onClick: (
      event: React.MouseEvent<HTMLElement> & { preventBaseUIHandler?: () => void },
    ) => {
      onClick?.(event)
      if (onSelect) {
        onSelect(event)
        if (event.defaultPrevented) event.preventBaseUIHandler?.()
      }
    },
  }
}

function ContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function ContextMenuGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Group>,
) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
}

function ContextMenuPortal(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Portal>,
) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
}

function ContextMenuSub(
  props: React.ComponentProps<typeof ContextMenuPrimitive.SubmenuRoot>,
) {
  return <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
}

function ContextMenuRadioGroup(
  props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>,
) {
  return (
    <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubmenuTrigger> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={withBase(
        cn(floatingItemClass, "data-[inset]:pl-8 data-[popup-open]:bg-accent"),
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto size-4" />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Popup>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="z-50 outline-none" sideOffset={4}>
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-sub-content"
          className={withBase(cn(floatingPanelClass, "min-w-[8rem] p-1"), className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Popup>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="z-50 outline-none" collisionPadding={8}>
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={withBase(
            cn(
              floatingPanelClass,
              "max-h-[var(--available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto p-1",
            ),
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  asChild,
  children,
  onSelect,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof ContextMenuPrimitive.Item>, "onSelect"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
  onSelect?: SelectHandler
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      className={withBase(
        cn(
          floatingItemClass,
          "data-[inset]:pl-8",
          "data-[variant=destructive]:text-destructive data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:text-destructive dark:data-[variant=destructive]:data-[highlighted]:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive!",
        ),
        className,
      )}
      {...selectHandlers(onSelect, onClick)}
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={withBase(cn(floatingItemClass, "pl-8"), className)}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <IconCheck className="size-4" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={withBase(cn(floatingItemClass, "pl-8"), className)}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.RadioItemIndicator>
          <IconCircleFilled className="size-2" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      data-slot="context-menu-label"
      data-inset={inset ? "" : undefined}
      className={cn(
        "px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
