import { PagePlaceholder } from "@/components/crm/page-placeholder";
import { getRoute } from "@/config/routes";

export default function UsersPage() {
  const route = getRoute("/users");
  return (
    <PagePlaceholder
      title={route?.label ?? "Users"}
      subtitle={route?.subtitle}
      icon={route?.icon}
    />
  );
}
