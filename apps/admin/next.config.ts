import path from "node:path";
import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://localhost:3100";

const nextConfig: NextConfig = {
  // Docker images (apps/admin/Dockerfile) set NEXT_OUTPUT=standalone: a self-contained server
  // with only the files it needs. The monorepo root is traced so workspace packages are included.
  ...(process.env.NEXT_OUTPUT === "standalone" && {
    output: "standalone",
    outputFileTracingRoot: path.join(process.cwd(), "../.."),
  }),
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
