import { TenantDetailPage } from "@/features/tenants/components/tenant-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <TenantDetailPage tenantId={id} />;
}
