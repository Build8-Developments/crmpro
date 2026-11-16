import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://localhost:3000";

/** Admin pages moved into Organization settings; keep old links working. */
const MOVED_TO_SETTINGS = ["users", "roles", "pipelines", "lead-sources", "audit"];

const nextConfig: NextConfig = {
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
