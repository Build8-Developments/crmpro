"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { IconCheck, IconMinus } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { withBase } from "@/components/ui/base";

/*
 * Checkbox on Base UI. Keeps the Radix-style API: `checked` may be true,
 * false or "indeterminate", and `onCheckedChange` receives a boolean.
 */
type CheckedState = boolean | "indeterminate";

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: Omit<
  React.ComponentProps<typeof CheckboxPrimitive.Root>,
  "checked" | "defaultChecked" | "onCheckedChange"
> & {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?(checked: CheckedState): void;
}) {
  const indeterminate = checked === "indeterminate";
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      {...(checked !== undefined ? { checked: checked === true } : {})}
      {...(defaultChecked !== undefined
        ? { defaultChecked: defaultChecked === true }
        : {})}
      indeterminate={indeterminate}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      className={withBase(
        cn(
          "peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs outline-none",
          "transition-[background-color,border-color,box-shadow] duration-fast ease-enter",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground",
          "data-[indeterminate]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-foreground",
        ),
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        keepMounted={false}
        className="flex items-center justify-center text-current"
      >
        {indeterminate ? (
          <IconMinus className="size-3.5" stroke={3} />
        ) : (
          <IconCheck className="size-3.5" stroke={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
