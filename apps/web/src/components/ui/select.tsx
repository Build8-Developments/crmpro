"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  floatingItemClass,
  floatingPanelClass,
  withBase,
} from "@/components/ui/base";

/*
 * Select on Base UI with the shadcn string API kept:
 *   <Select value={v} onValueChange={setV}>
 *     <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
 *     <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
 *   </Select>
 * Base UI only knows an item's label while its list is mounted, so the root
 * collects value → label from its <SelectItem> children and passes them as
 * `items`; the closed trigger then shows the label, not the raw value.
 */

type RootProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange" | "items" | "children"
> & {
  value?: string;
  defaultValue?: string;
  // Method syntax (bivariant) like Radix, so handlers typed with a narrower
  // string union (e.g. `(v: RoleSort) => void`) still type-check.
  onValueChange?(value: string): void;
  children?: React.ReactNode;
};

function collectItems(
  node: React.ReactNode,
  out: Record<string, React.ReactNode>,
): Record<string, React.ReactNode> {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: unknown;
      children?: React.ReactNode;
    };
    if (child.type === SelectItem) {
      out[String(props.value)] = props.children;
      return;
    }
    if (props.children) collectItems(props.children, out);
  });
  return out;
}

function Select(allProps: RootProps) {
  const { value, defaultValue, onValueChange, children, ...props } = allProps;
  // "value" present (even undefined) means controlled, as with Radix.
  const controlled = Object.prototype.hasOwnProperty.call(allProps, "value");
  const items = collectItems(children, {});

  return (
    <SelectPrimitive.Root
      data-slot="select"
      items={items}
      {...(controlled
        ? { value: value ? value : null }
        : { defaultValue: defaultValue ? defaultValue : null })}
      onValueChange={(next) => {
        onValueChange?.(next == null ? "" : String(next));
      }}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={withBase(
        "truncate data-[placeholder]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={withBase(
        cn(
          "flex w-fit cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none",
          "transition-[color,box-shadow,border-color] duration-fast ease-enter",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
          "data-[popup-open]:border-ring dark:bg-input/30 dark:hover:bg-input/50",
          "data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=sm]:text-xs",
          "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ),
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        className={cn(
          "text-muted-foreground transition-[rotate] duration-base ease-enter",
          "[[data-popup-open]>&]:rotate-180",
        )}
      >
        <IconChevronDown className="size-4 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
  // Accepted for API compatibility; Base UI positions as a popper.
  position: _position,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & {
  sideOffset?: number;
  position?: "popper" | "item-aligned";
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="z-50 outline-none"
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        collisionPadding={8}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={withBase(
            cn(
              floatingPanelClass,
              "max-h-[min(var(--available-height),20rem)] min-w-[max(var(--anchor-width),8rem)] overflow-x-hidden overflow-y-auto p-1",
            ),
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={withBase("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={withBase(cn(floatingItemClass, "w-full pr-8"), className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
        <IconCheck className="size-4 text-foreground!" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
