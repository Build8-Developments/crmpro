import path from "node:path";
import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://localhost:3000";

/** Admin pages moved into Organization settings; keep old links working. */
const MOVED_TO_SETTINGS = ["users", "roles", "pipelines", "lead-sources", "audit"];

const nextConfig: NextConfig = {
  // Docker images (apps/web/Dockerfile) set NEXT_OUTPUT=standalone: a self-contained server
  // with only the files it needs. The monorepo root is traced so workspace packages are included.
  ...(process.env.NEXT_OUTPUT === "standalone" && {
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd(), "../.."),
  }),
  // Each workspace has its own host (prime-estates.localhost:3001 in dev);
  // let `next dev` serve its assets to all of them.
  allowedDevOrigins: ["*.localhost"],
  async redirects() {
    return MOVED_TO_SETTINGS.map((section) => ({
      source: `/${section}`,
      destination: `/settings/${section}`,
      permanent: false,
    }));
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
