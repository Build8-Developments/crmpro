"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/** Keeps digits and one decimal point, with at most `decimals` decimal places. */
export function cleanAmount(raw: string, decimals = 2): string {
  const kept = raw.replace(/[^\d.]/g, "");
  const dot = kept.indexOf(".");
  if (dot === -1) return kept;
  const whole = kept.slice(0, dot);
  if (decimals <= 0) return whole;
  const fraction = kept.slice(dot + 1).replace(/\./g, "").slice(0, decimals);
  return `${whole}.${fraction}`;
}

/** "4000000.5" → "4,000,000.5" (string based, so no precision is lost). */
export function groupAmount(clean: string): string {
  const [whole = "", fraction] = clean.split(".");
  const digits = whole.replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === undefined) return grouped;
  return `${grouped || "0"}.${fraction}`;
}

const SIGNIFICANT = /[\d.]/;

/**
 * A text input for amounts and counts that shows thousands separators while
 * typing ("4000000" reads "4,000,000") and keeps the caret where the user is
 * typing. `value` / `onValueChange` carry the plain number string without
 * separators.
 */
export function AmountInput({
  value,
  onValueChange,
  decimals = 2,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Decimal places allowed; 0 for whole numbers. */
  decimals?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Number of digits/points before the caret, restored after re-formatting.
  const pendingCaret = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    const target = pendingCaret.current;
    const element = inputRef.current;
    pendingCaret.current = null;
    if (target === null || !element || document.activeElement !== element) return;
    const text = element.value;
    let seen = 0;
    let position = 0;
    while (position < text.length && seen < target) {
      if (SIGNIFICANT.test(text[position])) seen += 1;
      position += 1;
    }
    element.setSelectionRange(position, position);
  });

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={groupAmount(cleanAmount(value, decimals))}
      onChange={(event) => {
        const element = event.target;
        const beforeCaret = element.value.slice(0, element.selectionStart ?? element.value.length);
        pendingCaret.current = beforeCaret.replace(/[^\d.]/g, "").length;
        onValueChange(cleanAmount(element.value, decimals));
      }}
    />
  );
}
