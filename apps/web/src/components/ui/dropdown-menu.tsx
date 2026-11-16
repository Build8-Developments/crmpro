"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { IconCheck, IconChevronRight, IconCircleFilled } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  asChildProps,
  floatingItemClass,
  floatingPanelClass,
  withBase,
} from "@/components/ui/base"

/*
 * Dropdown menu on Base UI with the shadcn API kept intact: `asChild`
 * triggers/items, `onSelect` on items (call `event.preventDefault()` to keep
 * the menu open), `variant="destructive"`, `inset`, and content placement via
 * `side` / `align` / `sideOffset` / `collisionPadding`.
 */

type SelectHandler = (event: React.MouseEvent<HTMLElement>) => void

/** Radix-style onSelect on top of Base UI's onClick. */
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
        // Radix semantics: preventDefault() in onSelect keeps the menu open.
        if (event.defaultPrevented) event.preventBaseUIHandler?.()
      }
    },
  }
}

function DropdownMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal(
  props: React.ComponentProps<typeof MenuPrimitive.Portal>,
) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...asChildProps(asChild, children)}
      {...props}
    />
  )
}

type PlacementProps = Pick<
  React.ComponentProps<typeof MenuPrimitive.Positioner>,
  "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"
>

function DropdownMenuContent({
  className,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  alignOffset,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & PlacementProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="z-50 outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={withBase(
            cn(
              floatingPanelClass,
              "max-h-[var(--available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto p-1",
            ),
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup(props: React.ComponentProps<typeof MenuPrimitive.Group>) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  asChild,
  children,
  onSelect,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive.Item>, "onSelect"> & {
  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
  onSelect?: SelectHandler
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
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

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={withBase(cn(floatingItemClass, "pl-8"), className)}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <IconCheck className="size-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof MenuPrimitive.RadioGroup>,
) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({
  className,
  children,
  onSelect,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive.RadioItem>, "onSelect"> & {
  /** Called on pick; radio items stay open by default, like a setting. */
  onSelect?: SelectHandler
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={withBase(cn(floatingItemClass, "pl-8"), className)}
      onClick={(event) => {
        onClick?.(event)
        onSelect?.(event)
      }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <IconCircleFilled className="size-2" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

/** Plain label (Base UI's GroupLabel needs a Group; most labels here don't have one). */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset ? "" : undefined}
      className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  )
}

function DropdownMenuSub(
  props: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>,
) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & { inset?: boolean }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset ? "" : undefined}
      className={withBase(
        cn(floatingItemClass, "data-[inset]:pl-8 data-[popup-open]:bg-accent"),
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto size-4" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & { sideOffset?: number }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner className="z-50 outline-none" sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          className={withBase(cn(floatingPanelClass, "min-w-[8rem] p-1"), className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
