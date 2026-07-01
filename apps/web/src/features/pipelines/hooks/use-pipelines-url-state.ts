"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";

export function usePipelinesUrlState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedPipelineId = usePipelineUiStore((s) => s.selectedPipelineId);
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const pipelineId = searchParams.get("pipelineId");
    const signature = searchParams.toString();

    if (pipelineId && appliedRef.current !== signature) {
      setSelectedPipelineId(pipelineId);
      appliedRef.current = signature;
    }
  }, [searchParams, setSelectedPipelineId]);

  useEffect(() => {
    const urlPipelineId = searchParams.get("pipelineId");
    if (!selectedPipelineId || selectedPipelineId === urlPipelineId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("pipelineId", selectedPipelineId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedPipelineId, searchParams, router, pathname]);
}
