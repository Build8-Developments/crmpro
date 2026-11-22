"use client";

import { IconLayoutKanban, IconList } from "@tabler/icons-react";
import { useLeadsTableStore, type LeadsLayout } from "@/features/leads/stores/leads-table-store";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: LeadsLayout; label: string; icon: typeof IconList }> = [
  { value: "list", label: "List", icon: IconList },
  { value: "board", label: "Board", icon: IconLayoutKanban },
];

/** List ⇄ board switch; both show the same filtered leads. */
export function LeadsLayoutToggle() {
  const layout = useLeadsTableStore((s) => s.layout);
  const setLayout = useLeadsTableStore((s) => s.setLayout);
  return (
    <div role="radiogroup" aria-label="Layout" className="inline-flex h-8 rounded-md border border-border p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={layout === value}
          title={label}
          onClick={() => setLayout(value)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 text-xs font-medium transition-colors duration-fast",
            layout === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
