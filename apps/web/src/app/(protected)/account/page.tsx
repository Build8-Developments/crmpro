import { SettingsPageBody } from "@/components/crm/settings-shell";
import { LeaderboardVisibilityCard } from "@/features/account/components/leaderboard-visibility-card";
import { ProfileSettingsCard } from "@/features/account/components/profile-settings-card";

export default function AccountProfilePage() {
  return (
    <SettingsPageBody>
      <ProfileSettingsCard />
      <LeaderboardVisibilityCard />
    </SettingsPageBody>
  );
}
