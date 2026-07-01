import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function DashboardPage() {
  const route = getRoute("/dashboard");
  return (
    <PagePlaceholder
      title={route?.label ?? "Dashboard"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
