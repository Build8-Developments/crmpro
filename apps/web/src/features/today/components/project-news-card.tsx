"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectUpdateTypeBadge } from "@/features/project-updates/components/project-update-type-badge";
import { useProjectUpdatesFeed } from "@/features/project-updates/hooks";
import type { ProjectUpdatesFeedParams } from "@/features/project-updates/types";
import { formatUpdateAge } from "@/features/project-updates/utils/project-update-format";
import { useNow } from "@/hooks/use-now";

/** Latest news on the projects this agent is selling (open leads, live deals). */
const FEED_PARAMS: ProjectUpdatesFeedParams = { scope: "mine", sinceDays: 14, limit: 5 };

/**
 * "Project news" on Today: hidden while loading and when there is nothing
 * new, so it only takes space when there is something to tell clients.
 */
export function ProjectNewsCard() {
  const now = useNow(60_000);
  const feed = useProjectUpdatesFeed(FEED_PARAMS);
  const items = feed.data?.items ?? [];

  if (feed.isError) {
    return (
      <CardShell>
        <p className="text-xs text-muted-foreground">Couldn&apos;t load project news.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs"
          disabled={feed.isFetching}
          onClick={() => void feed.refetch()}
        >
          Retry
        </Button>
      </CardShell>
    );
  }

  if (items.length === 0) return null;

  return (
    <CardShell>
      <ul className="-mx-2 space-y-0.5">
        {items.map((update) => (
          <li key={update.id}>
            <Link
              href={`/projects?id=${encodeURIComponent(update.project.id)}`}
              className="block rounded-lg px-2 py-2 transition-colors duration-fast ease-enter hover:bg-muted/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                  {update.project.name}
                </span>
                <ProjectUpdateTypeBadge type={update.type} />
              </div>
              <div className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium">
                {update.title}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {formatUpdateAge(update.createdAt, now)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Project news
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
