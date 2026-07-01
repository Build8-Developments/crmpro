import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function DevelopersPage() {
  const route = getRoute("/developers");
  return (
    <PagePlaceholder
      title={route?.label ?? "Developers"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
