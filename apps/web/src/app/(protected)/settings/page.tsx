import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function SettingsPage() {
  const route = getRoute("/settings");
  return (
    <PagePlaceholder
      title={route?.label ?? "Settings"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
