import { AdminDetailPage } from "@/features/admins/components/admin-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <AdminDetailPage adminId={id} />;
}
