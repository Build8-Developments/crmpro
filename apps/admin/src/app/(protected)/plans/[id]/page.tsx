import { PlanDetailPage } from "@/features/plans/components/plan-detail-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <PlanDetailPage planId={id} />;
}
