import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function PipelinesPage() {
  const route = getRoute("/pipelines");
  return (
    <PagePlaceholder
      title={route?.label ?? "Pipelines"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
