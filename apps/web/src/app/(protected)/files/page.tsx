import { Suspense } from "react";
import { FilesGallerySkeleton } from "@/features/files/components/gallery/files-gallery-skeleton";
import { FilesGalleryPage } from "@/features/files/components/gallery/files-gallery-page";

export default function FilesRoutePage() {
  return (
    <Suspense fallback={<FilesGallerySkeleton />}>
      <FilesGalleryPage />
    </Suspense>
  );
}
