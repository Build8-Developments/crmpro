import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker images set NEXT_OUTPUT=standalone, as for apps/web: a self-contained server with
  // only the files it needs. The monorepo root is traced so workspace packages are included.
  ...(process.env.NEXT_OUTPUT === "standalone" && {
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd(), "../.."),
  }),
  poweredByHeader: false,
  images: {
    // AVIF first (about half the size of a JPEG at the same quality), WebP for older browsers.
    formats: ["image/avif", "image/webp"],
    // Product screenshots use 85 so small UI text stays crisp (src/components/site/product-shot.tsx);
    // the hero photo uses 70 (detailed facades are heavy, and AVIF holds up well there).
    qualities: [70, 75, 80, 85],
    // Next's defaults plus 2560 and 3200, so the hero (shown at 1.4× its width) is not forced to
    // jump from 2048 straight to 3840 on wide screens.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3200, 3840],
  },
};

export default nextConfig;
