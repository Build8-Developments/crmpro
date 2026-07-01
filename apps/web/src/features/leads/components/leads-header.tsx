"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";

export function LeadsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Leads
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and track all incoming leads
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/imports">
            <AppIcons.upload className="size-4" />
            Import CSV
          </Link>
        </Button>
        <Button size="sm" disabled>
          <AppIcons.create className="size-4" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}
