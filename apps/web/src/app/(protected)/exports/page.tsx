import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function ExportsPage() {
  const route = getRoute("/exports");
  return (
    <PagePlaceholder
      title={route?.label ?? "Exports"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
