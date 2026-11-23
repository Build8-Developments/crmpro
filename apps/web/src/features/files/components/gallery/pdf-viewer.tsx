"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Skeleton } from "@/components/ui/skeleton";

/** Copied to /public by scripts/copy-pdf-worker.mjs (same pdfjs version). */
const WORKER_SRC = "/pdf.worker.min.mjs";
/** Very long PDFs: render the first pages and let people download the rest. */
const MAX_PAGES = 60;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; document: PDFDocumentProxy }
  | { status: "failed" };

/**
 * Renders a PDF with pdf.js inside the app, so it works the same on every
 * browser (Android Chrome can't show PDFs in an iframe). Pages render lazily
 * as they scroll into view. If pdf.js can't load the file (e.g. the storage
 * bucket blocks cross-origin reads), it falls back to the browser's viewer.
 */
export function PdfViewer({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        const loading = pdfjs.getDocument({ url });
        task = loading;
        const document = await loading.promise;
        if (!cancelled) setState({ status: "ready", document });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  if (state.status === "failed") {
    return (
      <iframe src={url} title={title} className="size-full border-0 bg-white" />
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex size-full justify-center overflow-hidden p-6">
        <Skeleton className="aspect-[1/1.414] h-full max-w-full rounded-md" />
      </div>
    );
  }

  const pageCount = Math.min(state.document.numPages, MAX_PAGES);
  return (
    <div className="size-full overflow-y-auto px-3 py-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        {Array.from({ length: pageCount }, (_, index) => (
          <PdfPage
            key={index}
            document={state.document}
            pageNumber={index + 1}
          />
        ))}
        {state.document.numPages > MAX_PAGES ? (
          <p className="pb-2 text-xs text-muted-foreground">
            Showing the first {MAX_PAGES} of {state.document.numPages} pages.
            Download the file to see the rest.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PdfPage({
  document,
  pageNumber,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [aspect, setAspect] = useState(1.414);
  const [rendered, setRendered] = useState(false);

  // Start rendering shortly before the page scrolls into view.
  useEffect(() => {
    const node = holder.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    (async () => {
      const page = await document.getPage(pageNumber);
      const canvas = canvasRef.current;
      const width = holder.current?.clientWidth ?? 800;
      if (!canvas || cancelled) return;

      const base = page.getViewport({ scale: 1 });
      setAspect(base.height / base.width);
      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const task = page.render({ canvas, viewport });
      renderTask = task;
      try {
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // Cancelled on unmount or file change.
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [visible, document, pageNumber]);

  return (
    <div
      ref={holder}
      className="relative w-full overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-black/5"
      style={{ aspectRatio: `1 / ${aspect}` }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`Page ${pageNumber}`}
        className={
          rendered
            ? "size-full opacity-100 transition-opacity duration-200"
            : "size-full opacity-0"
        }
      />
    </div>
  );
}
