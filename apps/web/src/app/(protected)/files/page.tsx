import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function FilesPage() {
  const route = getRoute("/files");
  return (
    <PagePlaceholder
      title={route?.label ?? "Files"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
