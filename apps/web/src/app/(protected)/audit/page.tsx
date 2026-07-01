import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function AuditPage() {
  const route = getRoute("/audit");
  return (
    <PagePlaceholder
      title={route?.label ?? "Audit"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
