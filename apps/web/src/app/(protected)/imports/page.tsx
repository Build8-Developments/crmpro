import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function ImportsPage() {
  const route = getRoute("/imports");
  return (
    <PagePlaceholder
      title={route?.label ?? "Imports"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
