import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function RolesPage() {
  const route = getRoute("/roles");
  return (
    <PagePlaceholder
      title={route?.label ?? "Roles"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
