"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type Tab = Dictionary["product"]["tabs"][number];

/**
 * Tabs over real screenshots. The screenshots are server-rendered (`panels`,
 * keyed like the tabs) and only shown or hidden here, so every image is in the HTML.
 */
export function ProductPreview({
  tabs,
  label,
  panels,
}: {
  tabs: Tab[];
  label: string;
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const id = useId();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const rtl = document.documentElement.dir === "rtl";
    const index = tabs.findIndex((tab) => tab.key === active);
    const next = tabs[(index + (rtl ? -step : step) + tabs.length) % tabs.length];
    setActive(next.key);
    document.getElementById(`${id}-tab-${next.key}`)?.focus();
  }

  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div
          role="tablist"
          aria-label={label}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:inline-flex sm:self-start sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-1"
        >
          {tabs.map((tab) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                id={`${id}-tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.key)}
                onKeyDown={onKeyDown}
                className={cn(
                  "h-10 shrink-0 rounded-lg border px-4 font-display text-sm font-semibold whitespace-nowrap transition-colors sm:border-transparent sm:px-5",
                  selected
                    ? "border-navy bg-navy text-navy-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="max-w-[34em] text-pretty text-muted-foreground lg:text-end">
          {current.caption}
        </p>
      </div>

      <div className="mt-8">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            id={`${id}-panel-${tab.key}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${tab.key}`}
            hidden={tab.key !== active}
            className="rise-in"
          >
            {panels[tab.key]}
          </div>
        ))}
      </div>
    </div>
  );
}
