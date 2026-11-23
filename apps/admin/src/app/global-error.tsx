"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole
 * document, so the app stylesheet and providers are not available: inline
 * styles with system colors keep it readable in light and dark.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          colorScheme: "light dark",
          background: "Canvas",
          color: "CanvasText",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <main style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>Error</p>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "8px 0" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 20px" }}>
            The app hit an unexpected error. Try again, or reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: 14,
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid color-mix(in srgb, CanvasText 25%, transparent)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
