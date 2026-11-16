import { SettingsPageBody } from "@/components/crm/settings-shell";
import { ProfileSettingsCard } from "@/features/account/components/profile-settings-card";

export default function AccountProfilePage() {
  return (
    <SettingsPageBody>
      <ProfileSettingsCard />
    </SettingsPageBody>
  );
}
