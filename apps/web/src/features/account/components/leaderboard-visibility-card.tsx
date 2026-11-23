"use client";

import { SettingsSection } from "@/components/crm/settings-section";
import { Switch } from "@/components/ui/switch";
import { useUpdateLeaderboardVisibility } from "@/features/account/mutations";
import { useCurrentUser } from "@/features/auth/hooks";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Whether the user's name shows on the My performance leaderboard. Off, they
 * appear as "A teammate" to others and still see their own rank.
 */
export function LeaderboardVisibilityCard() {
  const { can } = usePermissions();
  const { data: user } = useCurrentUser();
  const update = useUpdateLeaderboardVisibility();

  if (!user || !can("analytics.read")) return null;
  const shown = user.showOnLeaderboard ?? true;

  return (
    <SettingsSection title="Leaderboard" description="How you appear to your team on My performance.">
      <div className="flex max-w-xl items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="leaderboard-name-label" className="text-sm font-medium">
            Show my name on the leaderboard
          </p>
          <p id="leaderboard-name-hint" className="mt-0.5 text-xs text-muted-foreground">
            When off, you appear as &ldquo;A teammate&rdquo; and your badges aren&apos;t listed in Recent wins.
            You still see your own rank.
          </p>
        </div>
        <Switch
          checked={shown}
          disabled={update.isPending}
          labelledBy="leaderboard-name-label"
          describedBy="leaderboard-name-hint"
          onChange={(checked) => update.mutate(checked)}
        />
      </div>
    </SettingsSection>
  );
}
