"use client";

import { useEffect, useId, useRef } from "react";
import { IconCheck } from "@tabler/icons-react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StageColorDot } from "@/features/leads/utils/stage-color";

export interface FilterSelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface FilterSelectProps {
  label: string;
  value?: string;
  placeholder: string;
  options: FilterSelectOption[];
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  showColorDot?: boolean;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled,
  showColorDot,
  className,
  open,
  onOpenChange,
}: FilterSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className={cn("relative space-y-1.5", className)}>
      <Label
        htmlFor={triggerId}
        className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </Label>
      <Button
        id={triggerId}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-8 w-full justify-between gap-2 px-2.5 font-normal"
        onClick={() => onOpenChange(!open)}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {showColorDot && selected ? (
            <StageColorDot
              color={selected.color}
              className="size-2 shrink-0 rounded-full"
            />
          ) : null}
          <span className="truncate text-xs">{displayLabel}</span>
        </span>
        <AppIcons.chevronDown
          className={cn(
            "size-3.5 shrink-0 opacity-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-border/80 bg-popover shadow-lg"
        >
          <Command className="bg-popover">
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}...`}
              className="h-8 text-xs"
            />
            <CommandList className="max-h-52">
              <CommandEmpty className="py-4 text-xs">No matches.</CommandEmpty>
              <CommandItem
                value={placeholder}
                className="text-xs"
                onSelect={() => {
                  onChange(undefined);
                  onOpenChange(false);
                }}
              >
                <CheckIcon selected={!value} />
                {placeholder}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  className="text-xs"
                  onSelect={() => {
                    onChange(option.value);
                    onOpenChange(false);
                  }}
                >
                  <CheckIcon selected={value === option.value} />
                  <span className="flex min-w-0 items-center gap-2">
                    {showColorDot ? (
                      <StageColorDot
                        color={option.color}
                        className="size-2 shrink-0 rounded-full"
                      />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon({ selected }: { selected: boolean }) {
  return (
    <IconCheck
      className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
      stroke={2.5}
    />
  );
}

interface FilterMultiSelectProps {
  label: string;
  values: string[];
  placeholder: string;
  options: FilterSelectOption[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  showColorDot?: boolean;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Multi-value variant: stays open while picking; shows "A, B +2". */
export function FilterMultiSelect({
  label,
  values,
  placeholder,
  options,
  onChange,
  disabled,
  showColorDot,
  className,
  open,
  onOpenChange,
}: FilterMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  const selected = options.filter((option) => values.includes(option.value));
  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((option) => option.label).join(", ")
        : `${selected[0].label}, ${selected[1].label} +${selected.length - 2}`;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onOpenChange]);

  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <div ref={rootRef} className={cn("relative space-y-1.5", className)}>
      <Label
        htmlFor={triggerId}
        className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </Label>
      <Button
        id={triggerId}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="h-8 w-full justify-between gap-2 px-2.5 font-normal"
        onClick={() => onOpenChange(!open)}
      >
        <span className={cn("truncate text-xs", selected.length === 0 && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <AppIcons.chevronDown
          className={cn("size-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          aria-label={label}
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-border/80 bg-popover shadow-lg"
        >
          <Command className="bg-popover">
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} className="h-8 text-xs" />
            <CommandList className="max-h-52">
              <CommandEmpty className="py-4 text-xs">No matches.</CommandEmpty>
              {values.length > 0 ? (
                <CommandItem value="__clear__" className="text-xs text-muted-foreground" onSelect={() => onChange([])}>
                  <CheckIcon selected={false} />
                  Clear selection
                </CommandItem>
              ) : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  className="text-xs"
                  onSelect={() => toggle(option.value)}
                >
                  <CheckIcon selected={values.includes(option.value)} />
                  <span className="flex min-w-0 items-center gap-2">
                    {showColorDot ? (
                      <StageColorDot color={option.color} className="size-2 shrink-0 rounded-full" />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}

/** Small toggle chips for short option lists (single or multi). */
export function FilterChips<T extends string>({
  label,
  options,
  values,
  onChange,
  multiple = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? values.filter((v) => v !== option.value)
                    : multiple
                      ? [...values, option.value]
                      : [option.value],
                )
              }
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors duration-fast ease-enter",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
