"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

export type LeadsView = "list" | "board";

/** View lives in the URL (`?view=board`) so it survives reloads and sharing. */
export function useLeadsView(): [LeadsView, (view: LeadsView) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view: LeadsView = searchParams.get("view") === "board" ? "board" : "list";

  const setView = useCallback(
    (next: LeadsView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "board") params.set("view", "board");
      else params.delete("view");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return [view, setView];
}

export function LeadsViewToggle({
  view,
  onChange,
}: {
  view: LeadsView;
  onChange: (view: LeadsView) => void;
}) {
  const t = useTranslations("leads.view");
  const options = [
    { value: "list" as const, icon: AppIcons.list, label: t("list") },
    { value: "board" as const, icon: AppIcons.board, label: t("board") },
  ];

  return (
    <div
      className="inline-flex shrink-0 items-center rounded-lg border bg-muted/40 p-1"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
