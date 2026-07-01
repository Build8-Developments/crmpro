import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function LeadsPage() {
  const route = getRoute("/leads");
  return (
    <PagePlaceholder
      title={route?.label ?? "Leads"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
