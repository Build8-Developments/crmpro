"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectUpdateItem } from "@/features/project-updates/components/project-update-item";
import { useProjectUpdatesFeed } from "@/features/project-updates/hooks";
import { usePermissions } from "@/hooks/use-permissions";

/** "Latest project news" on the Today page. */
export function ProjectUpdatesWidget() {
  const t = useTranslations("projectUpdates");
  const { can } = usePermissions();
  const feed = useProjectUpdatesFeed(5);

  if (!can("project.read")) return null;

  const items = feed.data?.items ?? [];

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("widgetTitle")}
      </h2>
      {feed.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          {t("widgetEmpty")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {items.map((update) => (
            <Link
              key={update.id}
              href={`/projects?projectId=${update.project.id}&tab=updates`}
              className="block hover:bg-muted/40"
            >
              <ProjectUpdateItem update={update} showProject />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
