import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function ProjectsPage() {
  const route = getRoute("/projects");
  return (
    <PagePlaceholder
      title={route?.label ?? "Projects"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
