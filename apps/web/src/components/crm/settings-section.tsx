"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
  action,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
