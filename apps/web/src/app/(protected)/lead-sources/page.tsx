import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function LeadSourcesPage() {
  const route = getRoute("/lead-sources");
  return (
    <PagePlaceholder
      title={route?.label ?? "Lead Sources"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
