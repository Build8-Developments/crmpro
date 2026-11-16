"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/crm/settings-section";
import { useSessions } from "@/features/account/hooks";
import { useLogoutAllSessions } from "@/features/account/mutations";
import {
  formatSessionBrowser,
  formatSessionDevice,
} from "@/features/account/utils/session-formatters";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SessionsSettingsCard() {
  const { data: sessions, isLoading, isError, refetch, isFetching } =
    useSessions();
  const logoutAll = useLogoutAllSessions();

  return (
    <SettingsSection
      title="Signed-in devices"
      description="Sessions that can access your account"
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
          disabled={logoutAll.isPending || (sessions?.length ?? 0) <= 1}
          onClick={() => void logoutAll.mutateAsync(undefined)}
        >
          {logoutAll.isPending ? "Signing out..." : "Sign out all"}
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sessions...</p>
      ) : null}

      {isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 px-3 py-2.5">
          <p className="text-sm text-destructive">Failed to load sessions</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {sessions && sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active sessions found.</p>
      ) : null}

      {sessions && sessions.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-border/60">
          {sessions.map((session, index) => {
            const browser = formatSessionBrowser(session.userAgent);
            return (
              <li
                key={session.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  index > 0 && "border-t border-border/50",
                  session.isCurrent && "bg-muted/30",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <AppIcons.lock className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatSessionDevice(session)}
                      {browser ? ` · ${browser}` : ""}
                    </p>
                    {session.isCurrent ? (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-normal"
                      >
                        Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {session.ipAddress ?? "Unknown IP"} ·{" "}
                    {formatRelativeTime(session.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SettingsSection>
  );
}
