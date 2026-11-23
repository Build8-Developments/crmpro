"use client";

import {
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconFileTypePdf,
  IconFileZip,
  IconMovie,
  IconMusic,
  IconPhoto,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function TypeIcon({
  mimeType,
  className,
}: {
  mimeType: string;
  className: string;
}) {
  const props = { className, stroke: 1.25 };
  if (mimeType.startsWith("image/")) return <IconPhoto {...props} />;
  if (mimeType.startsWith("video/")) return <IconMovie {...props} />;
  if (mimeType.startsWith("audio/")) return <IconMusic {...props} />;
  if (mimeType.includes("pdf")) return <IconFileTypePdf {...props} />;
  if (
    mimeType.includes("csv") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel")
  )
    return <IconFileSpreadsheet {...props} />;
  if (mimeType.includes("word") || mimeType.includes("text"))
    return <IconFileText {...props} />;
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return <IconFileZip {...props} />;
  return <IconFile {...props} />;
}

/** Thumbnail for images, a type icon for everything else. */
export function FileVisual({
  mimeType,
  previewUrl,
  name,
  className,
  iconClassName,
}: {
  mimeType: string;
  previewUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  if (previewUrl) {
    return (
      // Signed storage URL; next/image would need the bucket host configured.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={name}
        loading="lazy"
        className={cn(
          "size-full object-cover",
          // Document thumbnails: show the top of the page (title), not the middle.
          !mimeType.startsWith("image/") && "object-top",
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <TypeIcon mimeType={mimeType} className={cn("size-10", iconClassName)} />
    </div>
  );
}
