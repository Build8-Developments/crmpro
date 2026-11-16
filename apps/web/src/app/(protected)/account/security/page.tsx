import { SettingsPageBody } from "@/components/crm/settings-shell";
import { ChangePasswordCard } from "@/features/account/components/change-password-card";
import { SessionsSettingsCard } from "@/features/account/components/sessions-settings-card";

export default function AccountSecurityPage() {
  return (
    <SettingsPageBody>
      <ChangePasswordCard />
      <SessionsSettingsCard />
    </SettingsPageBody>
  );
}
