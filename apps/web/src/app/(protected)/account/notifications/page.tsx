import { SettingsPageBody } from "@/components/crm/settings-shell";
import { NotificationPreferencesCard } from "@/features/account/components/notification-preferences-card";

export default function AccountNotificationsPage() {
  return (
    <SettingsPageBody>
      <NotificationPreferencesCard />
    </SettingsPageBody>
  );
}
